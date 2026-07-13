import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";
import { FBXLoader } from "https://unpkg.com/three@0.165.0/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "https://unpkg.com/three@0.165.0/examples/jsm/utils/SkeletonUtils.js";
import { AcademyDirector } from "./AcademyDirector.js?v=20260308-1";
import { Menu } from "./Menu.js?v=20260308-1";
import { Physics } from "./Physics.js?v=20260306-3";
import { Player } from "./Player.js?v=20260308-1";
import { SkillDuelDirector } from "./SkillDuelDirector.js?v=20260308-1";

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

const fbxLoader = new FBXLoader();

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
const qualityValue = document.getElementById("qualityValue");
const scoreHud = document.getElementById("scoreHud");
const scoreHomeValue = document.getElementById("scoreHomeValue");
const scoreAwayValue = document.getElementById("scoreAwayValue");
const scoreTimeValue = document.getElementById("scoreTimeValue");

const falsoWrap = document.getElementById("falsoWrap");
const falsoFill = document.getElementById("falsoFill");

const rematchOverlay = document.getElementById("rematchOverlay");
const rematchBtn = document.getElementById("rematchBtn");
const exitToMenuBtn = document.getElementById("exitToMenuBtn");
const startLoading = document.createElement("div");
startLoading.id = "startLoading";
startLoading.style.cssText = [
  "position:fixed",
  "inset:0",
  "display:none",
  "align-items:center",
  "justify-content:center",
  "background:rgba(4,14,24,0.72)",
  "color:#ecf7ff",
  "font:700 22px/1.2 Arial, sans-serif",
  "letter-spacing:.5px",
  "z-index:1200",
].join(";");
startLoading.textContent = "Avatar yuklenir...";
document.body.appendChild(startLoading);
const celebrationHint = document.createElement("div");
celebrationHint.id = "celebrationHint";
celebrationHint.style.cssText = [
  "position:fixed",
  "left:50%",
  "bottom:22px",
  "transform:translateX(-50%)",
  "display:none",
  "padding:10px 14px",
  "border-radius:10px",
  "border:1px solid rgba(255,255,255,0.18)",
  "background:rgba(5,16,26,0.78)",
  "color:#eaf6ff",
  "font:700 14px/1.2 Manrope, Arial, sans-serif",
  "letter-spacing:.3px",
  "z-index:1300",
].join(";");
celebrationHint.textContent = "Qol sevincini sec: 1-0";
document.body.appendChild(celebrationHint);
const keeperHint = document.createElement("div");
keeperHint.id = "keeperHint";
keeperHint.style.cssText = [
  "position:fixed",
  "right:18px",
  "bottom:18px",
  "display:none",
  "max-width:320px",
  "padding:12px 14px",
  "border-radius:14px",
  "border:1px solid rgba(255,255,255,0.16)",
  "background:rgba(5,16,26,0.84)",
  "color:#eaf6ff",
  "font:700 13px/1.45 Manrope, Arial, sans-serif",
  "letter-spacing:.2px",
  "z-index:1300",
].join(";");
document.body.appendChild(keeperHint);

const lobbyPanel = document.createElement("div");
lobbyPanel.id = "lobbyPanel";
lobbyPanel.style.cssText = [
  "position:fixed",
  "left:50%",
  "bottom:26px",
  "transform:translateX(-50%)",
  "display:none",
  "gap:10px",
  "padding:14px 16px",
  "border-radius:16px",
  "border:1px solid rgba(255,255,255,0.16)",
  "background:rgba(5,16,26,0.86)",
  "color:#eaf6ff",
  "font:700 14px/1.3 Manrope, Arial, sans-serif",
  "letter-spacing:.3px",
  "z-index:1400",
  "min-width:260px",
  "text-align:center",
].join(";");
lobbyPanel.innerHTML = `
  <div id="lobbyTitle" style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:.8;">Lobby</div>
  <div id="lobbyCode" style="font-size:16px;"></div>
  <div id="lobbyStatus" style="font-size:12px;opacity:.8;"></div>
  <div id="lobbyReadyStats" style="font-size:12px;opacity:.8;"></div>
  <div id="lobbyControls" style="display:grid;gap:8px;margin-top:6px;">
    <div style="display:flex;gap:8px;align-items:center;justify-content:center;">
      <label style="font-size:12px;opacity:.7;">Takim</label>
      <select id="lobbyTeam" style="min-width:110px;"></select>
    </div>
    <div style="display:flex;gap:8px;align-items:center;justify-content:center;">
      <label style="font-size:12px;opacity:.7;">Rol</label>
      <select id="lobbyRole" style="min-width:110px;"></select>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;">
      <button id="lobbyReadyBtn" style="padding:8px 14px;border-radius:10px;border:none;background:rgba(255,255,255,0.12);color:#eaf6ff;font-weight:800;cursor:pointer;">Hazir Deyil</button>
      <button id="lobbyCopyBtn" style="padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#eaf6ff;font-weight:700;cursor:pointer;">Kodu Kopyala</button>
    </div>
  </div>
  <div id="lobbyHostRow" style="display:none;gap:8px;justify-content:center;margin-top:6px;">
    <button id="lobbyStartBtn" style="padding:8px 14px;border-radius:10px;border:none;background:linear-gradient(135deg,#ffcc4d,#ffa31f);color:#1a1200;font-weight:800;cursor:pointer;">Maci Baslat</button>
  </div>
`;
document.body.appendChild(lobbyPanel);
const lobbyCode = lobbyPanel.querySelector("#lobbyCode");
const lobbyStatus = lobbyPanel.querySelector("#lobbyStatus");
const lobbyReadyStats = lobbyPanel.querySelector("#lobbyReadyStats");
const lobbyTeam = lobbyPanel.querySelector("#lobbyTeam");
const lobbyRole = lobbyPanel.querySelector("#lobbyRole");
const lobbyReadyBtn = lobbyPanel.querySelector("#lobbyReadyBtn");
const lobbyCopyBtn = lobbyPanel.querySelector("#lobbyCopyBtn");
const lobbyHostRow = lobbyPanel.querySelector("#lobbyHostRow");
const lobbyStartBtn = lobbyPanel.querySelector("#lobbyStartBtn");

if (lobbyStartBtn) {
  lobbyStartBtn.addEventListener("click", () => {
    if (mode !== "room" || !isRoomHost || roomPhase !== "lobby") return;
    if (socket?.connected) socket.emit("startMatch");
  });
}

if (lobbyReadyBtn) {
  lobbyReadyBtn.addEventListener("click", () => {
    if (mode !== "room" || roomPhase !== "lobby") return;
    if (socket?.connected) socket.emit("toggleReady");
  });
}

if (lobbyTeam) {
  lobbyTeam.addEventListener("change", () => {
    if (mode !== "room" || roomPhase !== "lobby") return;
    const team = lobbyTeam.value;
    const role = lobbyRole?.value || localMatchSlot.role;
    if (socket?.connected) socket.emit("changeSlot", { team, role });
  });
}

if (lobbyRole) {
  lobbyRole.addEventListener("change", () => {
    if (mode !== "room" || roomPhase !== "lobby") return;
    const team = lobbyTeam?.value || localMatchSlot.team;
    const role = lobbyRole.value;
    if (socket?.connected) socket.emit("changeSlot", { team, role });
  });
}

if (lobbyCopyBtn) {
  lobbyCopyBtn.addEventListener("click", async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      lobbyCopyBtn.textContent = "Kopyalandi";
      setTimeout(() => {
        lobbyCopyBtn.textContent = "Kodu Kopyala";
      }, 1200);
    } catch {
      lobbyCopyBtn.textContent = "Kopyala";
    }
  });
}

let lastGameState = null; // To store settings for rematch

const QUALITY_PROFILES = {
  ultra: {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 1.55),
    shadowMapSize: 3072,
    shadowType: THREE.PCFSoftShadowMap,
    shadowEvery: 1,
    exposure: 0.72,
    fogFar: 196,
    environmentIntensity: 0.42,
    hemi: 1.08,
    sun: 1.82,
    bounce: 0.32,
    rim: 0.52,
  },
  high: {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 1.35),
    shadowMapSize: 2048,
    shadowType: THREE.PCFSoftShadowMap,
    shadowEvery: 2,
    exposure: 0.68,
    fogFar: 184,
    environmentIntensity: 0.36,
    hemi: 0.96,
    sun: 1.62,
    bounce: 0.25,
    rim: 0.42,
  },
  medium: {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 0.95),
    shadowMapSize: 768,
    shadowType: THREE.PCFShadowMap,
    shadowEvery: 4,
    exposure: 0.62,
    fogFar: 165,
    environmentIntensity: 0.24,
    hemi: 0.78,
    sun: 1.28,
    bounce: 0.16,
    rim: 0.26,
  },
};
const QUALITY_ORDER = ["medium", "high", "ultra"];

class PerformanceDirector {
  constructor(rendererRef, sceneRef, lightsRef, physicsRef, playerRef) {
    this.renderer = rendererRef;
    this.scene = sceneRef;
    this.lights = lightsRef;
    this.physics = physicsRef;
    this.player = playerRef;
    this.profileName = "high";
    this.profile = QUALITY_PROFILES.high;
    this.manualOverride = false;
    this.frameAccumulator = 0;
    this.frameCount = 0;
    this.lowFpsStreak = 0;
    this.highFpsStreak = 0;
    this.shadowFrame = 0;
  }

  detectInitialProfile() {
    const dpr = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 10 && dpr <= 1.6) return "ultra";
    if (cores >= 6 && dpr <= 1.9) return "high";
    return "medium";
  }

  applyProfile(name) {
    const nextName = QUALITY_PROFILES[name] ? name : "high";
    const next = QUALITY_PROFILES[nextName];
    this.profileName = nextName;
    this.profile = next;

    this.renderer.setPixelRatio(next.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.type = next.shadowType;
    this.renderer.toneMappingExposure = next.exposure;
    this.scene.environmentIntensity = next.environmentIntensity;
    if (this.scene.fog) this.scene.fog.far = next.fogFar;

    this.lights.hemi.intensity = next.hemi;
    this.lights.sun.intensity = next.sun;
    this.lights.bounceFill.intensity = next.bounce;
    this.lights.warmRim.intensity = next.rim;
    this.lights.sun.shadow.mapSize.set(next.shadowMapSize, next.shadowMapSize);

    this.physics.setPerformanceProfile?.(nextName);
    this.player.setPerformanceProfile?.(nextName);

    this.shadowFrame = 0;
    this.renderer.shadowMap.needsUpdate = true;
    if (qualityValue) qualityValue.textContent = nextName.toUpperCase();
  }

  beginFrame() {
    const shouldRefreshShadow = this.shadowFrame % this.profile.shadowEvery === 0;
    this.renderer.shadowMap.needsUpdate = shouldRefreshShadow;
    this.shadowFrame += 1;
  }

  update(dt) {
    if (this.manualOverride) return;
    if (document.hidden) return;
    this.frameAccumulator += dt;
    this.frameCount += 1;
    if (this.frameAccumulator < 1.6) return;

    const fps = this.frameCount / this.frameAccumulator;
    if (fps < 47 && this.profileName !== "medium") {
      this.lowFpsStreak += 1;
      this.highFpsStreak = 0;
      if (this.lowFpsStreak >= 2) this.applyRelativeProfile(-1);
    } else if (fps > 78 && this.profileName !== "ultra") {
      this.highFpsStreak += 1;
      this.lowFpsStreak = 0;
      if (this.highFpsStreak >= 3) this.applyRelativeProfile(1);
    } else {
      this.lowFpsStreak = 0;
      this.highFpsStreak = 0;
    }

    this.frameAccumulator = 0;
    this.frameCount = 0;
  }

  applyRelativeProfile(direction) {
    const index = QUALITY_ORDER.indexOf(this.profileName);
    const nextIndex = THREE.MathUtils.clamp(index + direction, 0, QUALITY_ORDER.length - 1);
    const nextName = QUALITY_ORDER[nextIndex];
    if (nextName !== this.profileName) this.applyProfile(nextName);
    this.lowFpsStreak = 0;
    this.highFpsStreak = 0;
  }

  noteResume() {
    this.frameAccumulator = 0;
    this.frameCount = 0;
    this.lowFpsStreak = 0;
    this.highFpsStreak = 0;
    this.shadowFrame = 0;
    this.renderer.shadowMap.needsUpdate = true;
  }
}

function freezeStaticObject(root) {
  root.traverse((obj) => {
    obj.matrixAutoUpdate = false;
    obj.updateMatrix();
  });
  return root;
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.66;
renderer.useLegacyLights = false;
app.appendChild(renderer.domElement);

let cameraDragActive = false;
let lastMouseX = 0;
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
renderer.domElement.addEventListener("mousedown", (e) => {
  if (mode === "menu") return;
  if (e.button !== 2 && e.button !== 0) return;
  cameraDragActive = true;
  lastMouseX = e.clientX;
});
window.addEventListener("mouseup", () => {
  cameraDragActive = false;
});
window.addEventListener("mousemove", (e) => {
  if (!cameraDragActive || mode === "menu") return;
  const dx = Number.isFinite(e.movementX) ? e.movementX : e.clientX - lastMouseX;
  lastMouseX = e.clientX;
  player.cameraYaw -= dx * 0.0035;
});

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x647f92, 46, 185);
scene.background = new THREE.Color(0x7298af);
scene.environmentIntensity = 0.34;

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 5, 12);

const hemi = new THREE.HemisphereLight(0xcde7ff, 0x203d24, 0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b5, 0);
sun.position.set(52, 94, 36);
sun.castShadow = true;
sun.shadow.camera.left = -130;
sun.shadow.camera.right = 130;
sun.shadow.camera.top = 98;
sun.shadow.camera.bottom = -98;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.bias = -0.00009;
sun.shadow.normalBias = 0.02;
sun.shadow.mapSize.set(4096, 4096);
scene.add(sun);

const bounceFill = new THREE.DirectionalLight(0x7db1de, 0);
bounceFill.position.set(-36, 32, -28);
scene.add(bounceFill);

const warmRim = new THREE.DirectionalLight(0xffb974, 0);
warmRim.position.set(18, 16, -46);
scene.add(warmRim);

const physics = new Physics(scene);
physics.setupField();
const fallbackGoals = [physics.createGoal(-45), physics.createGoal(45)];
const ballData = physics.createBall();
let ball = ballData;

// Ball is handled procedurally in Physics.js
const player = new Player(scene, camera, physics);
player.mesh.position.set(0, 0, 2);
const skillDuel = new SkillDuelDirector({ scene, player, ball });
player.onGoalCelebrationEnd = () => {
  showCelebrationHint(false);
  resetAfterGoal();
  cameraValue.textContent = player.mode === "thirdPerson" ? "Third Person" : "Isometric";
};
const performanceDirector = new PerformanceDirector(renderer, scene, { hemi, sun, bounceFill, warmRim }, physics, player);
performanceDirector.applyProfile(performanceDirector.detectInitialProfile());
const academy = new AcademyDirector({
  scene,
  player,
  physics,
  ball,
  onExitToMenu: () => returnToMenu(),
  skillDuelDirector: skillDuel,
});
player.setSkillContext(skillDuel.getPlayerContext());
player.onSkillEvent = (payload) => {
  skillDuel.handleSkillEvent(payload);
  academy.noteSkillEvent(payload);
};

const menu = new Menu(menuRoot);
const audio = new AudioManager();
menu.mount();

// --- Client-Side Routing ---
const ROUTE_MAP = {
  "#/menu": "main",
  "#/antrenman": "academy",
  "#/fərdiləşdirmə": "customize",
  "#/ayarlar": "settings",
  "#/hesap": "account",
  "#/play": "play",
  "#/social": "social"
};

function handleRoute() {
  const hash = window.location.hash || "#/menu";
  // Search for the page in ROUTE_MAP
  let targetPage = "main";
  for (const [r, p] of Object.entries(ROUTE_MAP)) {
    if (hash.startsWith(r)) {
      targetPage = p;
      break;
    }
  }

  // If we are in a match/training, return to menu first
  if (window.mode && window.mode !== "menu") {
    returnToMenu();
  }
  
  // Navigate menu
  menu.goToPage(targetPage, true);
}

window.addEventListener("hashchange", handleRoute);
// Handle initial route on load
setTimeout(handleRoute, 100); 

const CUSTOM_PLAYER_ASSET = {
  fbx: "/Oyuncu ve Animasyonları/Oyuncunun görünümü.fbx",
  texture: "/Oyuncu ve Animasyonları/Oyuncunun görünümünün derisi.png",
  // Model ve animasyonlar yan veya ters bakıyorsa bu değerleri değiştirin (-Math.PI / 2 veya Math.PI / 2 veya Math.PI)
  rotationFix: { x: 0, y: 0, z: 0 },
  animRotationFix: 0,
};
const BALL_OWNER_TIMEOUT_MS = 350;

const ensureCustomPlayer = async () => {
  player.setProceduralVisible(true);
  const loaded = await player.loadCustomModel(
    CUSTOM_PLAYER_ASSET.fbx,
    CUSTOM_PLAYER_ASSET.texture,
    {
      rotationFix: CUSTOM_PLAYER_ASSET.rotationFix,
      preferExternalAnims: false,
      animRotationFix: CUSTOM_PLAYER_ASSET.animRotationFix,
      useDirectFbxClips: false,
    }
  );
  if (!loaded) {
    player.setProceduralVisible(true);
    console.warn("Custom FBX load failed. Procedural avatar shown as fallback.");
  }
  if (loaded) {
    player.setProceduralVisible(false);
    refreshRemotePlayersAppearance();
  }
  return loaded;
};

// player.applyAvatar(menu.state?.avatar || {}, { showProceduralWhileLoading: true });
player.setProceduralVisible(true);
player.loadCustomModel(
  CUSTOM_PLAYER_ASSET.fbx,
  CUSTOM_PLAYER_ASSET.texture,
  {
    rotationFix: CUSTOM_PLAYER_ASSET.rotationFix,
    preferExternalAnims: false,
    animRotationFix: CUSTOM_PLAYER_ASSET.animRotationFix,
    useDirectFbxClips: false,
  }
).then((loaded) => {
  if (loaded) {
    player.setProceduralVisible(false);
    refreshRemotePlayersAppearance();
  } else {
    player.setProceduralVisible(true);
  }
});

menu.onQualityChange = (profile) => {
  if (profile === "auto") {
    performanceDirector.manualOverride = false;
    performanceDirector.applyProfile(performanceDirector.detectInitialProfile());
  } else {
    performanceDirector.manualOverride = true;
    performanceDirector.applyProfile(profile);
  }
};

// Debug exports
window.game = { scene, camera, player, physics, ball, academy, skillDuel, THREE, CANNON };
window.game.mode = "menu";
window.game.ballOwnerId = null;
window.game.myPlayerId = null;
window.game.lastBallSyncAt = 0;
window.game.ballOwnerTimeout = BALL_OWNER_TIMEOUT_MS;

let mode = "menu";
let remainingTime = 0;
let homeScore = 0;
let awayScore = 0;
let goalCooldown = 0;
let lastBallTouch = { by: "local", at: 0 };
let celebrationHintTimer = null;
const CELEBRATION_LABELS = {
  1: "Diz Uste Surusme",
  2: "SIIUU",
  3: "Sssst",
  4: "Backflip",
  5: "Mask",
  6: "Bokscu",
  7: "Telefon",
  8: "Goye Baxis",
  9: "Robot",
  10: "Kamera Opusu",
};
const TEAM_META = {
  blue: { id: "blue", label: "Mavi", hud: "#6ab8ff", kit: 0x2f72ff, trim: 0xdff3ff, defendX: -45, attackX: 45 },
  red: { id: "red", label: "Qirmizi", hud: "#ff8d82", kit: 0xc93b47, trim: 0xffe2d8, defendX: 45, attackX: -45 },
};
const DEFAULT_KEEPER_SETTINGS = {
  goalkeepersEnabled: true,
  goalSweeper: true,
  keeperCatchMode: "toggle",
  keeperDiveAssist: "balanced",
  keeperHoldSeconds: 5,
  keeperDistribution: "hybrid",
};
let roomCode = "";
let pendingRoomAction = "join";
let isRoomHost = false;
let roomPhase = "lobby";
let roomMatchStartAt = 0;
let roomMatchDuration = 0;
let localReady = false;
let myPlayerId = null;
let networkSendTimer = 0;
let ballOwnerId = null;
let lastBallSyncAt = 0;
let remoteAnimClips = null;
let localMatchSlot = {
  team: "blue",
  role: "field",
  keeperSettings: { ...DEFAULT_KEEPER_SETTINGS },
};
let roomSettings = { ...DEFAULT_KEEPER_SETTINGS, teamSize: "3v3", matchTime: 10 };
const roomRoster = new Map();
let readyStats = { ready: 0, total: 0 };
const DEFAULT_SPAWN = new THREE.Vector3(0, 0, 2);
let localSpawnPoint = DEFAULT_SPAWN.clone();
const goalkeeperState = {
  catchMode: false,
  holdingBall: false,
  holdTimer: 0,
  diveTimer: 0,
  diveCooldown: 0,
  diveDir: new THREE.Vector3(0, 0, 1),
};
const remotePlayers = new Map();
const socket = window.io ? window.io({ autoConnect: false }) : null;
const tempFacing = new THREE.Vector3();
const tempVec1 = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const tempVec3 = new THREE.Vector3();
const tempVec4 = new THREE.Vector3();
const tempVec5 = new THREE.Vector3();
const tempLookTarget = new THREE.Vector3();
const tempDesiredCamera = new THREE.Vector3();

function getTeamMeta(team = "blue") {
  return TEAM_META[team] || TEAM_META.blue;
}

function normalizeKeeperSettings(settings = {}) {
  const holdSeconds = Number(settings.keeperHoldSeconds);
  return {
    goalkeepersEnabled: settings.goalkeepersEnabled !== false,
    goalSweeper: settings.goalSweeper !== false,
    keeperCatchMode: settings.keeperCatchMode === "hold" ? "hold" : "toggle",
    keeperDiveAssist: ["high", "balanced", "manual"].includes(settings.keeperDiveAssist) ? settings.keeperDiveAssist : "balanced",
    keeperHoldSeconds: Number.isFinite(holdSeconds) ? THREE.MathUtils.clamp(Math.round(holdSeconds), 3, 8) : 5,
    keeperDistribution: ["hybrid", "throw", "punt"].includes(settings.keeperDistribution) ? settings.keeperDistribution : "hybrid",
  };
}

function getRemoteCustomModelClone() {
  if (!player?.customModel) return null;
  const clone = SkeletonUtils.clone(player.customModel);
  clone.traverse((obj) => {
    if (obj.isSkinnedMesh && obj.skeleton) obj.skeleton.pose();
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  const root = new THREE.Group();
  root.add(clone);
  root.userData.isCustomModel = true;
  return root;
}

function cacheRemoteAnimClips() {
  if (remoteAnimClips || !player?.rpmAnimReady || !player?.rpmActions) return;
  const clips = {};
  ["idle", "dribble", "sprint"].forEach((name) => {
    const action = player.rpmActions?.[name];
    if (action?.getClip) clips[name] = action.getClip();
  });
  if (Object.keys(clips).length === 0) return;
  remoteAnimClips = clips;
  refreshRemotePlayersAppearance(true);
}

function attachRemoteAnimations(remote) {
  if (!remoteAnimClips || !remote?.mesh) return;
  remote.animMixer = new THREE.AnimationMixer(remote.mesh);
  remote.animActions = {};
  Object.entries(remoteAnimClips).forEach(([name, clip]) => {
    const action = remote.animMixer.clipAction(clip);
    action.enabled = true;
    action.setEffectiveWeight(name === "idle" ? 1 : 0);
    action.play();
    remote.animActions[name] = action;
  });
  remote.animState = "idle";
}

function refreshRemotePlayersAppearance(force = false) {
  if (!player?.customModel) return;
  for (const remote of remotePlayers.values()) {
    if (!force && remote.mesh?.userData?.isCustomModel) continue;
    const prev = remote.mesh;
    const next = buildRemotePlayerMesh(remote.data || {});
    next.position.copy(prev.position);
    next.rotation.copy(prev.rotation);
    next.userData.inited = true;
    scene.remove(prev);
    remote.mesh = next;
    scene.add(next);
    styleRemotePlayer(remote.mesh, remote.data || {});
    if (remote.mesh.userData.isCustomModel) attachRemoteAnimations(remote);
  }
}

function buildRemotePlayerMesh(playerData = {}) {
  const custom = getRemoteCustomModelClone();
  if (custom) return custom;
  const teamMeta = getTeamMeta(playerData.team);
  const isKeeper = playerData.role === "goalkeeper";
  const root = new THREE.Group();
  const kitMat = new THREE.MeshPhysicalMaterial({
    color: teamMeta.kit,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.62,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: teamMeta.trim, roughness: 0.45, metalness: 0.08 });
  const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xd8a87d, roughness: 0.68, metalness: 0.0 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1f18, roughness: 0.74 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: isKeeper ? 0xf7f9ff : 0x181818, roughness: 0.42, metalness: 0.06 });

  const torso = new THREE.Group();
  torso.position.y = 1.35;
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 6, 14), kitMat);
  chest.rotation.z = Math.PI / 2;
  chest.castShadow = true;
  torso.add(chest);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.3), trimMat);
  stripe.position.y = 0.02;
  stripe.castShadow = true;
  torso.add(stripe);

  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.34), trimMat);
  shorts.position.y = 0.95;
  shorts.castShadow = true;

  const createLeg = (x) => {
    const g = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.095, 0.42, 10), skinMat);
    thigh.position.y = -0.22;
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.4 }));
    sock.position.y = -0.72;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.34 }));
    boot.position.set(0, -0.96, 0.12);
    g.add(thigh, sock, boot);
    g.position.set(x, 0.95, 0);
    return g;
  };

  const createArm = (x) => {
    const g = new THREE.Group();
    g.position.set(x, 1.65, 0);
    g.rotation.z = x > 0 ? 0.12 : -0.12;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.3, 10), kitMat);
    upper.position.y = -0.15;
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.28, 10), skinMat);
    forearm.position.y = -0.45;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.12), gloveMat);
    hand.position.y = -0.62;
    g.add(upper, forearm, hand);
    return g;
  };

  const head = new THREE.Group();
  head.position.y = 1.84;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 14), skinMat);
  skull.scale.set(0.94, 1.05, 0.98);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
  hair.position.y = 0.1;
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.38), hairMat);
  beard.position.set(0, -0.1, 0.11);
  head.add(skull, hair, beard);

  root.add(torso, shorts, createLeg(-0.16), createLeg(0.16), createArm(-0.34), createArm(0.34), head);
  root.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  root.userData.materials = { kitMat, trimMat, gloveMat };
  root.userData.isKeeper = isKeeper;
  return root;
}

function styleRemotePlayer(mesh, playerData = {}) {
  if (mesh?.userData?.isCustomModel) return;
  const materials = mesh?.userData?.materials;
  if (!materials) return;
  const teamMeta = getTeamMeta(playerData.team);
  const isKeeper = playerData.role === "goalkeeper";
  materials.kitMat.color.setHex(teamMeta.kit);
  materials.trimMat.color.setHex(teamMeta.trim);
  materials.gloveMat.color.setHex(isKeeper ? 0xf7f9ff : 0x181818);
  mesh.userData.isKeeper = isKeeper;
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
    const mesh = buildRemotePlayerMesh(playerData);
    scene.add(mesh);
    remote = {
      mesh,
      targetPos: new THREE.Vector3(),
      targetRot: 0,
      velocity: new THREE.Vector3(),
      data: {},
    };
    remotePlayers.set(id, remote);
    if (remote.mesh.userData.isCustomModel) attachRemoteAnimations(remote);
  }
  remote.data = { ...playerData };
  styleRemotePlayer(remote.mesh, playerData);

  const pos = playerData.position || { x: 0, y: 0, z: 0 };
  remote.targetPos.set(pos.x || 0, pos.y || 0, pos.z || 0);
  remote.targetRot = playerData.rotation || 0;
  const vel = playerData.velocity || { x: 0, y: 0, z: 0 };
  remote.velocity.set(vel.x || 0, vel.y || 0, vel.z || 0);
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

function getFlatFacing() {
  return tempFacing.set(0, 0, 1).applyQuaternion(player.mesh.quaternion).setY(0).normalize();
}

function getKeeperZoneState(position = player.mesh.position, team = localMatchSlot.team, settings = localMatchSlot.keeperSettings) {
  const isBlue = team === "blue";
  const inPenaltyX = isBlue ? position.x <= -28.5 : position.x >= 28.5;
  const inSweeperX = settings.goalSweeper ? (isBlue ? position.x <= 6 : position.x >= -6) : inPenaltyX;
  return {
    penalty: inPenaltyX && Math.abs(position.z) <= 20.4,
    sweeper: inSweeperX && Math.abs(position.z) <= 24.5,
    clampZ: 24.5,
    clampX: settings.goalSweeper ? (isBlue ? 6 : -6) : (isBlue ? -28.5 : 28.5),
  };
}

function resetGoalkeeperState() {
  goalkeeperState.catchMode = false;
  goalkeeperState.holdingBall = false;
  goalkeeperState.holdTimer = 0;
  goalkeeperState.diveTimer = 0;
  goalkeeperState.diveCooldown = 0;
  goalkeeperState.diveDir.set(0, 0, 1);
  keeperHint.style.display = "none";
}

function updateKeeperHint() {
  if (mode !== "room" || localMatchSlot.role !== "goalkeeper") {
    keeperHint.style.display = "none";
    return;
  }
  const zone = getKeeperZoneState();
  const catchModeActive = localMatchSlot.keeperSettings.keeperCatchMode === "hold"
    ? !!(player.keys.AltLeft || player.keys.AltRight)
    : goalkeeperState.catchMode;
  const teamMeta = getTeamMeta(localMatchSlot.team);
  keeperHint.innerHTML = [
    `<div style="color:${teamMeta.hud};font-size:12px;text-transform:uppercase;letter-spacing:.9px;">${teamMeta.label} qapici</div>`,
    `<div>${goalkeeperState.holdingBall ? "Top eldedir" : catchModeActive ? "Catch mode aktiv" : "Catch mode baglidir"}</div>`,
    `<div style="opacity:.78;">${zone.penalty ? "Penalty area daxilindesen" : zone.sweeper ? "Sweeper zonadasan" : "Qapi zonasindan cixmisan"}</div>`,
    `<div style="opacity:.82;">Alt catch | F dive | E/Q/Space paylama</div>`,
  ].join("");
  keeperHint.style.display = "block";
}

function applyLocalRoomAssignment(playerData = {}, settings = {}) {
  localMatchSlot = {
    team: playerData.team || "blue",
    role: playerData.role || "field",
    keeperSettings: normalizeKeeperSettings(settings),
  };
  player.isGoalkeeper = localMatchSlot.role === "goalkeeper";
  const pos = playerData.position || { x: 0, y: 0, z: 2 };
  localSpawnPoint.set(pos.x || 0, pos.y || 0, pos.z || 0);
  player.mesh.position.copy(localSpawnPoint);
  resetGoalkeeperState();
  if (localMatchSlot.role === "goalkeeper" && localMatchSlot.keeperSettings.keeperCatchMode === "toggle") {
    goalkeeperState.catchMode = true;
  }
  syncRoomHud();
  updateKeeperHint();
}

function setBallToKeeperHands() {
  const carryPoint = tempVec1.copy(player.mesh.position).addScaledVector(getFlatFacing(), 0.64);
  carryPoint.y = 1.38;
  ball.body.position.set(carryPoint.x, carryPoint.y, carryPoint.z);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
}

function catchGoalkeeperBall() {
  goalkeeperState.holdingBall = true;
  goalkeeperState.holdTimer = 0;
  goalkeeperState.diveTimer = 0;
  goalCooldown = Math.max(goalCooldown, 0.15);
  lastBallTouch = { by: "local", at: performance.now() };
  setBallToKeeperHands();
}

function deflectGoalkeeperBall() {
  const away = tempVec1.set(localMatchSlot.team === "blue" ? 1 : -1, 0, 0);
  const bodyToBall = tempVec2.set(
    ball.body.position.x - player.mesh.position.x,
    0,
    ball.body.position.z - player.mesh.position.z
  );
  if (bodyToBall.lengthSq() < 0.001) bodyToBall.copy(away);
  bodyToBall.normalize().addScaledVector(away, 0.75).normalize();

  const speed = Math.max(12, tempVec3.set(ball.body.velocity.x, ball.body.velocity.y, ball.body.velocity.z).length() * 0.74);
  ball.body.velocity.set(bodyToBall.x * speed, 4.8, bodyToBall.z * speed);
  ball.body.angularVelocity.set(0, 0, 0);
  goalCooldown = Math.max(goalCooldown, 0.15);
  lastBallTouch = { by: "local", at: performance.now() };
  ballOwnerId = null;
  lastBallSyncAt = performance.now();
  if (mode === "room" && socket?.connected) {
    socket.emit("ballKick", {
      position: { x: ball.body.position.x, y: ball.body.position.y, z: ball.body.position.z },
      velocity: { x: ball.body.velocity.x, y: ball.body.velocity.y, z: ball.body.velocity.z },
      angularVelocity: { x: 0, y: 0, z: 0 },
    });
  }
}

function releaseGoalkeeperDistribution(charge) {
  const p = Math.min(1, charge.hold / 1.3);
  const forward = player.getAimDir();
  const carryPoint = tempVec1.copy(player.mesh.position).addScaledVector(forward, 0.82);
  carryPoint.y = 1.18;

  let speed = 0;
  let lift = 0;
  let sfxType = "pass";
  if (charge.type === "Space") {
    speed = THREE.MathUtils.lerp(16, 28, p);
    lift = THREE.MathUtils.lerp(7, 12, p);
    sfxType = "shot";
  } else if (charge.type === "KeyQ") {
    speed = THREE.MathUtils.lerp(14, 24, p);
    lift = localMatchSlot.keeperSettings.keeperDistribution === "punt"
      ? THREE.MathUtils.lerp(6, 11, p)
      : THREE.MathUtils.lerp(3, 7, p);
    sfxType = "longPass";
  } else {
    speed = THREE.MathUtils.lerp(9, 17, p);
    lift = localMatchSlot.keeperSettings.keeperDistribution === "throw" ? THREE.MathUtils.lerp(0.8, 2.2, p) : THREE.MathUtils.lerp(1.4, 3.2, p);
  }

  goalkeeperState.holdingBall = false;
  goalkeeperState.holdTimer = 0;
  lastBallTouch = { by: "local", at: performance.now() };
  ballOwnerId = null;
  lastBallSyncAt = performance.now();
  ball.body.position.set(carryPoint.x, carryPoint.y, carryPoint.z);
  ball.body.velocity.set(forward.x * speed, lift, forward.z * speed);
  ball.body.angularVelocity.set(0, 0, 0);
  if (mode === "room" && socket?.connected) {
    socket.emit("ballKick", {
      position: { x: ball.body.position.x, y: ball.body.position.y, z: ball.body.position.z },
      velocity: { x: ball.body.velocity.x, y: ball.body.velocity.y, z: ball.body.velocity.z },
      angularVelocity: { x: 0, y: 0, z: 0 },
    });
  }
  audio.kick(sfxType);
}

function triggerGoalkeeperDive() {
  if (mode !== "room" || localMatchSlot.role !== "goalkeeper") return;
  if (goalkeeperState.holdingBall || goalkeeperState.diveCooldown > 0) return;
  const zone = getKeeperZoneState();
  if (!zone.sweeper) return;

  const inputDir = player.moveDir.lengthSq() > 0.0001 ? tempVec1.copy(player.moveDir) : tempVec1.copy(getFlatFacing());
  const ballDir = tempVec2.set(ball.body.position.x - player.mesh.position.x, 0, ball.body.position.z - player.mesh.position.z);
  if (ballDir.lengthSq() > 0.0001) ballDir.normalize();
  const assistMap = { high: 0.58, balanced: 0.34, manual: 0.08 };
  const assist = assistMap[localMatchSlot.keeperSettings.keeperDiveAssist] ?? 0.34;
  const finalDir = inputDir.normalize();
  if (ballDir.lengthSq() > 0.0001) finalDir.lerp(ballDir, assist).normalize();

  goalkeeperState.diveDir.copy(finalDir);
  goalkeeperState.diveTimer = 0.4;
  goalkeeperState.diveCooldown = 0.58;
}

function updateGoalkeeperSystem(dt) {
  if (mode !== "room" || localMatchSlot.role !== "goalkeeper") {
    keeperHint.style.display = "none";
    player.setGoalkeeperDive(false);
    return;
  }

  const zone = getKeeperZoneState();
  const catchModeActive = localMatchSlot.keeperSettings.keeperCatchMode === "hold"
    ? !!(player.keys.AltLeft || player.keys.AltRight)
    : goalkeeperState.catchMode;

  goalkeeperState.diveCooldown = Math.max(0, goalkeeperState.diveCooldown - dt);
  if (!zone.sweeper) {
    player.mesh.position.x = localMatchSlot.team === "blue"
      ? Math.min(player.mesh.position.x, zone.clampX)
      : Math.max(player.mesh.position.x, zone.clampX);
    player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -zone.clampZ, zone.clampZ);
    player.velocity.multiplyScalar(0.72);
  }

  if (goalkeeperState.diveTimer > 0) {
    goalkeeperState.diveTimer = Math.max(0, goalkeeperState.diveTimer - dt);
    const diveStrength = goalkeeperState.diveTimer > 0.2 ? 13.5 : 8.5;
    player.mesh.position.addScaledVector(goalkeeperState.diveDir, dt * diveStrength);
    player.mesh.rotation.z = THREE.MathUtils.lerp(player.mesh.rotation.z, -goalkeeperState.diveDir.x * 0.36, Math.min(1, dt * 14));
    player.setGoalkeeperDive(true, goalkeeperState.diveDir, THREE.MathUtils.clamp(goalkeeperState.diveTimer / 0.4, 0, 1));
  } else {
    player.mesh.rotation.z = THREE.MathUtils.lerp(player.mesh.rotation.z, 0, Math.min(1, dt * 8));
    player.setGoalkeeperDive(false);
  }

  if (goalkeeperState.holdingBall) {
    goalkeeperState.holdTimer += dt;
    setBallToKeeperHands();
    if (goalkeeperState.holdTimer >= localMatchSlot.keeperSettings.keeperHoldSeconds) {
      releaseGoalkeeperDistribution({ type: "KeyQ", hold: 0.75, falso: 0 });
    }
    updateKeeperHint();
    return;
  }

  if (!localMatchSlot.keeperSettings.goalkeepersEnabled || !zone.penalty) {
    updateKeeperHint();
    return;
  }

  const saveOrigin = tempVec1.copy(player.mesh.position).addScaledVector(getFlatFacing(), 0.56);
  if (goalkeeperState.diveTimer > 0) saveOrigin.addScaledVector(goalkeeperState.diveDir, 0.45);
  saveOrigin.y = 1.18;

  const ballPos = tempVec2.set(ball.body.position.x, ball.body.position.y, ball.body.position.z);
  const ballVel = tempVec3.set(ball.body.velocity.x, ball.body.velocity.y, ball.body.velocity.z);
  const dist = ballPos.distanceTo(saveOrigin);
  const ballHeightOkay = ballPos.y >= 0.12 && ballPos.y <= 2.85;
  const catchRadius = goalkeeperState.diveTimer > 0 ? 1.42 : 1.02;
  const deflectRadius = catchRadius + 0.34;
  const goalVector = tempVec4.set(getTeamMeta(localMatchSlot.team).defendX - ballPos.x, 0, -ballPos.z);
  const towardGoal = ballVel.lengthSq() < 0.01 || (goalVector.lengthSq() > 0.001 && tempVec5.copy(ballVel).setY(0).normalize().dot(goalVector.normalize()) > 0.1);

  if (ballHeightOkay && towardGoal && dist <= catchRadius && (catchModeActive || goalkeeperState.diveTimer > 0)) {
    if (ballVel.length() <= 18 || goalkeeperState.diveTimer <= 0.01) catchGoalkeeperBall();
    else deflectGoalkeeperBall();
  } else if (ballHeightOkay && goalkeeperState.diveTimer > 0 && dist <= deflectRadius) {
    deflectGoalkeeperBall();
  }

  updateKeeperHint();
}

function showStartLoading(show, text = "Avatar yuklenir...") {
  startLoading.textContent = text;
  startLoading.style.display = show ? "flex" : "none";
}

function showCelebrationHint(show, selected = null, preview = false) {
  if (!show && celebrationHintTimer) {
    clearTimeout(celebrationHintTimer);
    celebrationHintTimer = null;
  }
  if (show) {
    celebrationHint.textContent = selected
      ? preview
        ? `Secildi: ${selected}. ${CELEBRATION_LABELS[selected] || "Sevinc"}`
        : `${selected}. ${CELEBRATION_LABELS[selected] || "Sevinc"}  |  Deyis: 1-0`
      : "Qol sevincini sec: 1-0";
  }
  celebrationHint.style.display = show ? "block" : "none";
}

function previewCelebrationSelection(selected) {
  if (celebrationHintTimer) clearTimeout(celebrationHintTimer);
  showCelebrationHint(true, selected, true);
  celebrationHintTimer = setTimeout(() => {
    celebrationHintTimer = null;
    if (!player.isGoalCelebrating()) showCelebrationHint(false);
  }, 1400);
}

function updateScoreHud() {
  scoreHomeValue.textContent = String(homeScore);
  scoreAwayValue.textContent = String(awayScore);
}

function setScoreHudTime(text) {
  scoreTimeValue.textContent = text;
}

function resetScore() {
  homeScore = 0;
  awayScore = 0;
  updateScoreHud();
}

function addGoalForSide(side) {
  if (side === "left") homeScore += 1;
  else awayScore += 1;
  updateScoreHud();
}

function resetAfterGoal() {
  resetBallToKickoff();
  player.mesh.position.copy(mode === "room" ? localSpawnPoint : DEFAULT_SPAWN);
  goalCooldown = 1.1;
}

function localScoredNow() {
  if (mode !== "room") return true;
  const elapsed = performance.now() - (lastBallTouch.at || 0);
  return lastBallTouch.by === "local" && elapsed < 5200;
}

function runGoalCelebration(scoringSide) {
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);

  if (!localScoredNow()) {
    resetAfterGoal();
    return;
  }

  const dir = tempVec1.set(scoringSide === "left" ? 1 : -1, 0, 0);
  player.startGoalCelebration(dir, player.getGoalCelebrationDuration());
  showCelebrationHint(true, player.getSelectedGoalCelebrationStyle());
}

function checkGoal() {
  if (mode === "academy") {
    if (academy.isSimulationFrozen()) return;
    if (goalCooldown > 0) return;
    const bx = ball.body.position.x;
    const by = ball.body.position.y;
    const bz = ball.body.position.z;
    if (Math.abs(bz) > 4.25 || by > 3.05) return;

    if (bx > 44.7) {
      academy.handleGoal("right");
      goalCooldown = 0.8;
    } else if (bx < -44.7) {
      academy.handleGoal("left");
      goalCooldown = 0.8;
    }
    return;
  }

  if (mode === "room" && roomPhase !== "live") return;
  if (mode === "room" && remainingTime <= 0) return;
  if (player.isGoalCelebrating()) return;
  if (goalkeeperState.holdingBall) return;
  if (goalCooldown > 0) return;
  const bx = ball.body.position.x;
  const by = ball.body.position.y;
  const bz = ball.body.position.z;
  if (Math.abs(bz) > 4.25 || by > 3.05) return;

  if (bx > 44.7) {
    addGoalForSide("left");
    runGoalCelebration("left");
  } else if (bx < -44.7) {
    addGoalForSide("right");
    runGoalCelebration("right");
  }
}

function updateCelebrationCamera(dt) {
  const info = player.getGoalCelebrationInfo();
  if (!info.active) return false;

  const p = player.mesh.position;
  const dir = tempVec1.copy(info.dir).setY(0).normalize();
  const right = tempVec2.set(-dir.z, 0, dir.x);
  const phase = Math.min(1, info.time / Math.max(0.001, info.duration));
  const targetLook = tempLookTarget.set(p.x, p.y + 1.35, p.z);

  const desired = tempDesiredCamera;
  switch (info.style) {
    case 1:
      desired.copy(targetLook).addScaledVector(dir, -4.6 + phase * 1.2).addScaledVector(right, 1.6);
      desired.y = p.y + 1.1;
      break;
    case 2:
      desired.copy(targetLook).addScaledVector(dir, -5.4).addScaledVector(right, phase < 0.55 ? 0.9 : -0.9);
      desired.y = p.y + 1.9 + Math.sin(phase * Math.PI) * 0.8;
      break;
    case 3:
      desired.copy(targetLook).addScaledVector(dir, -2.4).addScaledVector(right, 2.4);
      desired.y = p.y + 1.8;
      break;
    case 4:
      desired.copy(targetLook).addScaledVector(dir, -3.2).addScaledVector(right, 3.6);
      desired.y = p.y + 2.15;
      break;
    case 5:
      desired.copy(targetLook).addScaledVector(dir, -2.1);
      desired.y = p.y + 1.75;
      break;
    case 6:
      desired.copy(targetLook).addScaledVector(dir, -3.6).addScaledVector(right, 3.1);
      desired.y = p.y + 1.6;
      break;
    case 7:
      desired.copy(targetLook).addScaledVector(dir, -2.45).addScaledVector(right, -1.9);
      desired.y = p.y + 1.75;
      break;
    case 8:
      desired.copy(targetLook).addScaledVector(dir, -2.9);
      desired.y = p.y + 1.45;
      break;
    case 9:
      desired.copy(targetLook)
        .addScaledVector(dir, -3.2 + Math.sin(info.time * 2.2) * 0.4)
        .addScaledVector(right, 2.2 * Math.sign(Math.sin(info.time * 6.4) || 1));
      desired.y = p.y + 1.85;
      break;
    case 10:
      desired.copy(targetLook).addScaledVector(dir, -1.5);
      desired.y = p.y + 1.62;
      break;
    default:
      if (phase < 0.33) {
        desired.copy(targetLook).addScaledVector(dir, -5.0).addScaledVector(right, 2.1);
        desired.y = p.y + 2.0;
      } else if (phase < 0.66) {
        const a = info.time * 0.95;
        desired.set(
          p.x + Math.cos(a) * 4.8,
          p.y + 2.35,
          p.z + Math.sin(a) * 4.8
        );
      } else {
        desired.copy(targetLook).addScaledVector(dir, 2.3).addScaledVector(right, -4.0);
        desired.y = p.y + 1.9;
      }
      break;
  }

  camera.position.lerp(desired, Math.min(1, dt * 3.4));
  camera.lookAt(targetLook);
  cameraValue.textContent = `Goal Cam ${info.style}`;
  return true;
}

function loadKaleModel() {
  fbxLoader.load(
    "/kale.fbx",
    (fbx) => {
      const forceVisibleMaterial = (sourceMat) => {
        const mat = new THREE.MeshStandardMaterial({
          color: sourceMat?.color ? sourceMat.color.clone() : new THREE.Color(0xf2f5f8),
          roughness: 0.42,
          metalness: 0.08,
          side: THREE.DoubleSide,
          transparent: false,
          opacity: 1,
          depthWrite: true,
        });
        return mat;
      };

      fbx.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          obj.frustumCulled = true;
          if (obj.geometry) {
            if (!obj.geometry.attributes?.normal) obj.geometry.computeVertexNormals();
            obj.geometry.computeBoundingSphere();
            obj.geometry.computeBoundingBox();
          }
          if (obj.material) {
            obj.material = Array.isArray(obj.material)
              ? obj.material.map((m) => forceVisibleMaterial(m))
              : forceVisibleMaterial(obj.material);
          } else {
            obj.material = forceVisibleMaterial(null);
          }
        }
      });

      const initialBox = new THREE.Box3().setFromObject(fbx);
      const initialSize = new THREE.Vector3();
      initialBox.getSize(initialSize);
      const sourceWidth = Math.max(initialSize.x, initialSize.z);
      const targetHeight = 4.4;
      const targetWidth = 12.8;
      const scaleByHeight = targetHeight / Math.max(0.001, initialSize.y);
      const scaleByWidth = targetWidth / Math.max(0.001, sourceWidth);
      const scale = Math.min(scaleByHeight, scaleByWidth);

      const createGoalModel = (side, rotY) => {
        const goal = fbx.clone(true);
        goal.scale.setScalar(scale);
        goal.rotation.y = rotY;

        // Normalize model pivot so random FBX offsets do not throw goal out of the field.
        const preBox = new THREE.Box3().setFromObject(goal);
        const preCenter = new THREE.Vector3();
        preBox.getCenter(preCenter);
        goal.position.sub(preCenter);

        let box = new THREE.Box3().setFromObject(goal);

        // Anchor each goal to the pitch goal-line exactly (x = -45 / x = 45).
        const centerZ = (box.min.z + box.max.z) * 0.5;
        goal.position.z += -centerZ;
        goal.position.y += -box.min.y;
        const inwardOffset = 0;
        if (side === "left") {
          goal.position.x += -45 - box.max.x + inwardOffset;
        } else {
          goal.position.x += 45 - box.min.x - inwardOffset;
        }
        box = new THREE.Box3().setFromObject(goal);
        freezeStaticObject(goal);
        scene.add(goal);
      };

      fallbackGoals.forEach((g) => {
        g.visible = false;
      });
      createGoalModel("left", 0);
      createGoalModel("right", Math.PI);
    },
    undefined,
    () => {
      fallbackGoals.forEach((g) => {
        g.visible = true;
      });
    }
  );
}

function leaveRoomSession() {
  clearRemotePlayers();
  isRoomHost = false;
  myPlayerId = socket?.id || null;
  networkSendTimer = 0;
  roomPhase = "lobby";
  roomMatchStartAt = 0;
  roomMatchDuration = 0;
  localReady = false;
  roomRoster.clear();
  readyStats = { ready: 0, total: 0 };
  lobbyPanel.style.display = "none";
  localMatchSlot = {
    team: "blue",
    role: "field",
    keeperSettings: { ...DEFAULT_KEEPER_SETTINGS },
  };
  player.isGoalkeeper = false;
  localSpawnPoint.set(0, 0, 2);
  resetGoalkeeperState();
}

function formatTime(seconds) {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function returnToMenu() {
  rematchOverlay.style.display = "none";
  academy.stopSession();
  if (mode === "room" && socket?.connected) socket.disconnect();
  leaveRoomSession();
  menu.show();
  setMode("menu");
}

function setMode(newMode) {
  mode = newMode;
  skillDuel.setMode(newMode);
  if (mode === "menu") {
    hud.style.display = "none";
    statusHud.style.display = "none";
    scoreHud.style.display = "none";
    showCelebrationHint(false);
    keeperHint.style.display = "none";
    lobbyPanel.style.display = "none";
    modeValue.textContent = "MENU";
    timerValue.textContent = "--:--";
    setScoreHudTime("--:--");
    return;
  }

  hud.style.display = "grid";
  statusHud.style.display = "grid";
  scoreHud.style.display = mode === "academy" ? "none" : "grid";

  if (mode === "training") {
    modeValue.textContent = "TRAINING";
    timerValue.textContent = "No limit";
    setScoreHudTime("--:--");
    keeperHint.style.display = "none";
  }
  if (mode === "academy") {
    modeValue.textContent = "ACADEMY";
    timerValue.textContent = "--:--";
    setScoreHudTime("--:--");
    keeperHint.style.display = "none";
  }
  if (mode === "room") {
    syncRoomHud();
  }
}

function syncRoomHud() {
  if (mode !== "room") return;
  const teamMeta = getTeamMeta(localMatchSlot.team);
  const roleLabel = localMatchSlot.role === "goalkeeper" ? "GK" : "FP";
  const phaseLabel = roomPhase === "live" ? "" : roomPhase === "lobby" ? " | LOBBY" : " | ROOM END";
  modeValue.textContent = `ROOM ${roomCode || "--"} | ${teamMeta.label} ${roleLabel}${phaseLabel}`;
  if (roomPhase === "live") {
    timerValue.textContent = formatTime(remainingTime);
    setScoreHudTime(formatTime(remainingTime));
  } else {
    timerValue.textContent = "LOBBY";
    setScoreHudTime("LOBBY");
  }
  updateLobbyPanel();
}

function updateLobbyPanel() {
  if (mode === "room" && roomPhase === "lobby") {
    lobbyPanel.style.display = "grid";
    if (lobbyCode) lobbyCode.textContent = `ROOM ${roomCode || "--"}`;
    if (lobbyReadyStats) lobbyReadyStats.textContent = `Hazir: ${readyStats.ready}/${readyStats.total}`;
    if (isRoomHost) {
      if (lobbyStatus) lobbyStatus.textContent = "Sen host-san. Maci baslada bilersen.";
      if (lobbyHostRow) lobbyHostRow.style.display = "flex";
    } else {
      if (lobbyStatus) lobbyStatus.textContent = "Host maci basladana qeder gozle.";
      if (lobbyHostRow) lobbyHostRow.style.display = "none";
    }

    if (lobbyTeam && lobbyRole) {
      if (!lobbyTeam.options.length) {
        lobbyTeam.innerHTML = `
          <option value="blue">Mavi</option>
          <option value="red">Qirmizi</option>
        `;
      }
      if (!lobbyRole.options.length) {
        lobbyRole.innerHTML = `
          <option value="field">Oyuncu</option>
          <option value="goalkeeper">Qapici</option>
        `;
      }
      lobbyTeam.value = localMatchSlot.team;
      lobbyRole.value = localMatchSlot.role;
      lobbyTeam.disabled = false;
      lobbyRole.disabled = false;
    }

    if (lobbyReadyBtn) {
      lobbyReadyBtn.textContent = localReady ? "Hazir" : "Hazir Deyil";
      lobbyReadyBtn.style.background = localReady ? "rgba(73, 209, 125, 0.45)" : "rgba(255,255,255,0.12)";
    }

    if (lobbyStartBtn) {
      const allReady = readyStats.total > 0 && readyStats.ready >= readyStats.total;
      lobbyStartBtn.disabled = !allReady && readyStats.total > 1;
      lobbyStartBtn.style.opacity = lobbyStartBtn.disabled ? "0.55" : "1";
      lobbyStartBtn.style.cursor = lobbyStartBtn.disabled ? "not-allowed" : "pointer";
    }
  } else {
    lobbyPanel.style.display = "none";
  }
}

function setRosterFromPayload(players = {}) {
  roomRoster.clear();
  Object.keys(players || {}).forEach((id) => {
    roomRoster.set(id, { ...players[id] });
  });
  updateReadyStatsFromRoster();
}

function updateReadyStatsFromRoster() {
  let ready = 0;
  let total = 0;
  roomRoster.forEach((player) => {
    total += 1;
    if (player?.ready) ready += 1;
  });
  readyStats = { ready, total };
  updateLobbyPanel();
}

function setRoomPhase(nextPhase, payload = {}) {
  const wasLive = roomPhase === "live";
  roomPhase = nextPhase || "lobby";

  if (roomPhase === "live") {
    const matchTime = Number(payload.matchTime || payload.matchMinutes || payload.durationMinutes || 0) || (roomMatchDuration / 60) || 10;
    roomMatchDuration = matchTime * 60;
    roomMatchStartAt = Number(payload.startedAt || payload.startAt || Date.now());
    remainingTime = Math.max(0, roomMatchDuration - (Date.now() - roomMatchStartAt) / 1000);
    if (!wasLive && !payload.skipReset) {
      resetScore();
      resetBallToKickoff();
    }
  } else {
    if (payload.matchTime) roomMatchDuration = Number(payload.matchTime) * 60;
    roomMatchStartAt = 0;
  }

  syncRoomHud();
}

function resetBallToKickoff() {
  player.resetSkillState();
  player.slideState.active = false;
  player.slideState.time = 0;
  player.kickAnim = 0;
  player.kickStyle = "shot";
  resetGoalkeeperState();
  if (mode === "room" && localMatchSlot.role === "goalkeeper" && localMatchSlot.keeperSettings.keeperCatchMode === "toggle") {
    goalkeeperState.catchMode = true;
  }
  ball.body.position.set(0, 0.22, 0);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
  ballOwnerId = null;
  lastBallSyncAt = performance.now();
}

function callBallToFeet(syncNetwork = false) {
  const target = tempVec1.copy(player.mesh.position).addScaledVector(getFlatFacing(), 1.0);
  ball.body.position.set(target.x, 0.22, target.z);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
  ballOwnerId = null;
  lastBallSyncAt = performance.now();
  if (syncNetwork && socket?.connected) {
    socket.emit("callBall", { x: target.x, y: 0.22, z: target.z });
  }
}

if (socket) {
  socket.on("connect", () => {
    myPlayerId = socket.id;
  });

  socket.on("disconnect", () => {
    if (mode === "room") {
      returnToMenu();
    }
  });

  socket.on("roomJoined", (payload) => {
    myPlayerId = payload.playerId;
    roomCode = payload.code;
    isRoomHost = !!payload.isHost;
    roomSettings = { ...roomSettings, ...(payload.settings || {}) };
    const matchTime = roomSettings.matchTime || 10;
    roomMatchDuration = matchTime * 60;
    remainingTime = roomMatchDuration;
    clearRemotePlayers();

    const players = payload.players || {};
    applyLocalRoomAssignment(players[myPlayerId] || {}, payload.settings || {});
    setRosterFromPayload(players);
    localReady = roomRoster.get(myPlayerId)?.ready || false;
    if (payload.readyStats) readyStats = payload.readyStats;
    if (payload.ball) {
      ball.body.position.set(payload.ball.x ?? 0, payload.ball.y ?? 0.22, payload.ball.z ?? 0);
      ball.body.velocity.set(payload.ball.vx ?? 0, payload.ball.vy ?? 0, payload.ball.vz ?? 0);
      ball.body.angularVelocity.set(0, 0, 0);
      ball.mesh.position.copy(ball.body.position);
      ball.mesh.quaternion.copy(ball.body.quaternion);
    }
    ballOwnerId = payload.ballOwner || null;
    lastBallSyncAt = performance.now();
    Object.keys(players).forEach((id) => {
      if (id !== myPlayerId) upsertRemotePlayer(id, players[id]);
    });

    menu.hide();
    rematchOverlay.style.display = "none";
    setMode("room");
    if (payload.match) {
      setRoomPhase(payload.match.state || "lobby", {
        startedAt: payload.match.startedAt,
        matchTime,
        skipReset: true,
      });
    } else {
      setRoomPhase("lobby", { matchTime, skipReset: true });
    }
  });

  socket.on("playerJoined", (data) => {
    upsertRemotePlayer(data.id, data.player);
    roomRoster.set(data.id, { ...(data.player || {}) });
    updateReadyStatsFromRoster();
  });

  socket.on("playerMoved", (data) => {
    upsertRemotePlayer(data.id, data);
  });

  socket.on("playerLeft", (data) => {
    removeRemotePlayer(data.id);
    roomRoster.delete(data.id);
    updateReadyStatsFromRoster();
  });

  socket.on("hostChanged", (data) => {
    isRoomHost = data.newHostId === myPlayerId;
    updateLobbyPanel();
  });

  socket.on("playerReady", (data = {}) => {
    const entry = roomRoster.get(data.id) || {};
    entry.ready = !!data.ready;
    roomRoster.set(data.id, entry);
    if (data.id === myPlayerId) localReady = !!data.ready;
    if (data.readyStats) readyStats = data.readyStats;
    updateLobbyPanel();
  });

  socket.on("playerSlotChanged", (data = {}) => {
    const playerData = data.player || {};
    roomRoster.set(data.id, { ...playerData });
    if (data.id === myPlayerId) {
      applyLocalRoomAssignment(playerData, roomSettings);
      localReady = !!playerData.ready;
    } else {
      upsertRemotePlayer(data.id, playerData);
    }
    if (data.readyStats) readyStats = data.readyStats;
    updateLobbyPanel();
  });

  socket.on("readyStats", (data = {}) => {
    readyStats = { ready: data.ready || 0, total: data.total || 0 };
    updateLobbyPanel();
  });

  socket.on("roomState", (data = {}) => {
    if (mode !== "room") return;
    setRoomPhase(data.state || "lobby", {
      startedAt: data.startedAt,
      matchTime: data.matchTime,
    });
    if (data.state === "lobby") {
      rematchOverlay.style.display = "none";
    }
  });

  socket.on("ballCalled", (data = {}) => {
    if (mode !== "room" || roomPhase !== "lobby") return;
    if (!ball?.body) return;
    ball.body.position.set(data.x || 0, data.y || 0.22, data.z || 0);
    ball.body.velocity.set(0, 0, 0);
    ball.body.angularVelocity.set(0, 0, 0);
    ballOwnerId = null;
    lastBallSyncAt = performance.now();
  });

  socket.on("ballSync", (ballDataSync) => {
    if (mode !== "room") return;
    if (Object.prototype.hasOwnProperty.call(ballDataSync, "ownerId")) {
      ballOwnerId = ballDataSync.ownerId;
    }
    lastBallSyncAt = performance.now();
    if (ballOwnerId && ballOwnerId === myPlayerId) return;
    if (goalkeeperState.holdingBall) return;
    ball.body.position.set(ballDataSync.x, ballDataSync.y, ballDataSync.z);
    ball.body.velocity.set(ballDataSync.vx, ballDataSync.vy, ballDataSync.vz);
  });

  socket.on("ballKicked", (data) => {
    if (data.playerId === myPlayerId || mode !== "room") return;
    lastBallTouch = { by: "remote", at: performance.now() };
    ballOwnerId = null;
    lastBallSyncAt = performance.now();
    if (data.position) {
      ball.body.position.set(data.position.x, data.position.y, data.position.z);
    }
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
    alert(msg || "Otaq xÉ™tasÄ±");
    returnToMenu();
  });
}

menu.onStartTraining = async (state) => {
  audio.ensureStarted();
  audio.setVolumes(state);
  lastGameState = state;

  showStartLoading(true, "Lokal oyunçu yuklenir...");
  showCelebrationHint(false);
  await ensureCustomPlayer();
  academy.stopSession();
  leaveRoomSession();
  player.mesh.position.set(0, 0, 2);
  resetBallToKickoff();
  resetScore();
  if (skillDuel.isTrainingEnabled()) skillDuel.resetPositions(true);

  menu.hide();
  roomCode = "";
  remainingTime = 0;
  rematchOverlay.style.display = "none";
  setMode("training");
  showStartLoading(false);
};

menu.onStartRoomMatch = async (state) => {
  audio.ensureStarted();
  audio.setVolumes(state);
  lastGameState = state;

  showStartLoading(true, "Lokal oyunçu yuklenir...");
  showCelebrationHint(false);
  await ensureCustomPlayer();
  academy.stopSession();
  player.mesh.position.set(0, 0, 2);
  resetBallToKickoff();
  resetScore();

  roomCode = state.room?.code || state.roomCode || "ROOM";
  remainingTime = (state.room?.matchTime || state.matchTime || 10) * 60;
  pendingRoomAction = state.roomAction || (state.room?.createdAt ? "create" : "join");
  leaveRoomSession();

  rematchOverlay.style.display = "none";
  if (!socket) {
    alert("Socket baÄŸlantÄ±sÄ± tapÄ±lmadÄ±.");
    showStartLoading(false);
    return;
  }

  if (!socket.connected) socket.connect();
  const payload = {
    code: roomCode,
    teamSize: state.teamSize,
    matchTime: state.matchTime,
    password: state.roomPassword || "",
    preferredTeam: state.preferredTeam,
    preferredRole: state.preferredRole,
    goalkeepersEnabled: state.goalkeepersEnabled,
    goalSweeper: state.goalSweeper,
    keeperCatchMode: state.keeperCatchMode,
    keeperDiveAssist: state.keeperDiveAssist,
    keeperHoldSeconds: state.keeperHoldSeconds,
    keeperDistribution: state.keeperDistribution,
    nickname: state.nickname || "Oyuncu",
    avatar: state.avatar || {},
  };

  if (pendingRoomAction === "create") {
    socket.emit("createRoom", payload);
  } else {
    socket.emit("joinRoom", payload);
  }
  showStartLoading(false);
};

menu.onStartAcademy = async (state) => {
  audio.ensureStarted();
  audio.setVolumes(state);
  lastGameState = state;

  showStartLoading(true, "Academy sessiyasi yuklenir...");
  showCelebrationHint(false);
  await ensureCustomPlayer();
  leaveRoomSession();
  academy.startDrill(state.academyDrillId);
  resetScore();

  menu.hide();
  roomCode = "";
  remainingTime = 0;
  rematchOverlay.style.display = "none";
  setMode("academy");
  showStartLoading(false);
};

rematchBtn.onclick = () => {
  if (lastGameState) {
    if (mode === "room") {
      menu.onStartRoomMatch(lastGameState);
    } else if (mode === "academy") {
      menu.onStartAcademy(lastGameState);
    } else {
      menu.onStartTraining(lastGameState);
    }
  }
};

exitToMenuBtn.onclick = () => {
  returnToMenu();
};

player.onStamina = (ratio) => {
  sprintFill.style.width = `${Math.round(ratio * 100)}%`;
};

player.onCameraMode = (modeName) => {
  cameraValue.textContent = modeName === "thirdPerson" ? "Third Person" : "Isometric";
};

player.onChargeStart = (label) => {
  powerWrap.style.display = "block";
  powerLabel.textContent = goalkeeperState.holdingBall ? "Qapici paylamasi" : label;
  powerFill.style.width = "0%";
};

player.onChargeUpdate = (ratio, label) => {
  powerLabel.textContent = goalkeeperState.holdingBall ? "Qapici paylamasi" : label;
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
  if (player.isGoalCelebrating()) return;
  if (goalkeeperState.holdingBall) {
    releaseGoalkeeperDistribution(charge);
    return;
  }
  lastBallTouch = { by: "local", at: performance.now() };
  if (charge.type === "KeyQ") player.triggerKick("pass", "longPass");
  else if (charge.type === "KeyE") player.triggerKick("pass", "shortPass");
  else player.triggerKick("shot", "shot");
  const p = Math.min(1, charge.hold / 1.3);
  // REMATCH Style: shoot where the camera is looking
  const forward = player.getAimDir();
  const right = tempVec1.set(-forward.z, 0, forward.x);

  const ballPos = tempVec2.set(ball.body.position.x, ball.body.position.y, ball.body.position.z);
  const nearFoot = tempVec3.copy(player.mesh.position).addScaledVector(forward, 0.7);
  const toBall = tempVec4.copy(ballPos).sub(nearFoot);

  if (toBall.length() > 3.5) return; // Increased range for better reliability

  let speed = 0;
  let lift = 0;
  let sfxType = "pass";

  if (charge.type === "Space") {
    // Shot
    speed = THREE.MathUtils.lerp(10, 32, p);
    lift = THREE.MathUtils.lerp(1.5, 9, p * p);
    sfxType = "shot";

    // "Ã‡ox basanda qapÄ±ya yox Ã§Ã¶llÃ¼yÉ™ gedÉ™ bilÉ™r"
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
    ballOwnerId = null;
    lastBallSyncAt = performance.now();
    socket.emit("ballKick", {
      position: { x: ball.body.position.x, y: ball.body.position.y, z: ball.body.position.z },
      velocity: { x: vx, y: vy, z: vz },
      angularVelocity: {
        x: ball.body.angularVelocity.x,
        y: ball.body.angularVelocity.y,
        z: ball.body.angularVelocity.z,
      },
    });
  }

  if (mode === "academy") {
    academy.noteKick({
      type: charge.type,
      hold: charge.hold,
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

function attemptBicycleKick() {
  if (mode !== "training" && mode !== "room") return false;
  if (player.isGoalCelebrating() || goalkeeperState.holdingBall) return false;
  if (player.isSkillActive() || player.isSliding()) return false;

  const aim = player.getAimDir();
  const right = tempVec1.set(-aim.z, 0, aim.x);
  const ballPos = tempVec2.set(ball.body.position.x, ball.body.position.y, ball.body.position.z);
  const playerPos = player.mesh.position;
  const toBall = tempVec3.copy(ballPos).sub(playerPos);
  const flat = tempVec4.copy(toBall).setY(0);

  if (flat.length() > 2.4) return false;
  if (toBall.y > 1.8) return false;
  if (flat.lengthSq() > 0.0001 && flat.normalize().dot(aim) < -0.25) return false;
  if (!player.triggerBicycleKick()) return false;

  lastBallTouch = { by: "local", at: performance.now() };
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);

  const strikeDir = tempVec5.copy(aim).addScaledVector(right, player.spinInput * 0.12).normalize();
  const speed = ballPos.y > 0.8 ? 24.5 : 21.5;
  const lift = ballPos.y > 0.8 ? 11.2 : 8.8;
  ball.body.velocity.set(strikeDir.x * speed, lift, strikeDir.z * speed);
  ball.body.angularVelocity.set(right.x * 7.2, player.spinInput * 2.8, right.z * 7.2);

  if (mode === "room" && socket?.connected) {
    ballOwnerId = null;
    lastBallSyncAt = performance.now();
    socket.emit("ballKick", {
      position: { x: ball.body.position.x, y: ball.body.position.y, z: ball.body.position.z },
      velocity: {
        x: ball.body.velocity.x,
        y: ball.body.velocity.y,
        z: ball.body.velocity.z,
      },
      angularVelocity: {
        x: ball.body.angularVelocity.x,
        y: ball.body.angularVelocity.y,
        z: ball.body.angularVelocity.z,
      },
    });
  }

  audio.kick("shot");
  return true;
}

window.addEventListener("keydown", (e) => {
  if ((mode === "training" || mode === "room") && !player.keys.KeyC && /^Digit([1-9]|0)$/.test(e.code)) {
    const index = e.code === "Digit0" ? 10 : Number(e.code.replace("Digit", ""));
    player.setGoalCelebrationStyle(index);
    if (player.isGoalCelebrating()) showCelebrationHint(true, index);
    else previewCelebrationSelection(index);
    e.preventDefault();
    return;
  }

  if (mode === "menu") {
    if (e.code === "Enter") audio.ensureStarted();
    return;
  }

  if (e.code === "Escape") {
    returnToMenu();
    return;
  }

  if (mode === "room" && localMatchSlot.role === "goalkeeper") {
    if ((e.code === "AltLeft" || e.code === "AltRight") && localMatchSlot.keeperSettings.keeperCatchMode === "toggle") {
      goalkeeperState.catchMode = !goalkeeperState.catchMode;
      updateKeeperHint();
      e.preventDefault();
      return;
    }
    if (e.code === "KeyF") {
      triggerGoalkeeperDive();
      e.preventDefault();
      return;
    }
  }

  if ((mode === "training" || mode === "room") && e.code === "KeyF") {
    if (player.triggerSlideTackle()) {
      e.preventDefault();
      return;
    }
  }

  if ((mode === "training" || mode === "room") && e.code === "KeyP") {
    if (attemptBicycleKick()) {
      e.preventDefault();
      return;
    }
  }

  if ((mode === "training" || mode === "academy" || (mode === "room" && roomPhase === "lobby")) && e.code === "KeyR") {
    player.resetSkillState();
    player.slideState.active = false;
    player.slideState.time = 0;
    player.kickAnim = 0;
    player.kickStyle = "shot";
    if (mode === "academy") {
      academy.quickReset();
    } else if (mode === "room") {
      callBallToFeet(true);
    } else {
      callBallToFeet(false);
      skillDuel.resetPositions(true);
    }
  }

  if (mode === "training" && e.code === "KeyT") {
    skillDuel.toggleTrainingEnabled();
    if (skillDuel.isTrainingEnabled()) skillDuel.resetPositions(true);
  }
});

const clock = new THREE.Clock();
loadKaleModel();
updateScoreHud();
setMode("menu");

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, clock.getDelta());
  const elapsed = clock.elapsedTime;
  performanceDirector.beginFrame();

  cacheRemoteAnimClips();
  if (window.game) {
    window.game.mode = mode;
    window.game.ballOwnerId = ballOwnerId;
    window.game.myPlayerId = myPlayerId;
    window.game.lastBallSyncAt = lastBallSyncAt;
  }

  physics.updateVisuals?.(dt, elapsed);

  if (mode === "training" || mode === "room" || mode === "academy") {
    goalCooldown = Math.max(0, goalCooldown - dt);
    const academyFrozen = mode === "academy" && academy.isSimulationFrozen();
    let celebrationCam = false;

    if (!academyFrozen) {
      // 1. Run physics simulation first
      physics.step(dt);

      // 2. Move the player (or goal celebration state)
      player.update(dt);
      skillDuel.update(dt, elapsed, { mode, frozen: false });
      if (mode === "room") updateGoalkeeperSystem(dt);
      const goalCamActive = updateCelebrationCamera(dt);
      celebrationCam = goalCamActive;

      // 3. RE-SYNC ball mesh to ball body AFTER dribbling override
      //    This is critical: physics.step synced mesh<-body, but then
      //    applyDribbling changed body.position. We must update mesh again.
      ball.mesh.position.copy(ball.body.position);
      ball.mesh.quaternion.copy(ball.body.quaternion);

      // 4. Magnus effect for curve shots (only when ball is free / kicked)
      const vel = tempVec1.set(ball.body.velocity.x, ball.body.velocity.y, ball.body.velocity.z);
      const spinY = ball.body.angularVelocity.y;

      if (Math.abs(spinY) > 0.1 && vel.lengthSq() > 0.2) {
        const side = tempVec2.set(0, spinY, 0).cross(vel).multiplyScalar(0.0008);
        ball.body.velocity.x += side.x;
        ball.body.velocity.z += side.z;
      }
    } else {
      skillDuel.update(dt, elapsed, { mode, frozen: true });
      ball.mesh.position.copy(ball.body.position);
      ball.mesh.quaternion.copy(ball.body.quaternion);
    }

    for (const remote of remotePlayers.values()) {
      remote.mesh.position.lerp(remote.targetPos, Math.min(1, dt * 12));
      const rotDiff = remote.targetRot - remote.mesh.rotation.y;
      remote.mesh.rotation.y += rotDiff * Math.min(1, dt * 12);
      if (!remote.animMixer && remote.mesh.userData.isCustomModel) attachRemoteAnimations(remote);
      if (remote.animMixer && remote.animActions) {
        const speed = remote.velocity ? remote.velocity.length() : 0;
        const moving = speed > 0.25;
        const sprinting = speed > 13.0;
        let target = "idle";
        if (moving && remote.animActions.dribble) target = "dribble";
        if (sprinting && remote.animActions.sprint) target = "sprint";
        if (target !== remote.animState) {
          const prev = remote.animActions[remote.animState];
          const next = remote.animActions[target];
          if (next) {
            next.reset();
            next.fadeIn(0.15);
            next.play();
          }
          if (prev) prev.fadeOut(0.15);
          remote.animState = target;
        }
        remote.animMixer.update(dt);
      }
    }

    if (mode === "room") {
      networkSendTimer += dt;
      if (socket?.connected && networkSendTimer >= 0.033) {
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
          team: localMatchSlot.team,
          role: localMatchSlot.role,
          animState: {},
        });

        const now = performance.now();
        const ownerStale = !ballOwnerId || now - lastBallSyncAt > BALL_OWNER_TIMEOUT_MS;
        const hasRemoteOwner = ballOwnerId && ballOwnerId !== myPlayerId;
        const holdingBall = goalkeeperState.holdingBall;
        const localBallAuthority = holdingBall ||
          player.mesh.position.distanceTo(ball.mesh.position) < 2.6 ||
          (lastBallTouch.by === "local" && now - lastBallTouch.at < 900);
        if (localBallAuthority && (holdingBall || !hasRemoteOwner || ownerStale)) {
          if (!ballOwnerId || ownerStale || holdingBall) {
            ballOwnerId = myPlayerId;
            lastBallSyncAt = now;
          }
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

      if (roomPhase === "live") {
        remainingTime = Math.max(0, roomMatchDuration - (Date.now() - roomMatchStartAt) / 1000);
        timerValue.textContent = formatTime(remainingTime);
        setScoreHudTime(formatTime(remainingTime));
        if (remainingTime <= 0) {
          remainingTime = 0;
          if (isRoomHost && socket?.connected) {
            socket.emit("endMatch");
          }
        }
      } else {
        timerValue.textContent = "LOBBY";
        setScoreHudTime("LOBBY");
      }
    } else if (mode === "academy") {
      academy.update(dt, elapsed);
      if (!celebrationCam) {
        cameraValue.textContent = player.mode === "thirdPerson" ? "Third Person" : "Isometric";
      }
    } else if (!celebrationCam) {
      cameraValue.textContent = player.mode === "thirdPerson" ? "Third Person" : "Isometric";
    }

    checkGoal();
  }

  renderer.render(scene, camera);
  performanceDirector.update(dt);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  performanceDirector.applyProfile(performanceDirector.profileName);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  clock.getDelta();
  performanceDirector.noteResume();
});



