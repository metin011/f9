import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";
import { GLTFLoader } from "https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js";
import { Menu } from "./Menu.js";
import { Physics } from "./Physics.js";
import { Player } from "./Player.js";

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.musicOsc = null;
    this.started = false;
  }

  ensureStarted() {
    if (this.started) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();

    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.musicOsc = this.ctx.createOscillator();
    this.musicOsc.type = "triangle";
    this.musicOsc.frequency.value = 130;
    this.musicOsc.connect(this.music);
    this.musicOsc.start();

    this.setVolumes({ masterVolume: 70, musicVolume: 65, sfxVolume: 80 });
    this.started = true;
  }

  setVolumes(v) {
    if (!this.master) return;
    this.master.gain.value = (v.masterVolume ?? 70) / 100;
    this.music.gain.value = ((v.musicVolume ?? 65) / 100) * 0.06;
    this.sfx.gain.value = ((v.sfxVolume ?? 80) / 100) * 0.22;
  }

  kick(type) {
    if (!this.ctx || !this.sfx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfx);

    if (type === "shot") {
      osc.frequency.value = 190;
      gain.gain.value = 0.55;
    } else if (type === "longPass") {
      osc.frequency.value = 150;
      gain.gain.value = 0.35;
    } else {
      osc.frequency.value = 165;
      gain.gain.value = 0.28;
    }

    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}

const loader = new GLTFLoader();

const app = document.getElementById("app");
const menuRoot = document.getElementById("menuRoot");
const hud = document.getElementById("hud");
const statusHud = document.getElementById("statusHud");
const sprintFill = document.getElementById("sprintFill");
const powerWrap = document.getElementById("powerWrap");
const powerFill = document.getElementById("powerFill");
const powerLabel = document.getElementById("powerLabel");
const modeValue = document.getElementById("modeValue");
const cameraValue = document.getElementById("cameraValue");
const timerValue = document.getElementById("timerValue");

const falsoWrap = document.getElementById("falsoWrap");
const falsoFill = document.getElementById("falsoFill");

const rematchOverlay = document.getElementById("rematchOverlay");
const rematchBtn = document.getElementById("rematchBtn");
const exitToMenuBtn = document.getElementById("exitToMenuBtn");

let lastGameState = null; // To store settings for rematch

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x94c8f0, 20, 180);
scene.background = new THREE.Color(0x94c8f0);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 5, 12);

const hemi = new THREE.HemisphereLight(0xdff0ff, 0x325020, 1.45);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(60, 100, 40);
sun.castShadow = true;
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const physics = new Physics(scene);
physics.setupField();
const defaultGoalLeft = physics.createGoal(-45);
const defaultGoalRight = physics.createGoal(45);
const ballData = physics.createBall();
let ball = ballData;

// Ball is handled procedurally in Physics.js
const player = new Player(scene, camera, physics);
player.mesh.position.set(0, 0, 2);

const menu = new Menu(menuRoot);
const audio = new AudioManager();
menu.mount();

// Debug exports
window.game = { scene, camera, player, physics, ball, THREE, CANNON };

let mode = "menu";
let remainingTime = 0;
let roomCode = "";
let pendingRoomAction = "join";
let isRoomHost = false;
let myPlayerId = null;
let networkSendTimer = 0;
const remotePlayers = new Map();
const socket = window.io ? window.io() : null;

function buildRemotePlayerMesh() {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a87d, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), bodyMat);
  torso.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skinMat);
  head.position.y = 1.84;
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.8, 8), skinMat);
  legL.position.set(-0.16, 0.45, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;

  root.add(torso, head, legL, legR);
  root.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  return root;
}

function clearRemotePlayers() {
  for (const remote of remotePlayers.values()) {
    scene.remove(remote.mesh);
  }
  remotePlayers.clear();
}

function upsertRemotePlayer(id, playerData = {}) {
  if (!id || id === myPlayerId) return;
  let remote = remotePlayers.get(id);
  if (!remote) {
    const mesh = buildRemotePlayerMesh();
    scene.add(mesh);
    remote = {
      mesh,
      targetPos: new THREE.Vector3(),
      targetRot: 0,
    };
    remotePlayers.set(id, remote);
  }

  const pos = playerData.position || { x: 0, y: 0, z: 0 };
  remote.targetPos.set(pos.x || 0, pos.y || 0, pos.z || 0);
  remote.targetRot = playerData.rotation || 0;
  if (!remote.mesh.userData.inited) {
    remote.mesh.position.copy(remote.targetPos);
    remote.mesh.rotation.y = remote.targetRot;
    remote.mesh.userData.inited = true;
  }
}

function removeRemotePlayer(id) {
  const remote = remotePlayers.get(id);
  if (!remote) return;
  scene.remove(remote.mesh);
  remotePlayers.delete(id);
}

function leaveRoomSession() {
  clearRemotePlayers();
  isRoomHost = false;
  myPlayerId = socket?.id || null;
  networkSendTimer = 0;
}

function formatTime(seconds) {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function setMode(newMode) {
  mode = newMode;
  if (mode === "menu") {
    hud.style.display = "none";
    statusHud.style.display = "none";
    modeValue.textContent = "MENU";
    timerValue.textContent = "--:--";
    return;
  }

  hud.style.display = "grid";
  statusHud.style.display = "grid";

  if (mode === "training") {
    modeValue.textContent = "TRAINING";
    timerValue.textContent = "No limit";
  }
  if (mode === "room") {
    modeValue.textContent = `ROOM ${roomCode || "--"}`;
    timerValue.textContent = formatTime(remainingTime);
  }
}

function resetBallToKickoff() {
  ball.body.position.set(0, 0.22, 0);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
}

if (socket) {
  socket.on("connect", () => {
    myPlayerId = socket.id;
  });

  socket.on("disconnect", () => {
    if (mode === "room") {
      leaveRoomSession();
      menu.show();
      setMode("menu");
    }
  });

  socket.on("roomJoined", (payload) => {
    myPlayerId = payload.playerId;
    roomCode = payload.code;
    isRoomHost = !!payload.isHost;
    remainingTime = (payload.settings?.matchTime || 10) * 60;
    clearRemotePlayers();

    const players = payload.players || {};
    Object.keys(players).forEach((id) => {
      if (id !== myPlayerId) upsertRemotePlayer(id, players[id]);
    });

    menu.hide();
    rematchOverlay.style.display = "none";
    setMode("room");
  });

  socket.on("playerJoined", (data) => {
    upsertRemotePlayer(data.id, data.player);
  });

  socket.on("playerMoved", (data) => {
    upsertRemotePlayer(data.id, data);
  });

  socket.on("playerLeft", (data) => {
    removeRemotePlayer(data.id);
  });

  socket.on("hostChanged", (data) => {
    isRoomHost = data.newHostId === myPlayerId;
  });

  socket.on("ballSync", (ballDataSync) => {
    if (isRoomHost || mode !== "room") return;
    ball.body.position.set(ballDataSync.x, ballDataSync.y, ballDataSync.z);
    ball.body.velocity.set(ballDataSync.vx, ballDataSync.vy, ballDataSync.vz);
  });

  socket.on("ballKicked", (data) => {
    if (data.playerId === myPlayerId || mode !== "room") return;
    ball.body.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);
    if (data.angularVelocity) {
      ball.body.angularVelocity.set(
        data.angularVelocity.x || 0,
        data.angularVelocity.y || 0,
        data.angularVelocity.z || 0
      );
    }
  });

  socket.on("roomError", (msg) => {
    alert(msg || "Otaq xətası");
    leaveRoomSession();
    menu.show();
    setMode("menu");
  });
}

menu.onStartTraining = (state) => {
  audio.ensureStarted();
  audio.setVolumes(state);
  lastGameState = state;

  player.applyAvatar(state.avatar);
  player.mesh.position.set(0, 0, 2);
  resetBallToKickoff();

  menu.hide();
  roomCode = "";
  remainingTime = 0;
  rematchOverlay.style.display = "none";
  setMode("training");
};

menu.onStartRoomMatch = (state) => {
  audio.ensureStarted();
  audio.setVolumes(state);
  lastGameState = state;

  player.applyAvatar(state.avatar);
  player.mesh.position.set(0, 0, 2);
  resetBallToKickoff();

  roomCode = state.room?.code || state.roomCode || "ROOM";
  remainingTime = (state.room?.matchTime || state.matchTime || 10) * 60;
  pendingRoomAction = state.roomAction || (state.room?.createdAt ? "create" : "join");
  leaveRoomSession();

  rematchOverlay.style.display = "none";
  if (!socket) {
    alert("Socket bağlantısı tapılmadı.");
    return;
  }

  if (!socket.connected) socket.connect();
  const payload = {
    code: roomCode,
    teamSize: state.teamSize,
    matchTime: state.matchTime,
    nickname: state.nickname || "Oyuncu",
    avatar: state.avatar || {},
  };

  if (pendingRoomAction === "create") {
    socket.emit("createRoom", payload);
  } else {
    socket.emit("joinRoom", payload);
  }
};

rematchBtn.onclick = () => {
  if (lastGameState) {
    if (mode === "room") {
      menu.onStartRoomMatch(lastGameState);
    } else {
      menu.onStartTraining(lastGameState);
    }
  }
};

exitToMenuBtn.onclick = () => {
  rematchOverlay.style.display = "none";
  if (mode === "room" && socket?.connected) socket.disconnect();
  leaveRoomSession();
  menu.show();
  setMode("menu");
};

player.onStamina = (ratio) => {
  sprintFill.style.width = `${Math.round(ratio * 100)}%`;
};

player.onCameraMode = (modeName) => {
  cameraValue.textContent = modeName === "thirdPerson" ? "Third Person" : "Isometric";
};

player.onChargeStart = (label) => {
  powerWrap.style.display = "block";
  powerLabel.textContent = label;
  powerFill.style.width = "0%";
};

player.onChargeUpdate = (ratio, label) => {
  powerLabel.textContent = label;
  powerFill.style.width = `${Math.round(Math.min(1, ratio) * 100)}%`;
};

player.onChargeEnd = () => {
  powerWrap.style.display = "none";
  falsoWrap.style.display = "none";
};

player.onFalsoUpdate = (ratio) => {
  if (ratio > 0.01) {
    falsoWrap.style.display = "block";
    falsoFill.style.width = `${Math.round(ratio * 100)}%`;
  } else {
    falsoWrap.style.display = "none";
  }
};

player.onChargeRelease = (charge) => {
  player.triggerKick();
  const p = Math.min(1, charge.hold / 1.3);
  // REMATCH Style: shoot where the camera is looking
  const forward = player.getAimDir();
  const right = new THREE.Vector3(-forward.z, 0, forward.x);

  const ballPos = new THREE.Vector3(ball.body.position.x, ball.body.position.y, ball.body.position.z);
  const nearFoot = player.mesh.position.clone().add(forward.clone().multiplyScalar(0.7));
  const toBall = ballPos.clone().sub(nearFoot);

  if (toBall.length() > 3.5) return; // Increased range for better reliability

  let speed = 0;
  let lift = 0;
  let sfxType = "pass";

  if (charge.type === "Space") {
    // Shot
    speed = THREE.MathUtils.lerp(10, 32, p);
    lift = THREE.MathUtils.lerp(1.5, 9, p * p);
    sfxType = "shot";

    // "Çox basanda qapıya yox çöllüyə gedə bilər"
    const missThreshold = 0.82;
    if (p > missThreshold) {
      const missFactor = (p - missThreshold) * 4.5;
      const randX = (Math.random() - 0.5) * missFactor;
      const randY = (Math.random() - 0.5) * missFactor;
      forward.addScaledVector(right, randX).normalize();
      lift += randY * 5;
    }
  } else if (charge.type === "KeyQ") {
    // Long Pass
    speed = THREE.MathUtils.lerp(9, 21, p);
    lift = THREE.MathUtils.lerp(4, 11, p);
    sfxType = "longPass";
  } else if (charge.type === "KeyE") {
    // Short Pass
    speed = THREE.MathUtils.lerp(7, 18, p);
    lift = THREE.MathUtils.lerp(0.5, 2.5, p);
  }

  // Physics Reset for clean kick
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);

  // Calculate final velocity components
  const vx = forward.x * speed;
  const vy = lift;
  const vz = forward.z * speed;

  ball.body.velocity.set(vx, vy, vz);

  // Apply visual spin and curve
  if (charge.falso !== 0) {
    // inside foot (L) is positive falso, outside foot (K) is negative
    const spinAmount = charge.falso * (speed * 0.4);
    ball.body.angularVelocity.y = spinAmount;
  }

  if (mode === "room" && socket?.connected) {
    socket.emit("ballKick", {
      velocity: { x: vx, y: vy, z: vz },
      angularVelocity: {
        x: ball.body.angularVelocity.x,
        y: ball.body.angularVelocity.y,
        z: ball.body.angularVelocity.z,
      },
    });
  }

  audio.kick(sfxType);
};

window.addEventListener("keydown", (e) => {
  if (mode === "menu") {
    if (e.code === "Enter") audio.ensureStarted();
    return;
  }

  if (e.code === "Escape") {
    if (mode === "room" && socket?.connected) socket.disconnect();
    leaveRoomSession();
    menu.show();
    setMode("menu");
    return;
  }

  if (mode === "training" && e.code === "KeyR") {
    const f = new THREE.Vector3(Math.sin(player.mesh.rotation.y), 0, -Math.cos(player.mesh.rotation.y)).normalize();
    const target = player.mesh.position.clone().addScaledVector(f, 1.0);
    ball.body.position.set(target.x, 0.22, target.z);
    ball.body.velocity.set(0, 0, 0);
    ball.body.angularVelocity.set(0, 0, 0);
  }
});

const clock = new THREE.Clock();
setMode("menu");

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, clock.getDelta());

  if (mode === "training" || mode === "room") {
    // 1. Run physics simulation first
    physics.step(dt);

    // 2. Move the player — this also runs applyDribbling which
    //    overwrites ball.body.position to lock the ball in front
    player.update(dt);

    // 3. RE-SYNC ball mesh to ball body AFTER dribbling override
    //    This is critical: physics.step synced mesh←body, but then
    //    applyDribbling changed body.position. We must update mesh again.
    ball.mesh.position.copy(ball.body.position);
    ball.mesh.quaternion.copy(ball.body.quaternion);

    // 4. Magnus effect for curve shots (only when ball is free / kicked)
    const vel = new THREE.Vector3(ball.body.velocity.x, ball.body.velocity.y, ball.body.velocity.z);
    const spinY = ball.body.angularVelocity.y;

    if (Math.abs(spinY) > 0.1 && vel.lengthSq() > 0.2) {
      const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, spinY, 0), vel).multiplyScalar(0.0008);
      ball.body.velocity.x += side.x;
      ball.body.velocity.z += side.z;
    }

    for (const remote of remotePlayers.values()) {
      remote.mesh.position.lerp(remote.targetPos, Math.min(1, dt * 12));
      const rotDiff = remote.targetRot - remote.mesh.rotation.y;
      remote.mesh.rotation.y += rotDiff * Math.min(1, dt * 12);
    }

    if (mode === "room") {
      networkSendTimer += dt;
      if (socket?.connected && networkSendTimer >= 0.05) {
        networkSendTimer = 0;
        socket.emit("playerUpdate", {
          position: {
            x: player.mesh.position.x,
            y: player.mesh.position.y,
            z: player.mesh.position.z,
          },
          rotation: player.mesh.rotation.y,
          velocity: {
            x: player.velocity.x,
            y: player.velocity.y,
            z: player.velocity.z,
          },
          animState: {},
        });

        if (isRoomHost) {
          socket.emit("ballUpdate", {
            x: ball.body.position.x,
            y: ball.body.position.y,
            z: ball.body.position.z,
            vx: ball.body.velocity.x,
            vy: ball.body.velocity.y,
            vz: ball.body.velocity.z,
          });
        }
      }

      remainingTime = Math.max(0, remainingTime - dt);
      timerValue.textContent = formatTime(remainingTime);
      if (remainingTime <= 0) {
        remainingTime = 0;
        modeValue.textContent = "ROOM END";
        rematchOverlay.style.display = "flex";
      }
    }
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
