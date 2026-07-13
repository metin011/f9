import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "https://unpkg.com/three@0.165.0/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "https://unpkg.com/three@0.165.0/examples/jsm/utils/SkeletonUtils.js";
import {
  SKILL_CLIP_SOURCES,
  SKILL_DESCRIPTORS,
  getSkillBySlot,
  isArcSkill,
  isNutmegSkill,
} from "./SkillData.js?v=20260308-1";

const RPM_ONE_SHOT_ACTIONS = new Set([
  "kickShot",
  "kickBicycle",
  ...SKILL_DESCRIPTORS.map((descriptor) => descriptor.animation.clipName),
]);

const RPM_SKILL_ACTIONS = new Set(SKILL_DESCRIPTORS.map((descriptor) => descriptor.animation.clipName));
const RPM_MISSING_CLIP_LOGS = new Set();

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(min, max, value) {
  const t = clamp01((value - min) / Math.max(0.0001, max - min));
  return t * t * (3 - 2 * t);
}

function bezierPoint(out, a, b, c, t) {
  const inv = 1 - t;
  out.copy(a).multiplyScalar(inv * inv);
  out.addScaledVector(b, 2 * inv * t);
  out.addScaledVector(c, t * t);
  return out;
}

const KIT_PRESETS = {
  "Solar Pulse": { primary: 0xffb000, sleeve: 0xff8d2d, trim: 0x121826, sock: 0xfff3d4 },
  "Night Shift": { primary: 0x0f1524, sleeve: 0x1d3c68, trim: 0x78d6ff, sock: 0x101827 },
  "Crimson Edge": { primary: 0x9f1630, sleeve: 0xce294a, trim: 0xf5ecf1, sock: 0x5b1020 },
  Bosphorus: { primary: 0x103d73, sleeve: 0x2d76c9, trim: 0xcbeaff, sock: 0x153a64 },
  "Emerald Grid": { primary: 0x0d4d3e, sleeve: 0x11a87f, trim: 0xdefcf3, sock: 0x0a4335 },
  "Royal Signal": { primary: 0x2940b8, sleeve: 0x5c79ff, trim: 0xf4f7ff, sock: 0x1c2f95 },
  "Lava Strike": { primary: 0xff6d19, sleeve: 0xffb000, trim: 0x1b160f, sock: 0x8a3500 },
  "Frost Line": { primary: 0xf6fbff, sleeve: 0xbfdcff, trim: 0x5a84d8, sock: 0xe6f1ff },
  "Violet Riot": { primary: 0x331a6d, sleeve: 0x7142ff, trim: 0xefe5ff, sock: 0x231149 },
  "Carbon Volt": { primary: 0x171a21, sleeve: 0x272d36, trim: 0x9dff30, sock: 0x1b1f26 },
  "Sunset Coral": { primary: 0xff765f, sleeve: 0xffb48f, trim: 0xfff6e8, sock: 0xff8e72 },
  "Atlas White": { primary: 0xf7f8fc, sleeve: 0xd6dbe6, trim: 0xc7a252, sock: 0xffffff },
  "Real Madrid": { primary: 0xf4f6fb, sleeve: 0xe9edf8, trim: 0xf0be3f, sock: 0xffffff },
  Barcelona: { primary: 0x1c3f9b, sleeve: 0x17327f, trim: 0xb7132f, sock: 0x263f9b },
  Galatasaray: { primary: 0x9c1326, sleeve: 0x76101d, trim: 0xf0b400, sock: 0xf0b400 },
  Fenerbahce: { primary: 0x0f1f5a, sleeve: 0x101a47, trim: 0xf2cd2f, sock: 0xf2cd2f },
  Besiktas: { primary: 0xf5f5f5, sleeve: 0xdfdfdf, trim: 0x1b1b1b, sock: 0xffffff },
  "Man City": { primary: 0x6fb8ff, sleeve: 0x57a7f4, trim: 0xffffff, sock: 0x9fd3ff },
  Liverpool: { primary: 0xa10f24, sleeve: 0x810b1d, trim: 0xf0f0f0, sock: 0xa10f24 },
  Rematch: { primary: 0xff4500, sleeve: 0xff5e1a, trim: 0xffffff, sock: 0x333333 },
};

const BOOT_PRESETS = {
  "Inferno Red": 0xff3347,
  "Mercurial Red": 0xff2f43,
  "Phantom Black": 0x111111,
  "Predator Blue": 0x2f8eff,
  "Tiempo Gold": 0xffbf1f,
  "Future Green": 0x28c77a,
  "Ice Silver": 0xe3edf8,
  "Volt Lime": 0xb0ff1e,
  "Berry Flash": 0xce2fff,
  "Storm Orange": 0xff7a18,
  "Ocean Mint": 0x56efd0,
  "Rose Chrome": 0xff8fb0,
  "Pure White": 0xffffff,
  "Rematch Elite": 0xff5e1a,
};

const CUSTOM_PLAYER_DIR = "/Oyuncu ve Animasyonları";
const CUSTOM_PLAYER_ANIMS = {
  idle: `${CUSTOM_PLAYER_DIR}/Normal  topsuz yürüme.fbx`,
  dribble: `${CUSTOM_PLAYER_DIR}/top sürerken dribling.fbx`,
  sprint: `${CUSTOM_PLAYER_DIR}/Shift basılıyken koşma.fbx`,
};

const RPM_ANIM_SOURCES = {
  idle: CUSTOM_PLAYER_ANIMS.idle,
  dribble: CUSTOM_PLAYER_ANIMS.dribble,
  sprint: CUSTOM_PLAYER_ANIMS.sprint,
  jogBack: "/animasyonlar/jog_back.fbx",
  kickShot: "/animasyonlar/shot.fbx",
  kickBicycle: "/animasyonlar/bicycle_kick.fbx",
  ...SKILL_CLIP_SOURCES,
};

const GOAL_CELEBRATION_DURATIONS = {
  1: 4.4,
  2: 4.2,
  3: 3.7,
  4: 3.4,
  5: 4.1,
  6: 4.5,
  7: 3.9,
  8: 4.2,
  9: 4.0,
  10: 4.1,
};

export class Player {
  constructor(scene, camera, physics) {
    this.scene = scene;
    this.camera = camera;
    this.physics = physics;

    this.keys = {};
    this.mode = "thirdPerson";
    this.rpmOnly = false;

    this.walkSpeed = 10.5;
    this.sprintSpeed = 16.5;
    this.turnSpeed = 18.0;
    this.cameraTurnSpeed = 6.0;
    this.dribbleRange = 1.6;
    this.dribbleForce = 35.0;
    this.velocity = new THREE.Vector3();
    this.moveDir = new THREE.Vector3();

    this.maxStamina = 100;
    this.stamina = 100;
    this.sprintDrain = 24;
    this.staminaRegen = 15;
    this.sprintCooldown = 0;

    this.charge = null;
    this.falso = 0; // Curve value: positive for inside, negative for trivela
    this.falsoType = null; // 'L' or 'K'
    this.spinInput = 0;
    this.skillState = {
      cHeld: false,
      trigger: null,
      lockUntil: 0,
      active: null,
    };
    this.skillContext = null;
    this.onSkillEvent = null;
    this.skillAttemptSerial = 0;
    this.exitBoost = {
      timeLeft: 0,
      multiplier: 1,
      direction: new THREE.Vector3(),
    };
    this.slideState = {
      active: false,
      time: 0,
      duration: 0.62,
      cooldown: 0,
      direction: new THREE.Vector3(),
      leadSide: "right",
      hitBall: false,
    };
    this.runTime = 0;
    this.kickAnim = 0;
    this.kickStyle = "shot";
    this.kickVariant = "shot";
    this.lastKickTime = 0; // Prevent immediate re-pick after shot
    this.turnLean = 0;
    this.dribbleBlend = 0;
    this.animStyle = "idle";
    this.scissorBlend = 0;
    this.strikeBlend = 0;
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.customModel = null;
    this.customModelPath = null;
    this.customTexturePath = null;
    this.rpmAvatar = null;
    this.rpmRig = null;
    this.rpmBaseRot = new Map();
    this.rpmMixer = null;
    this.rpmActions = {};
    this.rpmCurrentAction = null;
    this.rpmCurrentActionName = null;
    this.rpmAnimReady = false;
    this.rpmAnimYawOffset = 0;
    this.rpmAnimYawHipsName = "Hips";
    this.useDirectFbxClips = false;
    this.pendingRpmKick = false;
    this.pendingRpmKickName = "kickShot";
    this.pendingRpmSkillName = null;
    this.rpmAnimToken = 0;
    this.rpmLoadToken = 0;
    this.performanceProfile = "high";
    this.cameraDistanceBase = 6.8;
    this.cameraHeightBase = 3.8;
    this.lastCameraFov = camera.fov;
    this.tempCamFwd = new THREE.Vector3();
    this.tempCamRight = new THREE.Vector3();
    this.tempDesiredVelocity = new THREE.Vector3();
    this.tempAimDir = new THREE.Vector3();
    this.tempBallPos = new THREE.Vector3();
    this.tempFacing = new THREE.Vector3();
    this.tempDriveDir = new THREE.Vector3();
    this.tempSide = new THREE.Vector3();
    this.tempControlPoint = new THREE.Vector3();
    this.tempCameraTarget = new THREE.Vector3();
    this.tempCameraOffset = new THREE.Vector3();
    this.tempCameraPos = new THREE.Vector3();
    this.tempCameraLook = new THREE.Vector3();
    this.tempSkillFwd = new THREE.Vector3();
    this.tempSkillSide = new THREE.Vector3();
    this.tempSkillVec = new THREE.Vector3();
    this.tempSkillVec2 = new THREE.Vector3();
    this.tempSkillVec3 = new THREE.Vector3();
    this.tempSkillVec4 = new THREE.Vector3();
    this.tempSkillVec5 = new THREE.Vector3();
    this.tempSkillBallTarget = new THREE.Vector3();
    this.tempSkillControl = new THREE.Vector3();
    this.tempSkillDefender = new THREE.Vector3();
    this.celebration = {
      active: false,
      style: 1,
      selectedStyle: 1,
      time: 0,
      duration: 0,
      dir: new THREE.Vector3(1, 0, 0),
      speed: 0,
      baseY: 0,
    };
    this.gkDive = {
      active: false,
      dir: new THREE.Vector3(1, 0, 0),
      strength: 0,
    };
    this.isGoalkeeper = false;

    this.mesh = this.buildMesh();
    this.mesh.scale.setScalar(1.16);
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
    this.setProceduralVisible(true);
    this.cameraYaw = 0; // The angle around the player
    this.cameraDistance = this.cameraDistanceBase;
    this.cameraHeight = this.cameraHeightBase;
    this.rpmAnimCoordRotation = 0;

    this.pBody = this.physics.createPlayerBody();
    this.setPerformanceProfile("high");
    this.bindInput();
  }

  setPerformanceProfile(profile = "high") {
    this.performanceProfile = ["ultra", "high", "medium"].includes(profile) ? profile : "high";
    if (this.performanceProfile === "ultra") {
      this.cameraDistanceBase = 6.6;
      this.cameraHeightBase = 3.6;
    } else if (this.performanceProfile === "medium") {
      this.cameraDistanceBase = 6.1;
      this.cameraHeightBase = 3.25;
    } else {
      this.cameraDistanceBase = 6.4;
      this.cameraHeightBase = 3.4;
    }
    this.cameraDistance = this.cameraDistanceBase;
    this.cameraHeight = this.cameraHeightBase;
  }

  setSkillContext(context = null) {
    this.skillContext = context;
  }

  queueSkill(slot) {
    if (this.celebration.active || this.charge || this.slideState.active || this.isSkillActive()) return false;
    const descriptor = getSkillBySlot(slot);
    if (!descriptor) return false;
    this.skillState.trigger = descriptor.slot;
    return true;
  }

  isSkillActive() {
    return !!this.skillState.active;
  }

  resetSkillState({ preserveExitBoost = false } = {}) {
    const hadSkillState = !!this.skillState.active || !!this.skillState.trigger;
    this.skillState.trigger = null;
    this.skillState.active = null;
    this.skillState.lockUntil = 0;
    this.pendingRpmSkillName = null;
    if (!preserveExitBoost) this.exitBoost.timeLeft = 0;
    if (hadSkillState) this.skillContext?.resetSkillDuel?.();
  }

  canSlideTackle() {
    return !this.celebration.active &&
      !this.charge &&
      !this.isSkillActive() &&
      !this.slideState.active &&
      this.slideState.cooldown <= 0;
  }

  isSliding() {
    return this.slideState.active;
  }

  triggerSlideTackle() {
    if (!this.canSlideTackle()) return false;

    const dir = this.moveDir.lengthSq() > 0.0001
      ? this.tempSkillVec.copy(this.moveDir)
      : this.tempSkillVec.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0);
    if (dir.lengthSq() < 0.0001) dir.set(1, 0, 0);
    dir.normalize();

    const facing = this.tempSkillVec2.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0);
    if (facing.lengthSq() < 0.0001) facing.copy(dir);
    facing.normalize();
    const side = this.tempSkillVec3.set(-facing.z, 0, facing.x);

    this.resetSkillState();
    this.slideState.active = true;
    this.slideState.time = 0;
    this.slideState.duration = this.velocity.length() > this.walkSpeed * 0.65 ? 0.58 : 0.66;
    this.slideState.cooldown = 0.95;
    this.slideState.direction.copy(dir);
    this.slideState.leadSide = dir.dot(side) >= 0 ? "right" : "left";
    this.slideState.hitBall = false;
    this.kickAnim = 0;
    this.kickStyle = "shot";
    this.pendingRpmKick = false;
    this.pendingRpmKickName = "kickShot";
    this.velocity.copy(dir).multiplyScalar(this.walkSpeed * 1.2);
    return true;
  }

  updateSlideTackle(dt) {
    const state = this.slideState;
    if (!state.active) return false;

    state.time += dt;
    const progress = clamp01(state.time / Math.max(0.0001, state.duration));
    const speedFactor = 1 - smoothstep(0.08, 1, progress) * 0.92;
    const targetSpeed = this.walkSpeed * (1.4 * speedFactor + 0.06);

    this.velocity.lerp(
      this.tempDesiredVelocity.copy(state.direction).multiplyScalar(targetSpeed),
      Math.min(1, dt * 18)
    );
    this.mesh.position.addScaledVector(this.velocity, dt);
    const targetYaw = Math.atan2(state.direction.x, state.direction.z);
    this.mesh.rotation.y = this.dampAngle(this.mesh.rotation.y, targetYaw, 18, dt);

    const ball = window.game?.ball;
    if (ball && !state.hitBall && progress >= 0.16 && progress <= 0.62) {
      const body = ball.body;
      const ballPos = this.tempSkillVec4.set(body.position.x, body.position.y, body.position.z);
      const toBall = this.tempSkillVec5.copy(ballPos).sub(this.mesh.position);
      const flat = this.tempSkillBallTarget.copy(toBall).setY(0);
      const dist = flat.length();
      if (dist <= 2.05 && toBall.y <= 1.1) {
        if (flat.lengthSq() < 0.0001) flat.copy(state.direction);
        flat.normalize();
        const approach = flat.dot(state.direction);
        if (approach > -0.25) {
          const launch = this.tempSkillControl.copy(state.direction).multiplyScalar(11.2 + this.velocity.length() * 0.34);
          launch.addScaledVector(flat, 4.4);
          body.velocity.set(launch.x, Math.max(0.9, body.velocity.y * 0.15 + 1.4), launch.z);
          body.angularVelocity.set(
            state.direction.z * 5.2,
            state.leadSide === "right" ? -4.8 : 4.8,
            -state.direction.x * 5.2
          );
          body.wakeUp();
          state.hitBall = true;
          this.lastKickTime = performance.now();
        }
      }
    }

    if (progress >= 1) {
      state.active = false;
      state.time = 0;
      this.velocity.multiplyScalar(0.24);
    }
    return true;
  }

  buildMesh() {
    const root = new THREE.Group();
    const markShadow = (obj) => {
      obj.traverse((node) => {
        if (node.isMesh) node.castShadow = true;
      });
      return obj;
    };

    const fabricNormal = (() => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 2400; i += 1) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const w = 1 + Math.random() * 2;
        const h = 1 + Math.random() * 6;
        const v = 120 + Math.floor(Math.random() * 40);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, w, h);
      }

      for (let i = 0; i < 1600; i += 1) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const len = 3 + Math.random() * 8;
        ctx.strokeStyle = "rgba(140,140,140,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + len * 0.2);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      return tex;
    })();
    const fabricNormalScale = new THREE.Vector2(0.35, 0.35);

    this.kitMat = new THREE.MeshPhysicalMaterial({
      color: 0x4e8dff,
      roughness: 0.52,
      metalness: 0.02,
      clearcoat: 0.08,
      clearcoatRoughness: 0.7,
      sheen: 0.7,
      sheenColor: new THREE.Color(0xf4f8ff),
      sheenRoughness: 0.82,
      normalMap: fabricNormal,
      normalScale: fabricNormalScale,
    });
    this.kitTrimMat = new THREE.MeshPhysicalMaterial({
      color: 0xe7f1ff,
      roughness: 0.34,
      metalness: 0.08,
      clearcoat: 0.2,
      clearcoatRoughness: 0.52,
    });
    this.sleeveMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b7eea,
      roughness: 0.6,
      metalness: 0.04,
      clearcoat: 0.06,
      clearcoatRoughness: 0.68,
      normalMap: fabricNormal,
      normalScale: fabricNormalScale,
    });
    this.skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xdcab7c,
      roughness: 0.72,
      metalness: 0.0,
      clearcoat: 0.05,
      clearcoatRoughness: 0.9,
    });
    this.shortMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d1218,
      roughness: 0.7,
      metalness: 0.08,
      clearcoat: 0.05,
      clearcoatRoughness: 0.78,
      normalMap: fabricNormal,
      normalScale: fabricNormalScale,
    });
    this.sockMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5f7fb,
      roughness: 0.44,
      metalness: 0.02,
      clearcoat: 0.14,
      clearcoatRoughness: 0.72,
      normalMap: fabricNormal,
      normalScale: fabricNormalScale,
    });
    this.hairMat = new THREE.MeshStandardMaterial({ color: 0x33241b, roughness: 0.72, metalness: 0.02 });
    this.beardMat = new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 0.78, metalness: 0.0 });
    this.bootMat = new THREE.MeshPhysicalMaterial({
      color: 0xffaa00,
      roughness: 0.25,
      metalness: 0.18,
      clearcoat: 0.34,
      clearcoatRoughness: 0.32,
    });
    this.bootAccentMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.48, metalness: 0.12 });
    this.lipMat = new THREE.MeshStandardMaterial({ color: 0xb77363, roughness: 0.68, metalness: 0.0 });
    this.eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.3, metalness: 0.0 });
    this.pupilMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.4, metalness: 0.0 });
    this.browMat = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.75 });
    this.shinGuardMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
    });

    const torso = new THREE.Group();
    torso.position.y = 1.46;

    const chest = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 8, 18), this.kitMat));
    chest.scale.set(1.18, 1.05, 0.98);
    torso.add(chest);

    const upperChest = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), this.kitMat));
    upperChest.position.set(0, 0.12, 0.03);
    upperChest.scale.set(1.2, 0.92, 0.78);
    torso.add(upperChest);

    const obliqueL = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), this.kitMat));
    obliqueL.position.set(-0.19, -0.1, 0.02);
    obliqueL.scale.set(0.92, 1.18, 0.84);
    const obliqueR = obliqueL.clone();
    obliqueR.position.x = 0.19;
    torso.add(obliqueL, obliqueR);

    const sternum = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.03), this.kitTrimMat));
    sternum.position.set(0, 0.02, 0.16);
    torso.add(sternum);

    const chestStripe = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.32), this.kitTrimMat));
    chestStripe.position.y = 0.05;
    torso.add(chestStripe);

    const chestStripe2 = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.045, 0.28), this.kitTrimMat));
    chestStripe2.position.y = -0.1;
    torso.add(chestStripe2);

    const collar = markShadow(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 14, 36), this.kitTrimMat));
    collar.position.set(0, 0.27, 0.03);
    collar.rotation.x = Math.PI / 2;
    torso.add(collar);

    const clavicle = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.22), this.kitTrimMat));
    clavicle.position.set(0, 0.19, 0.02);
    torso.add(clavicle);

    const shoulderCapL = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), this.sleeveMat));
    shoulderCapL.position.set(-0.31, 0.15, 0.01);
    shoulderCapL.scale.set(1.06, 0.82, 1.02);
    const shoulderCapR = shoulderCapL.clone();
    shoulderCapR.position.x = 0.31;
    torso.add(shoulderCapL, shoulderCapR);

    const abdomen = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.18), this.kitMat));
    abdomen.position.set(0, -0.18, 0.04);
    torso.add(abdomen);

    const waistPanel = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.16), this.kitTrimMat));
    waistPanel.position.set(0, -0.31, 0.02);
    torso.add(waistPanel);

    const neck = markShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.095, 0.15, 18), this.skinMat));
    neck.position.y = 0.39;
    torso.add(neck);

    const shorts = new THREE.Group();
    shorts.position.y = 1.02;
    const pelvis = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.18, 8, 16), this.shortMat));
    pelvis.rotation.z = Math.PI / 2;
    pelvis.scale.set(1.22, 1.0, 0.92);
    shorts.add(pelvis);

    const waistband = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.065, 0.34), this.kitTrimMat));
    waistband.position.y = 0.11;
    shorts.add(waistband);

    const groin = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), this.shortMat));
    groin.position.set(0, -0.12, 0.05);
    shorts.add(groin);

    const hipL = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), this.shortMat));
    hipL.position.set(-0.23, -0.02, 0.01);
    hipL.scale.set(0.86, 1.08, 0.92);
    const hipR = hipL.clone();
    hipR.position.x = 0.23;
    shorts.add(hipL, hipR);

    const shortStripeL = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.3, 0.24), this.kitTrimMat));
    shortStripeL.position.set(-0.24, -0.02, 0);
    const shortStripeR = shortStripeL.clone();
    shortStripeR.position.x = 0.24;
    shorts.add(shortStripeL, shortStripeR);

    const createLeg = (x) => {
      const upperLeg = new THREE.Group();
      upperLeg.position.set(x, 1.01, 0);

      const thigh = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 6, 14), this.skinMat));
      thigh.position.y = -0.2;
      upperLeg.add(thigh);

      const quad = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), this.skinMat));
      quad.position.set(0, -0.12, 0.03);
      quad.scale.set(1.05, 1.24, 0.86);
      upperLeg.add(quad);

      const hamstring = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 12), this.skinMat));
      hamstring.position.set(0, -0.18, -0.03);
      hamstring.scale.set(0.98, 1.12, 0.8);
      upperLeg.add(hamstring);

      const kneePivot = new THREE.Group();
      kneePivot.position.y = -0.41;
      upperLeg.add(kneePivot);

      const knee = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 12), this.skinMat));
      knee.position.set(0, 0, 0.03);
      knee.scale.set(1.02, 0.88, 0.96);
      kneePivot.add(knee);

      const shin = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.33, 6, 14), this.skinMat));
      shin.position.y = -0.2;
      kneePivot.add(shin);

      const calf = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), this.skinMat));
      calf.position.set(0, -0.22, -0.02);
      calf.scale.set(1.0, 1.22, 0.8);
      kneePivot.add(calf);

      const sock = markShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.082, 0.3, 14), this.sockMat));
      sock.position.y = -0.29;
      kneePivot.add(sock);

      const sockBand = markShadow(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 10, 20), this.kitTrimMat));
      sockBand.rotation.x = Math.PI / 2;
      sockBand.position.y = -0.14;
      kneePivot.add(sockBand);

      const shinGuard = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.16, 4, 12), this.shinGuardMat));
      shinGuard.position.set(0, -0.21, 0.032);
      shinGuard.scale.set(1.08, 1, 0.65);
      kneePivot.add(shinGuard);

      const anklePivot = new THREE.Group();
      anklePivot.position.y = -0.42;
      kneePivot.add(anklePivot);

      const ankle = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), this.skinMat));
      ankle.position.set(0, 0, 0.02);
      ankle.scale.set(0.95, 0.88, 1.02);
      anklePivot.add(ankle);

      const footPivot = new THREE.Group();
      footPivot.position.set(0, -0.04, 0.04);
      anklePivot.add(footPivot);

      const bootUpper = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.11, 0.3), this.bootMat));
      bootUpper.position.set(0, -0.05, 0.14);
      footPivot.add(bootUpper);

      const bootCollar = markShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.082, 0.1, 12), this.bootMat));
      bootCollar.position.set(0, 0.01, 0.03);
      footPivot.add(bootCollar);

      const bootToe = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), this.bootMat));
      bootToe.position.set(0, -0.055, 0.29);
      bootToe.scale.set(1.0, 0.64, 1.22);
      footPivot.add(bootToe);

      const bootHeel = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), this.bootMat));
      bootHeel.position.set(0, -0.05, 0.0);
      footPivot.add(bootHeel);

      const bootSole = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.028, 0.33), this.bootAccentMat));
      bootSole.position.set(0, -0.112, 0.13);
      footPivot.add(bootSole);

      const studOffsets = [
        [-0.062, 0.03],
        [0.062, 0.03],
        [-0.055, 0.22],
        [0.055, 0.22],
      ];
      for (const [sx, sz] of studOffsets) {
        const stud = markShadow(new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8),
          this.bootAccentMat
        ));
        stud.position.set(sx, -0.125, sz);
        footPivot.add(stud);
      }

      return { upperLeg, kneePivot, footPivot };
    };
    const leftLegRig = createLeg(-0.16);
    const rightLegRig = createLeg(0.16);

    const createArm = (x) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(x, 1.73, 0.01);
      shoulder.rotation.z = x > 0 ? 0.16 : -0.16;

      const shoulderCap = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), this.sleeveMat));
      shoulderCap.scale.set(1.05, 0.85, 1.05);
      shoulder.add(shoulderCap);

      const upper = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.18, 6, 12), this.sleeveMat));
      upper.position.y = -0.17;
      shoulder.add(upper);

      const bicep = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), this.sleeveMat));
      bicep.position.set(0, -0.14, 0.01);
      bicep.scale.set(0.95, 1.18, 0.88);
      shoulder.add(bicep);

      const sleeveTape = markShadow(new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.012, 10, 18), this.kitTrimMat));
      sleeveTape.rotation.x = Math.PI / 2;
      sleeveTape.position.y = -0.27;
      shoulder.add(sleeveTape);

      const elbow = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), this.skinMat));
      elbow.position.y = -0.32;
      elbow.scale.set(1.04, 0.92, 0.98);
      shoulder.add(elbow);

      const forearmPivot = new THREE.Group();
      forearmPivot.position.y = -0.32;
      shoulder.add(forearmPivot);

      const forearm = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.18, 6, 12), this.skinMat));
      forearm.position.y = -0.15;
      forearmPivot.add(forearm);

      const forearmBulk = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), this.skinMat));
      forearmBulk.position.set(0, -0.14, 0.01);
      forearmBulk.scale.set(0.92, 1.1, 0.84);
      forearmPivot.add(forearmBulk);

      const wristTape = markShadow(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 16), this.kitTrimMat));
      wristTape.rotation.x = Math.PI / 2;
      wristTape.position.y = -0.25;
      forearmPivot.add(wristTape);

      const wrist = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 10), this.skinMat));
      wrist.position.y = -0.29;
      forearmPivot.add(wrist);

      const handPivot = new THREE.Group();
      handPivot.position.y = -0.29;
      forearmPivot.add(handPivot);

      const palm = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.09, 6, 10), this.skinMat));
      palm.position.set(0, -0.02, 0.03);
      palm.rotation.x = Math.PI * 0.48;
      handPivot.add(palm);

      const thumbPad = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), this.skinMat));
      thumbPad.position.set((x > 0 ? -1 : 1) * 0.04, -0.03, 0.02);
      thumbPad.scale.set(1.0, 0.8, 1.2);
      handPivot.add(thumbPad);

      const fingers = [];
      const handedness = x > 0 ? -1 : 1;
      const createFinger = (offsetX, offsetZ, length, spread = 0, thumb = false) => {
        const base = new THREE.Group();
        base.position.set(offsetX * handedness, -0.08, offsetZ);
        if (thumb) {
          base.rotation.set(0.08, -0.72 * handedness, 0.42 * handedness);
        } else {
          base.rotation.set(-0.18, 0, spread * handedness);
        }

        const knuckle = new THREE.Group();
        base.add(knuckle);

        const phalanxA = markShadow(new THREE.Mesh(
          new THREE.CapsuleGeometry(0.013, length * 0.38, 4, 8),
          this.skinMat
        ));
        phalanxA.position.y = -length * 0.22;
        knuckle.add(phalanxA);

        const joint = new THREE.Group();
        joint.position.y = -length * 0.44;
        knuckle.add(joint);

        const phalanxB = markShadow(new THREE.Mesh(
          new THREE.CapsuleGeometry(0.011, length * 0.28, 4, 8),
          this.skinMat
        ));
        phalanxB.position.y = -length * 0.16;
        joint.add(phalanxB);

        const tipJoint = new THREE.Group();
        tipJoint.position.y = -length * 0.32;
        joint.add(tipJoint);

        const phalanxC = markShadow(new THREE.Mesh(
          new THREE.CapsuleGeometry(0.009, length * 0.18, 4, 8),
          this.skinMat
        ));
        phalanxC.position.y = -length * 0.1;
        tipJoint.add(phalanxC);

        handPivot.add(base);
        fingers.push({ knuckle, joint, tipJoint });
      };

      createFinger(0.1, 0.01, 0.1, -0.46, true);
      createFinger(0.06, 0.08, 0.14, -0.12);
      createFinger(0.02, 0.1, 0.16, -0.03);
      createFinger(-0.02, 0.1, 0.15, 0.03);
      createFinger(-0.055, 0.08, 0.13, 0.1);

      return { shoulder, forearmPivot, handPivot, fingers };
    };
    const leftArmRig = createArm(-0.35);
    const rightArmRig = createArm(0.35);
    const leftArm = leftArmRig.shoulder;
    const rightArm = rightArmRig.shoulder;

    const head = new THREE.Group();
    head.position.y = 1.89;
    const skull = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 20), this.skinMat));
    skull.scale.set(0.94, 1.06, 0.98);
    head.add(skull);

    const cranialBack = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 16), this.skinMat));
    cranialBack.position.set(0, 0.05, -0.06);
    cranialBack.scale.set(1.08, 0.98, 1.04);
    head.add(cranialBack);

    const jaw = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), this.skinMat));
    jaw.position.set(0, -0.08, 0.08);
    jaw.scale.set(0.98, 0.72, 0.82);
    head.add(jaw);

    const cheekL = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), this.skinMat));
    cheekL.position.set(-0.1, -0.03, 0.14);
    cheekL.scale.set(1.12, 0.88, 0.86);
    const cheekR = cheekL.clone();
    cheekR.position.x = 0.1;
    head.add(cheekL, cheekR);

    const chin = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), this.skinMat));
    chin.position.set(0, -0.16, 0.12);
    chin.scale.set(1.0, 0.8, 1.1);
    head.add(chin);

    const earL = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), this.skinMat));
    earL.position.set(-0.21, 0, 0);
    const earR = earL.clone();
    earR.position.x = 0.21;
    head.add(earL, earR);

    const browRidge = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.03, 0.07), this.skinMat));
    browRidge.position.set(0, 0.07, 0.16);
    head.add(browRidge);

    const noseBridge = markShadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05), this.skinMat));
    noseBridge.position.set(0, 0.0, 0.19);
    head.add(noseBridge);

    const nose = markShadow(new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 10), this.skinMat));
    nose.position.set(0, -0.03, 0.225);
    nose.rotation.x = Math.PI * 0.5;
    head.add(nose);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), this.eyeWhiteMat);
    eyeL.position.set(-0.07, 0.03, 0.2);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.07;
    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), this.pupilMat);
    pupilL.position.set(-0.07, 0.03, 0.224);
    const pupilR = pupilL.clone();
    pupilR.position.x = 0.07;
    head.add(eyeL, eyeR, pupilL, pupilR);

    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.02), this.browMat);
    browL.position.set(-0.07, 0.07, 0.205);
    browL.rotation.z = -0.12;
    const browR = browL.clone();
    browR.position.x = 0.07;
    browR.rotation.z = 0.12;
    head.add(browL, browR);

    const mouth = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.08, 4, 8), this.lipMat));
    mouth.position.set(0, -0.1, 0.2);
    mouth.rotation.z = Math.PI / 2;

    const lowerLip = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.05, 4, 8), this.lipMat));
    lowerLip.position.set(0, -0.125, 0.19);
    lowerLip.rotation.z = Math.PI / 2;
    head.add(mouth, lowerLip);

    const hair = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.242, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), this.hairMat));
    hair.position.y = 0.1;

    const hairBack = markShadow(new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 20, 16, 0, Math.PI * 2, Math.PI * 0.34, Math.PI * 0.38),
      this.hairMat
    ));
    hairBack.position.set(0, -0.02, -0.02);
    hairBack.scale.set(1.0, 1.05, 0.92);

    const hairBun = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), this.hairMat));
    hairBun.position.set(0, 0.1, -0.18);

    const headband = markShadow(new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.015, 12, 40),
      new THREE.MeshStandardMaterial({ color: 0xff3344, roughness: 0.4, metalness: 0.05 })
    ));
    headband.position.set(0, 0.06, 0);
    headband.rotation.x = Math.PI / 2;

    const beard = markShadow(new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.4), this.beardMat));
    beard.position.set(0, -0.1, 0.11);

    const moustache = markShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.07, 4, 8), this.beardMat));
    moustache.position.set(0, -0.075, 0.18);
    moustache.rotation.z = Math.PI / 2;

    head.add(hair, hairBack, hairBun, headband, beard, moustache);

    const numberPanelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.45,
      metalness: 0.0,
    });
    const numberPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.22),
      numberPanelMat.clone()
    );
    numberPlane.position.set(0, 1.53, -0.16);
    numberPlane.rotation.y = Math.PI;

    const frontNumber = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.14),
      numberPanelMat.clone()
    );
    frontNumber.position.set(0, 1.45, 0.162);

    this.poseAnchors = {
      shortsY: 1.02,
      hipY: 1.01,
      torsoY: 1.46,
      headY: 1.89,
      numberY: 1.53,
      frontNumberY: 1.45,
    };

    this.parts = {
      head, hair, hairBack, hairBun, headband, beard, moustache,
      numberPlane, frontNumber, torso, shorts,
      leftLeg: leftLegRig.upperLeg,
      rightLeg: rightLegRig.upperLeg,
      leftShin: leftLegRig.kneePivot,
      rightShin: rightLegRig.kneePivot,
      leftFoot: leftLegRig.footPivot,
      rightFoot: rightLegRig.footPivot,
      leftArm, rightArm,
      leftForearm: leftArmRig.forearmPivot,
      rightForearm: rightArmRig.forearmPivot,
      leftHand: leftArmRig.handPivot,
      rightHand: rightArmRig.handPivot,
      leftFingers: leftArmRig.fingers,
      rightFingers: rightArmRig.fingers,
    };
    root.add(
      torso,
      shorts,
      leftLegRig.upperLeg,
      rightLegRig.upperLeg,
      leftArm,
      rightArm,
      head,
      numberPlane,
      frontNumber
    );
    markShadow(root);
    return root;
  }

  setBodyHeave(offset = 0) {
    const anchors = this.poseAnchors || {};
    const hipOffset = offset * 0.9;
    this.parts.shorts.position.y = (anchors.shortsY ?? 1.02) + hipOffset;
    this.parts.leftLeg.position.y = (anchors.hipY ?? 1.01) + hipOffset;
    this.parts.rightLeg.position.y = (anchors.hipY ?? 1.01) + hipOffset;
    this.parts.torso.position.y = (anchors.torsoY ?? 1.46) + offset;
    this.parts.head.position.y = (anchors.headY ?? 1.89) + offset * 1.04;
    this.parts.numberPlane.position.y = (anchors.numberY ?? 1.53) + offset;
    this.parts.frontNumber.position.y = (anchors.frontNumberY ?? 1.45) + offset * 0.96;
  }

  setLegPose(side, pose = {}, dt = 0.016, lambda = 10) {
    const isLeft = side === "left";
    const upper = isLeft ? this.parts.leftLeg : this.parts.rightLeg;
    const shin = isLeft ? this.parts.leftShin : this.parts.rightShin;
    const foot = isLeft ? this.parts.leftFoot : this.parts.rightFoot;
    const hipX = pose.hipX ?? 0;
    const hipY = pose.hipY ?? 0;
    const hipZ = pose.hipZ ?? 0;
    const kneeX = pose.kneeX ?? 0;
    const footX = pose.footX ?? 0;
    const footZ = pose.footZ ?? 0;

    upper.rotation.x = this.dampAngle(upper.rotation.x, hipX, lambda, dt);
    upper.rotation.y = this.dampAngle(upper.rotation.y, hipY, lambda, dt);
    upper.rotation.z = this.dampAngle(upper.rotation.z, hipZ, lambda, dt);
    shin.rotation.x = this.dampAngle(shin.rotation.x, kneeX, lambda, dt);
    shin.rotation.y = this.dampAngle(shin.rotation.y, 0, lambda, dt);
    shin.rotation.z = this.dampAngle(shin.rotation.z, 0, lambda, dt);
    foot.rotation.x = this.dampAngle(foot.rotation.x, footX, lambda, dt);
    foot.rotation.y = this.dampAngle(foot.rotation.y, 0, lambda, dt);
    foot.rotation.z = this.dampAngle(foot.rotation.z, footZ, lambda, dt);
  }

  createNumberTexture(number, compact = false) {
    const canvas = document.createElement("canvas");
    canvas.width = compact ? 160 : 256;
    canvas.height = compact ? 160 : 256;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const text = String(number ?? 7);
    const fontSize = compact ? 86 : 132;
    ctx.font = `900 ${fontSize}px Sora, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = compact ? 10 : 14;
    ctx.strokeStyle = "rgba(10, 22, 38, 0.9)";
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  applyAvatar(avatar, options = {}) {
    const skinMap = {
      Aciq: 0xf0ccab,
      Bugday: 0xe2b287,
      Orta: 0xd8a87d,
      Bronz: 0xb97854,
      Tund: 0x8d5a3f,
      Gece: 0x5b3929,
    };
    const hairMap = {
      Fade: 0x211915,
      Qisa: 0x2e241f,
      Dalgali: 0x433128,
      Mohawk: 0x231a16,
      Uzun: 0x4a2f24,
      Topuz: 0x1f1713,
    };
    const hairColorMap = {
      "Jet Black": 0x12100e,
      "Dark Brown": 0x2c1e18,
      Chestnut: 0x5d2f20,
      Golden: 0xa67636,
      Platinum: 0xd8d0c8,
      Silver: 0x7b7f87,
    };
    const beardVisible = !!avatar.beard && avatar.beard !== "Yox";
    const selectedKit = KIT_PRESETS[avatar.kit] || KIT_PRESETS["Solar Pulse"] || KIT_PRESETS.Galatasaray;
    const selectedBoot = BOOT_PRESETS[avatar.boots] || BOOT_PRESETS["Inferno Red"] || BOOT_PRESETS["Predator Blue"];
    const jerseyNumber = Number(avatar.jerseyNumber);
    const safeNumber = Number.isFinite(jerseyNumber) && jerseyNumber > 0 ? jerseyNumber : 7;
    const hairStyle = avatar.hair || "Qisa";
    const beardStyle = avatar.beard || "Yox";
    const hairColor = hairColorMap[avatar.hairColor] ?? hairMap[hairStyle] ?? hairColorMap["Dark Brown"];

    this.skinMat.color.setHex(skinMap[avatar.skin] ?? skinMap.Orta);
    this.hairMat.color.setHex(hairColor);
    this.beardMat.color.setHex(hairColor);
    this.browMat.color.setHex(hairColor);
    this.parts.hair.position.set(0, 0.1, 0);
    this.parts.hair.rotation.set(0, 0, 0);
    this.parts.hair.scale.set(1, 1, 1);
    this.parts.hairBack.position.set(0, -0.02, -0.02);
    this.parts.hairBack.scale.set(1.0, 1.05, 0.92);
    this.parts.hairBack.visible = false;
    this.parts.hairBun.position.set(0, 0.1, -0.18);
    this.parts.hairBun.scale.set(1, 1, 1);
    this.parts.hairBun.visible = false;
    this.parts.headband.visible = false;

    switch (hairStyle) {
      case "Fade":
        this.parts.hair.scale.set(0.86, 0.82, 0.92);
        this.parts.hair.position.y = 0.07;
        break;
      case "Dalgali":
        this.parts.hair.scale.set(1.14, 1.16, 1.08);
        this.parts.hair.rotation.z = 0.06;
        this.parts.hairBack.visible = true;
        this.parts.hairBack.scale.set(1.06, 1.12, 0.96);
        break;
      case "Mohawk":
        this.parts.hair.scale.set(0.58, 1.26, 1.02);
        this.parts.hair.position.y = 0.11;
        break;
      case "Uzun":
        this.parts.hair.scale.set(1.02, 1.04, 1.08);
        this.parts.hairBack.visible = true;
        this.parts.hairBack.scale.set(1.08, 1.18, 1.0);
        this.parts.hairBack.position.set(0, -0.05, -0.04);
        break;
      case "Topuz":
        this.parts.hair.scale.set(0.98, 1.08, 1.0);
        this.parts.hairBun.visible = true;
        this.parts.hairBun.scale.set(1.0, 1.0, 1.1);
        this.parts.headband.visible = true;
        break;
      default:
        this.parts.hair.scale.set(1, 1, 1);
        break;
    }

    this.parts.beard.visible = beardVisible;
    this.parts.moustache.visible = beardVisible;
    this.parts.beard.scale.set(1, 1, 1);
    this.parts.moustache.scale.set(1, 1, 1);

    switch (beardStyle) {
      case "Kirli":
        this.parts.beard.visible = true;
        this.parts.moustache.visible = true;
        this.parts.beard.scale.set(0.84, 0.58, 0.74);
        this.parts.moustache.scale.set(0.9, 0.78, 0.9);
        break;
      case "Qisa":
        this.parts.beard.visible = true;
        this.parts.moustache.visible = true;
        this.parts.beard.scale.set(0.92, 0.78, 0.86);
        this.parts.moustache.scale.set(0.96, 0.9, 1.0);
        break;
      case "Keskin":
        this.parts.beard.visible = true;
        this.parts.moustache.visible = true;
        this.parts.beard.scale.set(1.02, 0.72, 0.78);
        this.parts.moustache.scale.set(0.92, 0.82, 0.92);
        break;
      case "Full":
        this.parts.beard.visible = true;
        this.parts.moustache.visible = true;
        this.parts.beard.scale.set(1.1, 1.02, 1.06);
        this.parts.moustache.scale.set(1.08, 1.0, 1.08);
        break;
      case "Bige":
        this.parts.beard.visible = true;
        this.parts.moustache.visible = true;
        this.parts.beard.scale.set(0.68, 0.44, 0.64);
        this.parts.moustache.scale.set(1.12, 0.96, 1.12);
        break;
      default:
        this.parts.beard.visible = false;
        this.parts.moustache.visible = false;
        break;
    }

    this.kitMat.color.setHex(selectedKit.primary);
    this.sleeveMat.color.setHex(selectedKit.sleeve);
    this.kitTrimMat.color.setHex(selectedKit.trim);
    this.sockMat.color.setHex(selectedKit.sock);
    this.bootMat.color.setHex(selectedBoot);

    const prevBackTex = this.parts.numberPlane.material.map;
    const prevFrontTex = this.parts.frontNumber.material.map;
    const backTex = this.createNumberTexture(safeNumber, false);
    const frontTex = this.createNumberTexture(safeNumber, true);
    this.parts.numberPlane.material.map = backTex;
    this.parts.numberPlane.material.needsUpdate = true;
    this.parts.frontNumber.material.map = frontTex;
    this.parts.frontNumber.material.needsUpdate = true;
    if (prevBackTex && prevBackTex !== backTex) prevBackTex.dispose?.();
    if (prevFrontTex && prevFrontTex !== frontTex) prevFrontTex.dispose?.();

    this.clearReadyPlayerAvatar(true);
    return Promise.resolve(true);
  }

  setProceduralVisible(visible) {
    const finalVisible = this.rpmOnly ? false : !!visible;
    for (const child of this.mesh.children) {
      if (child !== this.rpmAvatar) child.visible = finalVisible;
    }
  }

  setGoalkeeperDive(active, dir, strength = 1) {
    this.gkDive.active = !!active;
    this.gkDive.strength = Math.min(1, Math.max(0, strength));
    if (dir) this.gkDive.dir.copy(dir);
  }

  loadReadyPlayerAvatar(url, options = {}) {
    const showProceduralWhileLoading = !!options.showProceduralWhileLoading;
    const rotationFix = options.rotationFix || null;
    if (!url || typeof url !== "string") {
      this.clearReadyPlayerAvatar(true);
      return Promise.resolve(false);
    }
    const finalUrl = url.trim();
    if (!finalUrl) {
      this.clearReadyPlayerAvatar(true);
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const loadToken = ++this.rpmLoadToken;
      this.clearReadyPlayerAvatar(showProceduralWhileLoading && !this.rpmOnly);

      this.gltfLoader.load(
        finalUrl,
        (gltf) => {
          if (loadToken !== this.rpmLoadToken) {
            resolve(false);
            return;
          }
          const model = gltf.scene;
          if (!model) {
            this.clearReadyPlayerAvatar(true);
            resolve(false);
            return;
          }

          this.clearReadyPlayerAvatar(false);

          model.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const height = Math.max(0.001, box.max.y - box.min.y);
          const scale = 2.32 / height;
          model.scale.setScalar(scale);

          const scaled = new THREE.Box3().setFromObject(model);
          model.position.y -= scaled.min.y;
          if (rotationFix) {
            model.rotation.set(
              rotationFix.x ?? 0,
              rotationFix.y ?? 0,
              rotationFix.z ?? 0
            );
          } else {
            model.rotation.y = 0;
          }

          this.mesh.add(model);
          this.rpmAvatar = model;
          this.captureRpmRig(model);
          this.loadRpmFbxAnimations(model);
          resolve(true);
        },
        undefined,
        () => {
          if (loadToken !== this.rpmLoadToken) {
            resolve(false);
            return;
          }
          this.clearReadyPlayerAvatar(true);
          resolve(false);
        }
      );
    });
  }

  loadCustomModel(fbxPath, texturePath, options = {}) {
    const nextFbxPath = typeof fbxPath === "string" ? fbxPath.trim() : "";
    const nextTexturePath = typeof texturePath === "string" ? texturePath.trim() : "";
    const hasTexturePath = !!nextTexturePath;
    const normalizedTexturePath = hasTexturePath ? nextTexturePath : null;
    const rotationFix = options.rotationFix || null;
    const preferExternalAnims = !!options.preferExternalAnims;
    const useDirectFbxClips = !!options.useDirectFbxClips;
    if (!nextFbxPath) return Promise.resolve(false);

    if (this.customModel && this.customModelPath === nextFbxPath && this.customTexturePath === normalizedTexturePath) {
      this.setProceduralVisible(false);
      this.rpmOnly = true;
      return Promise.resolve(true);
    }

    if (this.customModel) {
      this.mesh.remove(this.customModel);
      this.customModel.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
          else obj.material?.dispose?.();
        }
      });
      this.customModel = null;
      this.customModelPath = null;
      this.customTexturePath = null;
    }

    return new Promise((resolve) => {
      this.fbxLoader.load(
        encodeURI(nextFbxPath),
        (fbx) => {
          const applyModel = (tex, usedTexturePath = null) => {
            if (tex) {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.flipY = true;
            }

            fbx.traverse((child) => {
              if (child.isMesh) {
                if (tex) {
                  child.material = new THREE.MeshStandardMaterial({
                    map: tex,
                    color: 0xffffff,
                    roughness: 0.65,
                    metalness: 0.05,
                    skinning: !!child.isSkinnedMesh,
                  });
                  child.material.needsUpdate = true;
                }
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            const box = new THREE.Box3().setFromObject(fbx);
            const height = box.max.y - box.min.y;
            const targetHeight = 2.0;
            fbx.scale.setScalar(targetHeight / Math.max(0.1, height));

            const scaledBox = new THREE.Box3().setFromObject(fbx);
            fbx.position.y = -scaledBox.min.y;

            // Fix "sideways facing" issue. Some FBX files need a rotation offset.
            if (rotationFix) {
              fbx.rotation.set(
                rotationFix.x ?? 0,
                rotationFix.y ?? 0,
                rotationFix.z ?? 0
              );
            } else {
              // Based on "ileri koşmak yerine yana doğru koşuyo", the rig is likely 90deg offset internally.
              fbx.rotation.y = Math.PI; // Keeps the visual facing correct as per user feedback
              this.rpmAnimCoordRotation = Math.PI / 2; // Remap procedural anims by 90deg to match rig forward
            }

            this.clearReadyPlayerAvatar(false);
            this.setProceduralVisible(false);

            this.mesh.add(fbx);
            this.customModel = fbx;
            this.customModelPath = nextFbxPath;
            this.customTexturePath = usedTexturePath;
            this.rpmAvatar = fbx;

            this.captureRpmRig(fbx);
            this.resetBoneRotations(fbx);
            this.rpmAnimYawOffset = options.animRotationFix ?? 0;
            this.rpmAnimYawHipsName = this.rpmRig?.hips?.name || "Hips";
            this.useDirectFbxClips = false;

            // Priority to external animations (Normal walking, Dribbling, etc.)
            // as internal fbx.animations might just be a static pose (T-Pose)
            this.loadRpmFbxAnimations(fbx);

            this.rpmOnly = true;
            resolve(true);
          };

          const tryLoadTexture = (paths = []) => {
            const next = paths.shift();
            if (!next) {
              applyModel(null, null);
              return;
            }
            this.textureLoader.load(
              encodeURI(next),
              (tex) => applyModel(tex, next),
              undefined,
              () => tryLoadTexture(paths)
            );
          };

          const baseDir = nextFbxPath.includes("/") ? nextFbxPath.slice(0, nextFbxPath.lastIndexOf("/")) : "";
          const fallbackTexture = baseDir ? `${baseDir}/Deri.png` : "Deri.png";
          const textureCandidates = [];
          if (hasTexturePath) textureCandidates.push(nextTexturePath);
          if (!hasTexturePath || nextTexturePath !== fallbackTexture) textureCandidates.push(fallbackTexture);

          if (textureCandidates.length > 0) {
            tryLoadTexture(textureCandidates);
          } else {
            applyModel(null, null);
          }
        },
        undefined,
        (err) => {
          console.log("Custom model load failed:", err);
          resolve(false);
        }
      );
    });
  }

  clearReadyPlayerAvatar(showProcedural = true) {
    if (this.rpmAvatar) {
      this.mesh.remove(this.rpmAvatar);
      this.rpmAvatar.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
          else obj.material?.dispose?.();
        }
      });
      this.rpmAvatar = null;
      this.rpmRig = null;
      this.rpmBaseRot.clear();
    }
    this.rpmMixer?.stopAllAction?.();
    this.rpmMixer = null;
    this.rpmActions = {};
    this.rpmCurrentAction = null;
    this.rpmCurrentActionName = null;
    this.rpmAnimReady = false;
    this.pendingRpmKick = false;
    this.pendingRpmKickName = "kickShot";
    this.pendingRpmSkillName = null;
    this.rpmAnimToken += 1;
    this.setProceduralVisible(showProcedural);
  }

  findRpmBone(root, aliases = []) {
    let result = null;
    root.traverse((obj) => {
      if (result || !obj.isBone) return;
      const n = String(obj.name || "").toLowerCase();
      if (aliases.some((a) => n.includes(a))) result = obj;
    });
    return result;
  }

  captureRpmRig(root) {
    const rig = {
      hips: this.findRpmBone(root, ["hips", "pelvis", "hip"]),
      spine: this.findRpmBone(root, ["spine", "spine_01", "spine01"]),
      chest: this.findRpmBone(root, ["chest", "upperchest", "spine_02", "spine2"]),
      head: this.findRpmBone(root, ["head"]),
      leftUpperLeg: this.findRpmBone(root, ["leftupleg", "thigh_l", "leftthigh"]),
      rightUpperLeg: this.findRpmBone(root, ["rightupleg", "thigh_r", "rightthigh"]),
      leftLowerLeg: this.findRpmBone(root, ["leftleg", "calf_l", "leftcalf"]),
      rightLowerLeg: this.findRpmBone(root, ["rightleg", "calf_r", "rightcalf"]),
      leftFoot: this.findRpmBone(root, ["leftfoot", "foot_l"]),
      rightFoot: this.findRpmBone(root, ["rightfoot", "foot_r"]),
      leftUpperArm: this.findRpmBone(root, ["leftarm", "upperarm_l"]),
      rightUpperArm: this.findRpmBone(root, ["rightarm", "upperarm_r"]),
      leftLowerArm: this.findRpmBone(root, ["leftforearm", "lowerarm_l"]),
      rightLowerArm: this.findRpmBone(root, ["rightforearm", "lowerarm_r"]),
    };

    this.rpmRig = rig;
    this.rpmBaseRot.clear();
    Object.entries(rig).forEach(([key, bone]) => {
      if (bone) this.rpmBaseRot.set(key, bone.rotation.clone());
    });
  }

  resetBoneRotations(root) {
    if (!root) return;
    root.traverse((obj) => {
      if (obj.isBone) {
        obj.rotation.set(0, 0, 0);
        obj.quaternion.set(0, 0, 0, 1);
      }
    });
  }

  applyClipYawOffset(clip, yaw = 0, hipsName = "Hips") {
    if (!clip || !yaw) return clip;
    const hipsKey = String(hipsName || "Hips").toLowerCase();
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const tempQuat = new THREE.Quaternion();
    const tempVec = new THREE.Vector3();
    clip.tracks.forEach((track) => {
      const name = String(track.name || "").toLowerCase();
      if (name.includes(`${hipsKey}.quaternion`) && track instanceof THREE.QuaternionKeyframeTrack) {
        const v = track.values;
        for (let i = 0; i < v.length; i += 4) {
          tempQuat.set(v[i], v[i + 1], v[i + 2], v[i + 3]);
          tempQuat.premultiply(yawQuat);
          v[i] = tempQuat.x;
          v[i + 1] = tempQuat.y;
          v[i + 2] = tempQuat.z;
          v[i + 3] = tempQuat.w;
        }
      } else if (name.includes(`${hipsKey}.position`) && track instanceof THREE.VectorKeyframeTrack) {
        const v = track.values;
        for (let i = 0; i < v.length; i += 3) {
          tempVec.set(v[i], v[i + 1], v[i + 2]);
          tempVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          v[i] = tempVec.x;
          v[i + 2] = tempVec.z;
        }
      }
    });
    clip.resetDuration();
    return clip;
  }

  normalizeClipTrackNames(clip) {
    if (!clip || !clip.tracks) return clip;
    const normalizedTracks = clip.tracks.map((track) => {
      const name = String(track.name || "");
      if (!name.includes(".")) return track;
      const parts = name.split(".");
      const nodePath = parts[0];
      const prop = parts.slice(1).join(".");
      let node = nodePath;
      if (node.includes("|")) node = node.split("|").pop();
      if (node.includes(":")) node = node.split(":").pop();
      node = node.replace(/mixamorig/gi, "");
      node = node.replace(/^[_\\:\\|]+/, "");
      const nextName = `${node}.${prop}`;
      if (nextName === name) return track;
      const TrackType = track.constructor;
      const times = track.times.slice();
      const values = track.values.slice();
      const next = new TrackType(nextName, times, values);
      if (track.getInterpolation) next.setInterpolation(track.getInterpolation());
      return next;
    });
    return new THREE.AnimationClip(clip.name, clip.duration, normalizedTracks);
  }

  setRpmPose(key, x = 0, y = 0, z = 0, lerpAlpha = 0.65) {
    const bone = this.rpmRig?.[key];
    const base = this.rpmBaseRot.get(key);
    if (!bone || !base) return;

    let rx = x, ry = y, rz = z;
    if (this.rpmAnimCoordRotation !== 0) {
      const cos = Math.cos(this.rpmAnimCoordRotation);
      const sin = Math.sin(this.rpmAnimCoordRotation);
      // Rotate the Euler offsets around Y axis to match rig orientation
      rx = x * cos + z * sin;
      rz = -x * sin + z * cos;
    }

    const a = THREE.MathUtils.clamp(lerpAlpha, 0, 1);
    bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, base.x + rx, a);
    bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, base.y + ry, a);
    bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, base.z + rz, a);
  }

  loadInternalAnimations(fbx) {
    this.rpmAnimReady = false;
    this.rpmMixer = new THREE.AnimationMixer(fbx);
    this.rpmActions = {};
    
    // Map common names if they exist in the file
    fbx.animations.forEach((clip) => {
      const name = clip.name.toLowerCase();
      let actionName = null;
      if (name.includes("idle")) actionName = "idle";
      else if (name.includes("run") || name.includes("walk") || name.includes("dribble")) actionName = "dribble";
      else if (name.includes("sprint")) actionName = "sprint";
      else if (name.includes("kick") || name.includes("shot")) actionName = "kickShot";
      
      if (actionName) {
        this.applyClipYawOffset(clip, this.rpmAnimYawOffset, this.rpmAnimYawHipsName);
        const action = this.rpmMixer.clipAction(clip);
        action.enabled = true;
        action.setEffectiveWeight(1);
        this.rpmActions[actionName] = action;
      }
    });

    // If no specific names found, just take the first few as defaults
    if (!this.rpmActions.idle && fbx.animations[0]) {
      this.applyClipYawOffset(fbx.animations[0], this.rpmAnimYawOffset, this.rpmAnimYawHipsName);
      this.rpmActions.idle = this.rpmMixer.clipAction(fbx.animations[0]);
    }

    this.rpmAnimReady = Object.keys(this.rpmActions).length > 0;
    if (this.rpmAnimReady) {
      const first = Object.keys(this.rpmActions)[0];
      this.playRpmAction(first, 0.01);
    }
  }

  loadFbxAsset(url) {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        encodeURI(url),
        (fbx) => resolve(fbx),
        undefined,
        (err) => reject(err)
      );
    });
  }

  async loadRpmFbxAnimations(targetModel) {
    this.rpmAnimToken += 1;
    if (this.rpmAvatar !== targetModel) return;
    this.rpmMixer = null;
    this.rpmActions = {};
    this.rpmCurrentAction = null;
    this.rpmCurrentActionName = null;
    this.rpmAnimReady = false;
  }

  playRpmAction(name, fade = 0.14) {
    if (!this.rpmAnimReady || !this.rpmMixer) return false;
    const next = this.rpmActions[name];
    if (!next) return false;
    if (this.rpmCurrentAction === next && (!RPM_ONE_SHOT_ACTIONS.has(name) || next.isRunning())) return true;

    if (this.rpmCurrentAction) {
      this.rpmCurrentAction.fadeOut(fade);
    }
    next.reset().fadeIn(fade).play();
    if (RPM_ONE_SHOT_ACTIONS.has(name)) next.setLoop(THREE.LoopOnce, 1);
    this.rpmCurrentAction = next;
    this.rpmCurrentActionName = name;
    return true;
  }

  updateRpmActionState(dt, isMoving, sprinting, inputForward = 0) {
    if (!this.rpmAnimReady || !this.rpmMixer) return false;
    this.rpmMixer.update(dt);

    if (this.pendingRpmKick) {
      this.pendingRpmKick = false;
      this.pendingRpmKickName = "kickShot";
      return false; // Force procedural kick
    }

    if (
      (this.rpmCurrentActionName === "kickShot" || this.rpmCurrentActionName === "kickBicycle") &&
      this.rpmCurrentAction &&
      this.rpmCurrentAction.isRunning()
    ) {
      // If we want procedural bits to overlay or take over, we return false.
      // For "old" animations, return false.
      return false; 
    }

    const hasBall = arguments.length > 4 ? !!arguments[4] : false;
    let target = "idle";
    let timeScale = 1.0;

    if (isMoving) {
      if (sprinting && this.rpmActions.sprint) {
        target = "sprint";
      } else if (hasBall && this.rpmActions.dribble) {
        target = "dribble";
      } else {
        target = "idle"; // Walk fallback
      }
      timeScale = 1.0;
    } else {
      target = "idle";
      timeScale = 1.0;
    }

    // Use direct FBX locomotion when available; otherwise fall back to procedural.
    if (target === "idle" || target === "dribble" || target === "sprint") {
      const hasDirect = this.useDirectFbxClips && this.rpmActions[target];
      if (!hasDirect) {
        if (this.rpmCurrentAction) {
          this.rpmCurrentAction.fadeOut(0.2);
          this.rpmCurrentAction = null;
          this.rpmCurrentActionName = null;
        }
        return false;
      }
    }

    if (!this.rpmActions[target]) {
      if (target === "sprint" && this.rpmActions.dribble) target = "dribble";
      else if (target === "dribble" && this.rpmActions.idle) target = "idle";
    }

    if (!this.rpmActions[target]) return false;

    this.playRpmAction(target, 0.12);
    this.rpmCurrentAction?.setEffectiveTimeScale(timeScale);
    return true;
  }

  applyRpmAnimations(dt, isMoving, sprinting, inputForward = 0, hasBall = false) {
    if (!this.rpmAvatar) return;
    const blend = THREE.MathUtils.clamp(dt * 10, 0.08, 0.45);
    const actualSpeed = this.velocity.length();
    const locomotionActive = isMoving && actualSpeed > 0.12;
    const movingBack = locomotionActive && inputForward < -0.15;
    const speedFactor = locomotionActive
      ? (sprinting ? 13.2 : movingBack ? 6.1 : hasBall ? 9.0 : 7.6)
      : 1.9;
    this.runTime += dt * speedFactor;

    let kickPhase = 0;
    if (this.kickAnim > 0) {
      const decay = this.kickStyle === "bicycle" ? 4.5 : this.kickStyle === "pass" ? 5.1 : 4.2;
      this.kickAnim = Math.max(0, this.kickAnim - dt * decay);
      kickPhase = 1 - this.kickAnim;
    }

    if (this.slideState.active) {
      const phase = clamp01(this.slideState.time / Math.max(0.0001, this.slideState.duration));
      const lead = this.slideState.leadSide === "right" ? 1 : -1;
      const stretch = Math.sin(phase * Math.PI);
      this.setRpmPose("hips", 0.08, 0, lead * 0.08, blend);
      this.setRpmPose("spine", -0.34, 0, -lead * 0.14, blend);
      this.setRpmPose("chest", -0.22, 0, -lead * 0.24, blend);
      this.setRpmPose("head", 0.06, -lead * 0.06, lead * 0.08, blend);
      this.setRpmPose(lead > 0 ? "rightUpperLeg" : "leftUpperLeg", 0.22 - stretch * 0.98, 0, lead * 0.22, blend);
      this.setRpmPose(lead > 0 ? "rightLowerLeg" : "leftLowerLeg", 0.78 - stretch * 0.42, 0, 0, blend);
      this.setRpmPose(lead > 0 ? "rightFoot" : "leftFoot", 0.28 - stretch * 0.18, 0, 0, blend);
      this.setRpmPose(lead > 0 ? "leftUpperLeg" : "rightUpperLeg", -0.44 + stretch * 0.2, 0, -lead * 0.08, blend);
      this.setRpmPose(lead > 0 ? "leftLowerLeg" : "rightLowerLeg", 0.98, 0, 0, blend);
      this.setRpmPose(lead > 0 ? "leftUpperArm" : "rightUpperArm", -0.78, 0, -lead * 0.18, blend);
      this.setRpmPose(lead > 0 ? "rightUpperArm" : "leftUpperArm", 0.3, 0, lead * 0.28, blend);
      this.setRpmPose(lead > 0 ? "leftLowerArm" : "rightLowerArm", -0.84, 0, 0, blend);
      this.setRpmPose(lead > 0 ? "rightLowerArm" : "leftLowerArm", -0.5, 0, 0, blend);
      this.rpmAvatar.position.y = -0.03 * stretch;
      return;
    }

    if (this.kickAnim > 0 && this.kickStyle === "bicycle") {
      const scissor = Math.sin(kickPhase * Math.PI);
      this.setRpmPose("hips", 0.18 - scissor * 0.08, 0, 0, blend);
      this.setRpmPose("spine", 0.34 - scissor * 0.22, 0, 0, blend);
      this.setRpmPose("chest", 0.22, 0, 0, blend);
      this.setRpmPose("head", -0.14, 0, 0, blend);
      this.setRpmPose("rightUpperLeg", 0.52 - scissor * 1.56, 0, 0.16, blend);
      this.setRpmPose("leftUpperLeg", -0.18 + scissor * 1.02, 0, -0.14, blend);
      this.setRpmPose("rightLowerLeg", 1.08 - scissor * 0.82, 0, 0, blend);
      this.setRpmPose("leftLowerLeg", 0.36 + scissor * 0.42, 0, 0, blend);
      this.setRpmPose("rightFoot", 0.22, 0, 0, blend);
      this.setRpmPose("leftFoot", -0.08, 0, 0, blend);
      this.setRpmPose("rightUpperArm", -1.04, 0, 0.36, blend);
      this.setRpmPose("leftUpperArm", -0.82, 0, -0.36, blend);
      this.setRpmPose("rightLowerArm", -0.44, 0, 0.08, blend);
      this.setRpmPose("leftLowerArm", -0.44, 0, -0.08, blend);
      this.rpmAvatar.position.y = 0.08 * scissor;
      return;
    }

    if (this.kickAnim > 0) {
      const windup = smoothstep(0, 0.34, kickPhase);
      const strike = smoothstep(0.34, 0.82, kickPhase);
      const follow = smoothstep(0.82, 1, kickPhase);
      const isShortPass = this.kickVariant === "shortPass";
      const isLongPass = this.kickVariant === "longPass";
      const torsoLean = isShortPass ? -0.08 : isLongPass ? -0.2 : -0.16;
      const torsoTwist = isShortPass ? -0.1 : isLongPass ? -0.36 : -0.24;
      const supportLegX = isShortPass ? 0.12 : 0.18 + follow * 0.1;
      const kickLegStart = isShortPass ? 0.34 : isLongPass ? 0.56 : 0.74;
      const kickLegEnd = isShortPass ? -0.56 : isLongPass ? -0.96 : -1.18;
      const kickLegX = kickPhase < 0.34
        ? kickLegStart * windup
        : THREE.MathUtils.lerp(kickLegStart, kickLegEnd, strike);
      const kickKnee = kickPhase < 0.34
        ? (isShortPass ? 0.56 : 0.92) * windup
        : THREE.MathUtils.lerp(isShortPass ? 0.56 : 0.92, isShortPass ? 0.32 : 0.1, strike);
      const followRoll = (isShortPass ? 0.08 : 0.16) * (1 - follow);
      this.setRpmPose("hips", 0.02, torsoTwist * 0.2, this.turnLean * 0.08 - followRoll, blend);
      this.setRpmPose("spine", torsoLean + follow * 0.08, torsoTwist * 0.55, this.turnLean * 0.16, blend);
      this.setRpmPose("chest", torsoLean * 0.95, torsoTwist, this.turnLean * 0.22, blend);
      this.setRpmPose("head", 0.04 + follow * 0.04, -torsoTwist * 0.22, -this.turnLean * 0.1, blend);
      this.setRpmPose("leftUpperLeg", supportLegX, -0.04, -0.08, blend);
      this.setRpmPose("leftLowerLeg", isShortPass ? 0.2 : 0.28 + follow * 0.08, 0, 0, blend);
      this.setRpmPose("leftFoot", -0.08 - follow * 0.04, 0, 0, blend);
      this.setRpmPose("rightUpperLeg", kickLegX, 0.08, 0.14, blend);
      this.setRpmPose("rightLowerLeg", kickKnee, 0, 0, blend);
      this.setRpmPose("rightFoot", kickPhase < 0.34 ? -0.22 * windup : THREE.MathUtils.lerp(-0.22, 0.2, strike), 0, 0, blend);
      this.setRpmPose("leftUpperArm", isShortPass ? -0.18 : -0.34 + follow * 0.12, -0.08, -0.18, blend);
      this.setRpmPose("rightUpperArm", isShortPass ? 0.16 : 0.3, 0.12, 0.18, blend);
      this.setRpmPose("leftLowerArm", -0.52, -0.04, -0.06, blend);
      this.setRpmPose("rightLowerArm", -0.34, 0.06, 0.08, blend);
      this.rpmAvatar.position.y = Math.sin(kickPhase * Math.PI) * (isShortPass ? 0.015 : 0.03);
      return;
    }

    if (this.charge) {
      const hold = clamp01(this.charge.hold / 1.3);
      const isShotCharge = this.charge.type === "Space";
      const isLongPassCharge = this.charge.type === "KeyQ";
      const sway = Math.sin(this.runTime * 1.9) * 0.02;
      const torsoLean = isShotCharge ? -0.14 - hold * 0.16 : isLongPassCharge ? -0.1 - hold * 0.12 : -0.06 - hold * 0.08;
      const torsoTwist = isShotCharge ? -0.24 - hold * 0.1 : isLongPassCharge ? -0.18 - hold * 0.12 : -0.1 - hold * 0.06;
      this.setRpmPose("hips", 0.02, torsoTwist * 0.2, sway + this.turnLean * 0.08, blend);
      this.setRpmPose("spine", torsoLean, torsoTwist * 0.45, this.turnLean * 0.14, blend);
      this.setRpmPose("chest", torsoLean * 0.9, torsoTwist, this.turnLean * 0.18, blend);
      this.setRpmPose("head", 0.05, -torsoTwist * 0.24, -this.turnLean * 0.08, blend);
      this.setRpmPose("leftUpperLeg", 0.14, -0.04, -0.08, blend);
      this.setRpmPose("leftLowerLeg", 0.22 + hold * 0.08, 0, 0, blend);
      this.setRpmPose("rightUpperLeg", 0.18 + hold * 0.44, 0.08, 0.14, blend);
      this.setRpmPose("rightLowerLeg", 0.3 + hold * 0.44, 0, 0, blend);
      this.setRpmPose("rightFoot", -0.08 - hold * 0.16, 0, 0, blend);
      this.setRpmPose("leftUpperArm", isShotCharge ? -0.32 : -0.2, -0.1, -0.16, blend);
      this.setRpmPose("rightUpperArm", isShotCharge ? 0.24 : 0.12, 0.12, 0.18, blend);
      this.setRpmPose("leftLowerArm", -0.56, -0.04, -0.06, blend);
      this.setRpmPose("rightLowerArm", -0.28, 0.06, 0.08, blend);
      this.rpmAvatar.position.y = 0.008 + Math.abs(Math.sin(this.runTime * 1.6)) * 0.006;
      return;
    }

    if (locomotionActive) {
      const stride = THREE.MathUtils.clamp(actualSpeed / Math.max(0.01, sprinting ? this.sprintSpeed : this.walkSpeed), 0.15, 1);
      const step = Math.sin(this.runTime);
      const counter = Math.sin(this.runTime + Math.PI);
      const sway = Math.sin(this.runTime * 0.5);
      const dribbleBias = hasBall && !sprinting ? Math.max(0, Math.sin(this.runTime * 2.2)) * 0.14 : 0;
      const legAmp = sprinting ? 0.92 : movingBack ? 0.34 : hasBall ? 0.48 : 0.62;
      const armAmp = sprinting ? 0.5 : movingBack ? 0.18 : hasBall ? 0.2 : 0.34;
      const kneeAmp = sprinting ? 0.42 : hasBall ? 0.26 : 0.34;
      const torsoLean = sprinting ? -0.18 : movingBack ? 0.08 : hasBall ? -0.07 : -0.11;
      const moveSign = movingBack ? -1 : 1;
      const leftLeg = -step * legAmp * stride * moveSign + dribbleBias * 0.4;
      const rightLeg = -counter * legAmp * stride * moveSign - dribbleBias;
      const leftArm = counter * armAmp * stride * (movingBack ? -1 : 1);
      const rightArm = step * armAmp * stride * (movingBack ? -1 : 1);
      this.setRpmPose("hips", 0.01, sway * 0.02, this.turnLean * 0.1, blend);
      this.setRpmPose("spine", torsoLean, 0, this.turnLean * 0.16 + sway * 0.03, blend);
      this.setRpmPose("chest", torsoLean * 0.8, hasBall ? sway * 0.04 : 0, this.turnLean * 0.2, blend);
      this.setRpmPose("head", movingBack ? 0.04 : 0, Math.sin(this.runTime * 0.38) * 0.03, -this.turnLean * 0.08, blend);
      this.setRpmPose("leftUpperLeg", leftLeg, 0, -sway * 0.05, blend);
      this.setRpmPose("rightUpperLeg", rightLeg, 0, sway * 0.05, blend);
      this.setRpmPose("leftLowerLeg", Math.max(0, step) * kneeAmp * stride, 0, 0, blend);
      this.setRpmPose("rightLowerLeg", Math.max(0, counter) * kneeAmp * stride, 0, 0, blend);
      this.setRpmPose("leftFoot", -Math.max(0, -leftLeg) * 0.22, 0, 0, blend);
      this.setRpmPose("rightFoot", -Math.max(0, -rightLeg) * 0.22, 0, 0, blend);
      this.setRpmPose("leftUpperArm", leftArm - 0.16, -0.04, hasBall ? -0.08 : -0.12, blend);
      this.setRpmPose("rightUpperArm", rightArm - 0.16, 0.04, hasBall ? 0.08 : 0.12, blend);
      this.setRpmPose("leftLowerArm", -0.34 - Math.abs(leftArm) * 0.42, 0, -0.04, blend);
      this.setRpmPose("rightLowerArm", -0.34 - Math.abs(rightArm) * 0.42, 0, 0.04, blend);
      this.rpmAvatar.position.y = Math.abs(Math.sin(this.runTime * 2)) * (sprinting ? 0.026 : 0.016 + stride * 0.008);
      return;
    }

    const breath = Math.sin(this.runTime * 0.9);
    const sway = Math.sin(this.runTime * 0.42);
    this.setRpmPose("hips", 0.01 + breath * 0.015, sway * 0.02, sway * 0.02, blend * 0.55);
    this.setRpmPose("spine", -0.02 + breath * 0.04, 0, sway * 0.03, blend * 0.55);
    this.setRpmPose("chest", -0.03 + breath * 0.05, 0, sway * 0.04, blend * 0.55);
    this.setRpmPose("head", 0.01, sway * 0.06, -sway * 0.02, blend * 0.5);
    this.setRpmPose("leftUpperLeg", sway * 0.03, 0, -0.02, blend * 0.5);
    this.setRpmPose("rightUpperLeg", -sway * 0.03, 0, 0.02, blend * 0.5);
    this.setRpmPose("leftLowerLeg", 0.02, 0, 0, blend * 0.45);
    this.setRpmPose("rightLowerLeg", 0.02, 0, 0, blend * 0.45);
    this.setRpmPose("leftUpperArm", -0.16 + breath * 0.03, -0.04, -0.08, blend * 0.5);
    this.setRpmPose("rightUpperArm", -0.16 - breath * 0.03, 0.04, 0.08, blend * 0.5);
    this.setRpmPose("leftLowerArm", -0.38, 0, -0.04, blend * 0.45);
    this.setRpmPose("rightLowerArm", -0.38, 0, 0.04, blend * 0.45);
    this.rpmAvatar.position.y = Math.abs(breath) * 0.008;
  }

  applyRpmClipArmCorrection(dt, isMoving, sprinting, inputForward = 0) {
    if (!this.rpmAvatar || !this.rpmRig) return;
    if (this.useDirectFbxClips) return;
    const blend = THREE.MathUtils.clamp(dt * 10, 0.08, 0.38);
    const movingBack = isMoving && inputForward < -0.15;
    const wave = Math.sin(this.runTime * (sprinting ? 1.25 : 1.0));
    const armAmp = isMoving ? (sprinting ? 0.38 : 0.24) : 0.08;
    const arm = wave * armAmp * (movingBack ? -0.8 : 1);

    this.setRpmPose("leftUpperArm", arm - 0.2, -0.04, -0.05, blend);
    this.setRpmPose("rightUpperArm", -arm - 0.2, 0.04, 0.05, blend);
    this.setRpmPose("leftLowerArm", -0.58 - Math.abs(arm) * 0.24, 0, -0.08, blend);
    this.setRpmPose("rightLowerArm", -0.58 - Math.abs(arm) * 0.24, 0, 0.08, blend);
    this.setRpmPose("chest", isMoving ? -0.06 : -0.02, 0, this.turnLean * 0.12, blend);
  }

  isBallInControlRange() {
    const ball = window.game?.ball;
    if (!ball || !ball.body) return false;
    if (performance.now() - this.lastKickTime < 450) return false;
    const pPos = this.mesh.position;
    const bBody = ball.body;
    const ballPos = this.tempBallPos.set(bBody.position.x, bBody.position.y, bBody.position.z);
    
    const dist = pPos.distanceTo(ballPos);
    if (dist > 2.0 || ballPos.y > 1.5) return false;

    // Check if ball is roughly in front or side, not behind
    const facing = this.tempFacing.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0);
    const toBall = this.tempDriveDir.copy(ballPos).sub(pPos).setY(0).normalize();
    return facing.dot(toBall) > -0.2;
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat && e.code === "KeyV") return;
      if (this.celebration.active) {
        this.keys[e.code] = false;
        return;
      }
      this.keys[e.code] = true;
      if (e.code === "ArrowLeft") this.spinInput = -1;
      if (e.code === "ArrowRight") this.spinInput = 1;

      if (e.code === "KeyC") this.skillState.cHeld = true;
      if (this.skillState.cHeld && /^Digit([1-9]|0)$/.test(e.code)) {
        const index = e.code === "Digit0" ? 10 : Number(e.code.replace("Digit", ""));
        this.queueSkill(index);
      }

      if (["Space", "KeyE", "KeyQ"].includes(e.code) && !this.charge && !this.slideState.active && !this.isSkillActive()) {
        this.charge = { type: e.code, hold: 0 };
        this.onChargeStart?.(this.getChargeLabel());
      }

      if (e.code === "KeyV") {
        this.mode = this.mode === "thirdPerson" ? "isometric" : "thirdPerson";
        this.onCameraMode?.(this.mode);
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      if (this.celebration.active) return;
      if (e.code === "ArrowLeft" && this.spinInput === -1) this.spinInput = 0;
      if (e.code === "ArrowRight" && this.spinInput === 1) this.spinInput = 0;
      if (e.code === "KeyC") this.skillState.cHeld = false;

      if (this.charge && e.code === this.charge.type) {
        this.onChargeRelease?.({ ...this.charge, falso: this.falso });
        this.charge = null;
        this.falso = 0;
        this.falsoType = null;
        this.onChargeEnd?.();
        this.onFalsoUpdate?.(0);
      }
    });
  }

  getChargeLabel() {
    if (!this.charge) return "Guc";
    if (this.charge.type === "Space") return "Sut gucu";
    if (this.charge.type === "KeyE") return "Qisa pas gucu";
    return "Uzun pas gucu";
  }

  emitSkillEvent(phase, state, extra = {}) {
    if (!state) return;
    this.onSkillEvent?.({
      attemptId: state.attemptId,
      slot: state.descriptor.slot,
      skillId: state.descriptor.id,
      phase,
      success: !!state.success,
      beatDefender: !!state.beatDefender,
      cleanExit: !!state.cleanExit,
      airRecovery: !!state.airRecovery,
      exitSpeedApplied: !!state.exitSpeedApplied,
      perfectTiming: !!state.perfectTiming,
      ...extra,
    });
  }

  blockSkill(descriptor, reason = "blocked") {
    const attemptId = ++this.skillAttemptSerial;
    this.skillState.lockUntil = performance.now() + 180;
    this.onSkillEvent?.({
      attemptId,
      slot: descriptor.slot,
      skillId: descriptor.id,
      phase: "blocked",
      success: false,
      beatDefender: false,
      cleanExit: false,
      airRecovery: false,
      exitSpeedApplied: false,
      perfectTiming: false,
      reason,
    });
  }

  getSkillExitSideSign(descriptor, fakeSideSign) {
    switch (descriptor.id) {
      case "roulette":
      case "mcgeady_spin":
      case "rainbow_flick":
      case "sombrero_flick":
      case "hocus_pocus":
        return fakeSideSign || 1;
      default:
        return -(fakeSideSign || 1);
    }
  }

  computeSkillExitDirection(descriptor, facing, side, fakeSideSign, inputForward = 0) {
    const exitSideSign = this.getSkillExitSideSign(descriptor, fakeSideSign);
    const dir = this.tempSkillVec.copy(facing);
    if (descriptor.id === "stepover") {
      dir.multiplyScalar(0.96).addScaledVector(side, exitSideSign * 0.24);
    } else if (descriptor.id === "roulette") {
      dir.multiplyScalar(0.74).addScaledVector(side, exitSideSign * 0.72);
    } else if (descriptor.id === "elastico") {
      dir.multiplyScalar(0.84).addScaledVector(side, exitSideSign * 0.92);
    } else if (descriptor.id === "cruyff_turn" || descriptor.id === "rabona_fake") {
      dir.multiplyScalar(-0.4).addScaledVector(side, exitSideSign * 0.98);
    } else if (descriptor.id === "mcgeady_spin") {
      dir.multiplyScalar(0.62).addScaledVector(side, exitSideSign * 0.96);
    } else if (descriptor.id === "la_croqueta") {
      dir.multiplyScalar(0.5).addScaledVector(side, exitSideSign * 1.08);
    } else if (descriptor.id === "hocus_pocus") {
      dir.multiplyScalar(0.82).addScaledVector(side, exitSideSign * 0.34);
    } else if (descriptor.exit.vectorMode === "recoveryChase") {
      dir.multiplyScalar(0.92).addScaledVector(side, exitSideSign * 0.34);
    } else {
      dir.addScaledVector(side, exitSideSign * (descriptor.id === "la_croqueta" ? 0.62 : 0.42));
      if (inputForward < 0) dir.addScaledVector(facing, -0.18);
      if (inputForward > 0) dir.addScaledVector(facing, 0.12);
    }
    if (dir.lengthSq() < 0.0001) dir.copy(facing);
    return dir.normalize().clone();
  }

  startSkill(slot, inputRight = 0, inputForward = 0) {
    const descriptor = getSkillBySlot(slot);
    const ball = window.game?.ball;
    if (!ball) {
      this.blockSkill(descriptor, "no_ball");
      return false;
    }

    const ballPos = this.tempSkillVec.set(ball.body.position.x, ball.body.position.y, ball.body.position.z);
    const ballVel = this.tempSkillVec2.set(ball.body.velocity.x, ball.body.velocity.y, ball.body.velocity.z);
    const playerPos = this.mesh.position;
    const facing = this.tempSkillFwd.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0);
    if (facing.lengthSq() < 0.0001) facing.set(1, 0, 0);
    facing.normalize();
    const side = this.tempSkillSide.set(-facing.z, 0, facing.x);
    const dist = playerPos.distanceTo(ballPos);
    const carrierSpeed = this.velocity.length();

    if (dist > 2.4) {
      this.blockSkill(descriptor, "ball_far");
      return false;
    }
    if (descriptor.requires.grounded && ballPos.y > descriptor.requires.maxBallHeight) {
      this.blockSkill(descriptor, "ball_height");
      return false;
    }
    if (carrierSpeed > descriptor.requires.maxCarrierSpeed) {
      this.blockSkill(descriptor, "carrier_speed");
      return false;
    }

    const fakeSideSign = inputRight !== 0 ? Math.sign(inputRight) : 1;
    const exitSideSign = this.getSkillExitSideSign(descriptor, fakeSideSign);
    const exitDir = this.computeSkillExitDirection(descriptor, facing, side, fakeSideSign, inputForward);
    const totalDuration = descriptor.phases.reduce((sum, phase) => sum + phase.duration, 0);
    const defenderPos = this.skillContext?.getDefenderPosition?.() || playerPos.clone().addScaledVector(facing, 2.4);
    const arcTravel = descriptor.ballProfile.parabola?.travel || 3.0;
    const arcEnd = this.tempSkillVec3.copy(ballPos).addScaledVector(exitDir, arcTravel).addScaledVector(side, fakeSideSign * 0.22);
    if (descriptor.id === "rainbow_flick") {
      arcEnd.copy(ballPos).addScaledVector(facing, arcTravel * 1.02).addScaledVector(side, fakeSideSign * 0.1);
    } else if (descriptor.id === "sombrero_flick") {
      arcEnd.copy(ballPos).addScaledVector(exitDir, arcTravel * 0.86).addScaledVector(side, exitSideSign * 0.54);
    } else if (descriptor.id === "hocus_pocus") {
      arcEnd.copy(ballPos).addScaledVector(exitDir, arcTravel * 0.88).addScaledVector(side, exitSideSign * 0.1);
    }

    const controlPoint = this.tempSkillVec4.copy(defenderPos).addScaledVector(facing, 0.18);
    if (descriptor.id === "hocus_pocus") {
      controlPoint.addScaledVector(side, fakeSideSign * 0.18).addScaledVector(facing, -0.12);
    }

    const state = {
      descriptor,
      attemptId: ++this.skillAttemptSerial,
      phaseIndex: 0,
      phase: descriptor.phases[0].name,
      phaseTime: 0,
      phaseProgress: 0,
      totalProgress: 0,
      totalDuration,
      fakeSideSign,
      exitSideSign,
      inputForward,
      startPosition: playerPos.clone(),
      startRotation: this.mesh.rotation.y,
      ballStart: ballPos.clone(),
      ballLast: ballPos.clone(),
      facing: facing.clone(),
      side: side.clone(),
      exitDir,
      defenderPos: defenderPos.clone(),
      arcEnd: arcEnd.clone(),
      controlPoint: controlPoint.clone(),
      resolutionChecked: false,
      exitChecked: false,
      success: false,
      beatDefender: false,
      cleanExit: false,
      airRecovery: false,
      perfectTiming: false,
      exitSpeedApplied: false,
    };

    this.skillState.active = state;
    this.skillState.lockUntil = performance.now() + totalDuration * 1000 + 240;
    this.velocity.multiplyScalar(0.34);
    this.lastKickTime = performance.now();
    this.pendingRpmSkillName = descriptor.animation.clipName;
    this.emitSkillEvent(state.phase, state);
    return true;
  }

  advanceSkillPhase(state) {
    if (!state) return false;
    state.phaseIndex += 1;
    if (state.phaseIndex >= state.descriptor.phases.length) return false;
    state.phase = state.descriptor.phases[state.phaseIndex].name;
    state.phaseTime = 0;
    state.phaseProgress = 0;
    this.emitSkillEvent(state.phase, state);
    return true;
  }

  updateSkill(dt) {
    const state = this.skillState.active;
    if (!state) return false;

    const currentPhase = state.descriptor.phases[state.phaseIndex];
    state.phaseTime += dt;
    state.phaseProgress = clamp01(state.phaseTime / Math.max(0.0001, currentPhase.duration));
    state.totalProgress = clamp01(
      (state.descriptor.phases
        .slice(0, state.phaseIndex)
        .reduce((sum, phase) => sum + phase.duration, 0) + state.phaseTime) / state.totalDuration
    );

    if (!state.resolutionChecked) {
      const biteWindow = state.descriptor.defenderCue?.biteWindow || [0.28, 0.52];
      const biteCenter = (biteWindow[0] + biteWindow[1]) * 0.5;
      if (state.totalProgress >= biteCenter) {
        const result = this.skillContext?.resolveSkillWindow?.({
          attemptId: state.attemptId,
          descriptor: state.descriptor,
          normalizedTime: state.totalProgress,
          fakeSideSign: state.fakeSideSign,
          exitSideSign: state.exitSideSign,
          playerPos: this.mesh.position.clone(),
          ballPos: this.tempSkillVec.set(
            window.game?.ball?.body.position.x || 0,
            window.game?.ball?.body.position.y || 0,
            window.game?.ball?.body.position.z || 0
          ),
        });
        state.resolutionChecked = true;
        state.success = !!result?.success;
        state.beatDefender = !!result?.beatDefender;
        state.perfectTiming = !!result?.perfectTiming;
      }
    }

    if (!state.exitChecked && state.phase === "exit" && state.phaseProgress >= 0.72) {
      const result = this.skillContext?.confirmSkillExit?.({
        attemptId: state.attemptId,
        descriptor: state.descriptor,
        playerPos: this.mesh.position.clone(),
        ballPos: this.tempSkillVec.set(
          window.game?.ball?.body.position.x || 0,
          window.game?.ball?.body.position.y || 0,
          window.game?.ball?.body.position.z || 0
        ),
      });
      state.cleanExit = !!result?.cleanExit;
      state.airRecovery = !!result?.airRecovery;
      state.exitChecked = true;
    }

    if (!state.exitSpeedApplied && state.phase === "exit" && state.success) {
      this.exitBoost.timeLeft = state.descriptor.exit.duration;
      this.exitBoost.multiplier = state.descriptor.exit.multiplier;
      this.exitBoost.direction.copy(state.exitDir);
      state.exitSpeedApplied = true;
    }

    this.applySkillMovement(state, dt);
    this.applySkillBallControl(state, dt);
    this.applySkillAnimation(state, dt);

    if (state.phaseTime >= currentPhase.duration) {
      const advanced = this.advanceSkillPhase(state);
      if (!advanced) {
        if (isArcSkill(state.descriptor)) this.lastKickTime = performance.now();
        this.emitSkillEvent("finished", state);
        this.resetSkillState({ preserveExitBoost: !!state.success && !!state.exitSpeedApplied });
      }
    }

    return true;
  }

  applySkillMovement(state, dt) {
    const phase = state.phase;
    const phaseProgress = state.phaseProgress;
    const phaseSpeed = this.tempSkillVec.set(0, 0, 0);
    const fakeDir = this.tempSkillVec2.copy(state.facing).addScaledVector(state.side, state.fakeSideSign * 0.24).normalize();
    const burst = state.success ? state.descriptor.exit.multiplier : 0.82;

    switch (state.descriptor.id) {
      case "stepover":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.24).addScaledVector(state.side, state.fakeSideSign * 0.5);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(0.52).addScaledVector(state.side, state.fakeSideSign * 0.3);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * 1.12);
        break;
      case "roulette":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.14);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(0.54).addScaledVector(state.side, state.fakeSideSign * 2.2);
        else if (phase === "shield") phaseSpeed.copy(state.facing).multiplyScalar(0.34).addScaledVector(state.side, -state.fakeSideSign * 2.0);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * 1.12);
        break;
      case "elastico":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.2);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(2.8).addScaledVector(state.side, state.fakeSideSign * 1.8);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * 1.24);
        break;
      case "rainbow_flick":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.08);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(0.2);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * (phaseProgress < 0.34 ? 0.62 : 1.18));
        break;
      case "cruyff_turn":
        if (phase === "telegraph") phaseSpeed.copy(fakeDir).multiplyScalar(2.2);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(-1.4).addScaledVector(state.side, state.fakeSideSign * 0.58);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst);
        break;
      case "mcgeady_spin":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.26);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(0.82).addScaledVector(state.side, state.fakeSideSign * 2.3);
        else if (phase === "shield") phaseSpeed.copy(state.facing).multiplyScalar(0.6).addScaledVector(state.side, -state.fakeSideSign * 1.9);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * 1.2);
        break;
      case "la_croqueta":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.44);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(1.35).addScaledVector(state.side, state.exitSideSign * 2.2);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * 1.12);
        break;
      case "rabona_fake":
        if (phase === "telegraph") phaseSpeed.copy(fakeDir).multiplyScalar(1.2);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(-1.1).addScaledVector(state.side, state.fakeSideSign * 1.2);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * 1.05);
        break;
      case "hocus_pocus":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.3).addScaledVector(state.side, state.fakeSideSign * 0.7);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(1.7).addScaledVector(state.side, state.fakeSideSign * 0.24);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * 1.18);
        break;
      case "sombrero_flick":
        if (phase === "telegraph") phaseSpeed.copy(state.facing).multiplyScalar(0.1);
        else if (phase === "contact") phaseSpeed.copy(state.facing).multiplyScalar(0.18).addScaledVector(state.side, state.fakeSideSign * 0.16);
        else phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst * (phaseProgress < 0.28 ? 0.58 : 1.15));
        break;
      default:
        if (phase === "telegraph") {
          phaseSpeed.copy(fakeDir).multiplyScalar(1.4);
        } else if (phase === "contact") {
          phaseSpeed.copy(state.facing).multiplyScalar(1.8).addScaledVector(state.side, state.fakeSideSign * 0.8);
        } else if (phase === "shield") {
          phaseSpeed.copy(state.facing).multiplyScalar(1.1).addScaledVector(state.side, -state.fakeSideSign * 1.4);
        } else {
          phaseSpeed.copy(state.exitDir).multiplyScalar(this.walkSpeed * burst);
        }
        break;
    }

    const lerpAlpha = Math.min(1, dt * (phase === "exit" ? 10 : 14));
    this.velocity.lerp(phaseSpeed, lerpAlpha);
    this.mesh.position.addScaledVector(this.velocity, dt);

    const targetLook = phase === "exit" || state.descriptor.id === "cruyff_turn" || state.descriptor.id === "rabona_fake"
      ? state.exitDir
      : fakeDir;
    let targetYaw = Math.atan2(targetLook.x, targetLook.z);
    if (state.descriptor.id === "roulette") {
      targetYaw += smoothstep(0.14, 0.82, state.totalProgress) * Math.PI * 1.62 * state.exitSideSign;
    } else if (state.descriptor.id === "mcgeady_spin") {
      targetYaw += smoothstep(0.16, 0.84, state.totalProgress) * Math.PI * 1.24 * state.exitSideSign;
    }
    this.mesh.rotation.y = this.dampAngle(this.mesh.rotation.y, targetYaw, phase === "exit" ? 18 : 12, dt);

    if (state.descriptor.id === "cruyff_turn" && phase !== "telegraph") {
      this.mesh.rotation.y = this.dampAngle(this.mesh.rotation.y, targetYaw + Math.PI * 0.08, 10, dt);
    }
  }

  getSkillBallTarget(state) {
    const ball = window.game?.ball;
    const playerPos = this.mesh.position;
    const groundY = 0.225;
    const descriptor = state.descriptor;
    const t = state.totalProgress;
    const out = this.tempSkillBallTarget;

    if (descriptor.ballProfile.mode === "orbit") {
      if (descriptor.id === "stepover") {
        const stillness = 1 - smoothstep(0.48, 0.88, t);
        out.copy(state.ballStart)
          .addScaledVector(state.side, Math.sin(t * Math.PI) * state.fakeSideSign * 0.14 * stillness)
          .addScaledVector(state.facing, 0.06 * stillness);
      } else {
        const spinT = smoothstep(0.12, 0.82, t);
        const angle = descriptor.id === "mcgeady_spin"
          ? THREE.MathUtils.lerp(-0.54 * state.fakeSideSign, Math.PI * 1.26 * state.exitSideSign, spinT)
          : THREE.MathUtils.lerp(-0.42 * state.fakeSideSign, Math.PI * 0.98 * state.exitSideSign, spinT);
        const radius = descriptor.id === "mcgeady_spin" ? 0.82 : 0.68;
        out.copy(playerPos)
          .addScaledVector(state.facing, 0.56 + Math.cos(angle) * 0.22)
          .addScaledVector(state.side, Math.sin(angle) * radius);
      }
      if (state.phase === "exit") {
        out.copy(playerPos).addScaledVector(state.exitDir, descriptor.id === "mcgeady_spin" ? 1.25 : 1.1);
      }
      out.y = groundY;
      return out;
    }

    if (descriptor.ballProfile.mode === "soleSpin") {
      const spinT = smoothstep(0.08, 0.82, t);
      const angle = THREE.MathUtils.lerp(-0.35 * state.fakeSideSign, Math.PI * 1.42 * state.exitSideSign, spinT);
      out.copy(playerPos)
        .addScaledVector(state.facing, 0.44 + Math.cos(angle) * 0.2)
        .addScaledVector(state.side, Math.sin(angle) * 0.86);
      if (state.phase === "exit") out.copy(playerPos).addScaledVector(state.exitDir, 1.08);
      out.y = groundY;
      return out;
    }

    if (descriptor.ballProfile.mode === "snap") {
      const snapLateral = descriptor.id === "la_croqueta"
        ? THREE.MathUtils.lerp(-state.fakeSideSign * 0.24, state.exitSideSign * 0.65, smoothstep(0.12, 0.62, t))
        : (t < 0.44
          ? state.fakeSideSign * 0.7
          : THREE.MathUtils.lerp(state.fakeSideSign * 0.7, state.exitSideSign * 0.06, smoothstep(0.44, 0.78, t)));
      out.copy(playerPos)
        .addScaledVector(state.facing, descriptor.id === "la_croqueta" ? 0.78 : 0.9)
        .addScaledVector(state.side, snapLateral);
      if (state.phase === "exit") out.copy(playerPos).addScaledVector(state.exitDir, descriptor.id === "la_croqueta" ? 1.02 : 1.05);
      out.y = groundY;
      return out;
    }

    if (descriptor.ballProfile.mode === "dragBack") {
      if (t < 0.58) {
        const drag = smoothstep(0.18, 0.58, t);
        out.copy(playerPos)
          .addScaledVector(state.facing, descriptor.id === "cruyff_turn" ? 1.05 - drag * 1.2 : 0.9 - drag * 0.82)
          .addScaledVector(state.side, state.fakeSideSign * (descriptor.id === "rabona_fake" ? 0.36 : 0.12));
      } else {
        out.copy(playerPos)
          .addScaledVector(state.exitDir, descriptor.id === "rabona_fake" ? 0.9 : 1.05)
          .addScaledVector(state.side, descriptor.id === "rabona_fake" ? state.exitSideSign * -0.16 : state.exitSideSign * 0.08);
      }
      out.y = groundY;
      return out;
    }

    if (descriptor.ballProfile.mode === "arcFlick") {
      const arcT = smoothstep(0.22, 1, t);
      out.lerpVectors(state.ballStart, state.arcEnd, arcT);
      const lift = Math.max(0.55, (descriptor.ballProfile.parabola?.apex || 1.5) - state.ballStart.y);
      out.y = state.ballStart.y + lift * 4 * arcT * (1 - arcT);
      return out;
    }

    if (descriptor.ballProfile.mode === "nutmegArc") {
      const nutT = smoothstep(0.18, 1, t);
      bezierPoint(out, state.ballStart, state.controlPoint, state.arcEnd, nutT);
      out.y = groundY + Math.sin(nutT * Math.PI) * 0.22;
      return out;
    }

    if (ball) out.set(ball.body.position.x, ball.body.position.y, ball.body.position.z);
    return out;
  }

  applySkillBallControl(state, dt) {
    const ball = window.game?.ball;
    if (!ball) return;
    const body = ball.body;
    body.wakeUp();

    const current = this.tempSkillVec5.set(body.position.x, body.position.y, body.position.z);
    const target = this.getSkillBallTarget(state);
    const velocity = this.tempSkillVec.copy(target).sub(current).multiplyScalar(Math.min(28, 1 / Math.max(0.016, dt)));

    body.position.set(target.x, target.y, target.z);
    body.velocity.set(velocity.x, velocity.y, velocity.z);

    const spinAmount = state.descriptor.ballProfile.spin || 0;
    if (isArcSkill(state.descriptor)) {
      body.angularVelocity.set(
        state.side.x * spinAmount,
        state.fakeSideSign * spinAmount,
        state.side.z * spinAmount
      );
    } else if (isNutmegSkill(state.descriptor)) {
      body.angularVelocity.set(
        state.facing.x * spinAmount * 0.4,
        state.exitSideSign * spinAmount,
        state.facing.z * spinAmount * 0.4
      );
    } else {
      body.angularVelocity.set(
        state.side.x * 2.2,
        state.fakeSideSign * spinAmount,
        state.side.z * 2.2
      );
    }
  }

  applySkillAnimation(state, dt) {
    if (this.rpmAvatar) {
      this.applySkillRpmFallbackPose(state, dt);
      return;
    }

    this.applySkillProceduralPose(state, dt);
  }

  applySkillRpmAccent(state, dt) {
    const lean = state.phase === "exit" ? -0.12 : -0.04;
    const roll = state.fakeSideSign * (state.phase === "telegraph" ? 0.12 : 0.04);
    this.setRpmPose("chest", lean, 0, roll, Math.min(1, dt * 8));
    this.setRpmPose("head", 0.04, 0, -roll * 0.4, Math.min(1, dt * 8));
    if (state.phase === "exit") this.rpmAvatar.position.y = Math.sin(state.phaseProgress * Math.PI) * 0.05;
  }

  applySkillRpmFallbackPose(state, dt) {
    const blend = Math.min(1, dt * 10);
    const side = state.fakeSideSign;
    const exit = state.exitSideSign;
    const tele = state.phase === "telegraph" ? state.phaseProgress : 0;
    const exitBlend = state.phase === "exit" ? state.phaseProgress : 0;
    const skillId = state.descriptor.id;

    this.setRpmPose("spine", -0.08 - tele * 0.08, 0, side * 0.1, blend);
    this.setRpmPose("chest", -0.06 - exitBlend * 0.08, 0, side * 0.14, blend);
    this.setRpmPose("head", 0.02, side * 0.04, -side * 0.06, blend);
    this.setRpmPose("leftUpperArm", -0.26 + exitBlend * 0.18, -0.04, -0.16, blend);
    this.setRpmPose("rightUpperArm", -0.26 - exitBlend * 0.18, 0.04, 0.16, blend);
    this.setRpmPose("leftLowerArm", -0.62, 0, -0.08, blend);
    this.setRpmPose("rightLowerArm", -0.62, 0, 0.08, blend);
    this.setRpmPose("leftUpperLeg", 0.1 + tele * 0.3, 0, -side * 0.06, blend);
    this.setRpmPose("rightUpperLeg", -0.02 + exitBlend * 0.18, 0, side * 0.08, blend);
    this.setRpmPose("leftLowerLeg", 0.26 + tele * 0.2, 0, 0, blend);
    this.setRpmPose("rightLowerLeg", 0.16 + exitBlend * 0.14, 0, 0, blend);
    this.setRpmPose("leftFoot", -0.08, 0, 0, blend);
    this.setRpmPose("rightFoot", 0.08 + exit * 0.04, 0, 0, blend);

    if (skillId === "roulette" || skillId === "mcgeady_spin") {
      this.setRpmPose("chest", -0.14, -side * 0.18, -side * 0.22, blend);
      this.setRpmPose("head", 0.06, side * 0.08, side * 0.04, blend);
    } else if (skillId === "cruyff_turn" || skillId === "rabona_fake") {
      this.setRpmPose("leftUpperArm", -0.1, -0.18, -0.28, blend);
      this.setRpmPose("rightUpperArm", -0.1, 0.18, 0.28, blend);
      this.setRpmPose("head", 0.14, 0, 0, blend);
    } else if (skillId === "rainbow_flick" || skillId === "sombrero_flick") {
      this.setRpmPose("spine", -0.2, 0, side * 0.06, blend);
      this.setRpmPose("chest", -0.22, 0, side * 0.08, blend);
    } else if (skillId === "hocus_pocus") {
      this.setRpmPose("leftUpperLeg", 0.18, 0, -side * 0.02, blend);
      this.setRpmPose("rightUpperLeg", 0.04, 0, side * 0.02, blend);
    }

    this.rpmAvatar.position.y = Math.sin(state.totalProgress * Math.PI) * 0.04;
  }

  applySkillProceduralPose(state, dt) {
    const side = state.fakeSideSign;
    const exit = state.exitSideSign;
    const tele = state.phase === "telegraph" ? state.phaseProgress : 0;
    const contact = state.phase === "contact" ? state.phaseProgress : 0;
    const shield = state.phase === "shield" ? state.phaseProgress : 0;
    const exitBlend = state.phase === "exit" ? state.phaseProgress : 0;
    const flickSkill = isArcSkill(state.descriptor);
    const dragSkill = state.descriptor.ballProfile.mode === "dragBack";
    const spinSkill = state.descriptor.ballProfile.mode === "orbit" || state.descriptor.ballProfile.mode === "soleSpin";
    const skillId = state.descriptor.id;

    const supportLeg = side > 0 ? "left" : "right";
    const actionLeg = supportLeg === "left" ? "right" : "left";

    const supportPose = flickSkill
      ? { hipX: -0.18, hipY: 0, hipZ: -side * 0.08, kneeX: 0.42, footX: 0.04, footZ: 0 }
      : { hipX: -0.06 + tele * 0.12, hipY: 0, hipZ: -side * 0.06, kneeX: 0.34 + contact * 0.12, footX: 0.02, footZ: 0 };
    const actionPose = dragSkill
      ? { hipX: 0.34 + tele * 0.22 - exitBlend * 0.24, hipY: side * 0.04, hipZ: side * 0.12, kneeX: 0.72 - exitBlend * 0.4, footX: -0.2 + exitBlend * 0.26, footZ: -side * 0.05 }
      : spinSkill
        ? { hipX: 0.16 + contact * 0.28 - exitBlend * 0.12, hipY: side * 0.05, hipZ: side * 0.16, kneeX: 0.62 - exitBlend * 0.18, footX: -0.14 + exitBlend * 0.16, footZ: -side * 0.08 }
        : { hipX: 0.24 + tele * 0.18 - exitBlend * 0.14, hipY: side * 0.05, hipZ: side * 0.12, kneeX: 0.68 - exitBlend * 0.24, footX: -0.18 + exitBlend * 0.18, footZ: -side * 0.04 };

    const t = state.totalProgress;
    const pulse = Math.sin(t * Math.PI);
    const doublePulse = Math.sin(t * Math.PI * 2);
    const quadPulse = Math.sin(t * Math.PI * 4);

    let torsoX = flickSkill
      ? -0.2 - contact * 0.14 + exitBlend * 0.08
      : dragSkill
        ? -0.1 - tele * 0.18 + exitBlend * 0.04
        : -0.08 - tele * 0.1 + exitBlend * 0.02;
    let torsoY = dragSkill ? -side * 0.34 + exit * exitBlend * 0.26 : side * 0.22 - exitBlend * side * 0.18;
    let torsoZ = side * (state.phase === "telegraph" ? 0.22 : state.phase === "shield" ? -0.18 : 0.1);
    let headX = flickSkill ? 0.1 : 0.04;
    let headY = -torsoY * 0.36;
    let headZ = -torsoZ * 0.3;

    let leftArmX = -0.24 + exitBlend * 0.18;
    let rightArmX = -0.24 - exitBlend * 0.14;
    let leftArmY = -0.06 - side * 0.08;
    let rightArmY = 0.06 - side * 0.06;
    let leftArmZ = -0.18 - torsoZ * 0.28;
    let rightArmZ = 0.18 - torsoZ * 0.28;
    let leftForearmX = -0.66;
    let rightForearmX = -0.66;
    let leftForearmY = -0.04;
    let rightForearmY = 0.04;
    let leftHandX = 0.08;
    let rightHandX = 0.08;
    let bodyLift = pulse * (flickSkill ? 0.03 : 0.018);

    switch (skillId) {
      case "stepover": {
        const arc = pulse;
        actionPose.hipX += 0.28 * arc;
        actionPose.hipZ += side * 0.48 * arc;
        actionPose.hipY += side * 0.12 * arc;
        actionPose.kneeX += 0.2 * arc;
        actionPose.footZ += -side * 0.26 * arc;
        supportPose.kneeX += 0.12 * arc;
        torsoX += -0.08 * arc;
        torsoZ += side * 0.2 * arc;
        headX += 0.04 * arc;
        leftArmZ += -side * 0.12 * arc;
        rightArmZ += side * 0.12 * arc;
        break;
      }
      case "roulette": {
        const spin = smoothstep(0.1, 0.9, t);
        const crouch = Math.sin(spin * Math.PI);
        supportPose.hipX -= 0.08 * crouch;
        supportPose.kneeX += 0.26 * crouch;
        actionPose.hipX += 0.12 * crouch;
        actionPose.kneeX += 0.36 * crouch;
        actionPose.footX += -0.22 * crouch;
        actionPose.hipZ += side * 0.14 * crouch;
        torsoX += -0.18 * crouch;
        torsoZ += side * 0.3 * crouch;
        headZ += -side * 0.12 * crouch;
        leftArmX += -0.1 * crouch;
        rightArmX += -0.1 * crouch;
        leftArmZ += -side * 0.26 * crouch;
        rightArmZ += side * 0.26 * crouch;
        bodyLift += -0.02 * crouch;
        break;
      }
      case "elastico": {
        const flick = doublePulse;
        const snap = smoothstep(0.05, 0.35, t) * (1 - smoothstep(0.55, 0.9, t));
        actionPose.hipZ += side * 0.42 * flick;
        actionPose.footZ += -side * 0.32 * flick;
        actionPose.hipX += 0.18 * snap;
        actionPose.kneeX += 0.16 * snap;
        torsoY += -side * 0.16 * flick;
        torsoZ += side * 0.12 * flick;
        headY += -side * 0.06 * flick;
        leftArmZ += -side * 0.1 * flick;
        rightArmZ += side * 0.1 * flick;
        break;
      }
      case "rainbow_flick": {
        const crouch = smoothstep(0.0, 0.4, t);
        const pop = smoothstep(0.45, 0.85, t);
        supportPose.hipX -= 0.12 * crouch;
        supportPose.kneeX += 0.36 * crouch;
        actionPose.hipX += 0.3 * crouch;
        actionPose.kneeX += 0.52 * crouch;
        actionPose.footX += -0.24 * crouch;
        torsoX += -0.24 * crouch;
        headX += 0.12 * crouch;
        leftArmX += -0.28 * crouch;
        rightArmX += -0.28 * crouch;
        leftArmZ += -side * 0.18 * crouch;
        rightArmZ += side * 0.18 * crouch;
        bodyLift += 0.06 * pop - 0.03 * crouch;
        break;
      }
      case "cruyff_turn": {
        const fake = smoothstep(0.05, 0.4, t);
        const drag = smoothstep(0.4, 0.75, t);
        actionPose.hipX += 0.42 * fake - 0.22 * drag;
        actionPose.kneeX += 0.24 * fake + 0.12 * drag;
        actionPose.hipZ += side * 0.14 * fake - side * 0.18 * drag;
        supportPose.kneeX += 0.08 * fake;
        torsoY += -exit * 0.26 * drag;
        torsoZ += side * 0.14 * fake;
        headX += 0.08 * fake;
        leftArmY += -side * 0.18 * drag;
        rightArmY += side * 0.18 * drag;
        break;
      }
      case "mcgeady_spin": {
        const spin = smoothstep(0.08, 0.9, t);
        const crouch = Math.sin(spin * Math.PI);
        supportPose.hipX -= 0.06 * crouch;
        supportPose.kneeX += 0.3 * crouch;
        actionPose.hipX += 0.16 * crouch;
        actionPose.kneeX += 0.42 * crouch;
        actionPose.footX += -0.24 * crouch;
        actionPose.hipZ += side * 0.2 * crouch;
        torsoX += -0.2 * crouch;
        torsoZ += side * 0.36 * crouch;
        headZ += -side * 0.14 * crouch;
        leftArmX += -0.12 * crouch;
        rightArmX += -0.12 * crouch;
        leftArmZ += -side * 0.3 * crouch;
        rightArmZ += side * 0.3 * crouch;
        bodyLift += -0.02 * crouch;
        break;
      }
      case "la_croqueta": {
        const tap = doublePulse;
        const tapAbs = Math.abs(tap);
        actionPose.hipZ += side * 0.28 * tap;
        actionPose.footZ += -side * 0.2 * tap;
        actionPose.hipX += 0.12 * tapAbs;
        supportPose.hipZ += -side * 0.1 * tap;
        supportPose.kneeX += 0.08 * tapAbs;
        torsoY += -side * 0.2 * tap;
        torsoZ += side * 0.12 * tap;
        leftArmY += -side * 0.08 * tap;
        rightArmY += side * 0.08 * tap;
        break;
      }
      case "rabona_fake": {
        const cross = smoothstep(0.08, 0.6, t);
        actionPose.hipY += side * 0.42 * cross;
        actionPose.hipZ += -side * 0.36 * cross;
        actionPose.hipX += 0.2 * cross;
        actionPose.kneeX += 0.24 * cross;
        actionPose.footZ += side * 0.24 * cross;
        supportPose.kneeX += 0.12 * cross;
        torsoY += -exit * 0.28 * cross;
        torsoZ += side * 0.18 * cross;
        headX += 0.12 * cross;
        leftArmY += -side * 0.18 * cross;
        rightArmY += side * 0.18 * cross;
        break;
      }
      case "hocus_pocus": {
        const loop = doublePulse;
        const loopFast = quadPulse;
        actionPose.hipZ += side * 0.36 * loop;
        actionPose.hipX += 0.18 * Math.abs(loop);
        actionPose.kneeX += 0.2 * Math.abs(loop);
        supportPose.hipZ += -side * 0.22 * loopFast;
        supportPose.kneeX += 0.12 * Math.abs(loopFast);
        torsoZ += side * 0.22 * loop;
        headZ += -side * 0.1 * loop;
        leftArmZ += -side * 0.18 * loop;
        rightArmZ += side * 0.18 * loop;
        break;
      }
      case "sombrero_flick": {
        const crouch = smoothstep(0.0, 0.35, t);
        const pop = smoothstep(0.4, 0.8, t);
        supportPose.kneeX += 0.28 * crouch;
        actionPose.kneeX += 0.46 * crouch;
        actionPose.hipX += 0.24 * crouch;
        actionPose.footX += -0.2 * crouch;
        torsoX += -0.2 * crouch;
        headX += 0.1 * crouch;
        leftArmX += -0.24 * crouch;
        rightArmX += -0.24 * crouch;
        bodyLift += 0.05 * pop - 0.02 * crouch;
        break;
      }
      default:
        break;
    }

    this.setLegPose(supportLeg, supportPose, dt, 14);
    this.setLegPose(actionLeg, actionPose, dt, 14);

    this.parts.shorts.rotation.x = this.dampAngle(this.parts.shorts.rotation.x, 0, 12, dt);
    this.parts.shorts.rotation.y = this.dampAngle(this.parts.shorts.rotation.y, torsoY * 0.46, 12, dt);
    this.parts.shorts.rotation.z = this.dampAngle(this.parts.shorts.rotation.z, torsoZ * 0.5, 12, dt);
    this.parts.torso.rotation.x = this.dampAngle(this.parts.torso.rotation.x, torsoX, 12, dt);
    this.parts.torso.rotation.y = this.dampAngle(this.parts.torso.rotation.y, torsoY, 12, dt);
    this.parts.torso.rotation.z = this.dampAngle(this.parts.torso.rotation.z, torsoZ, 12, dt);
    this.parts.head.rotation.x = this.dampAngle(this.parts.head.rotation.x, headX, 10, dt);
    this.parts.head.rotation.y = this.dampAngle(this.parts.head.rotation.y, headY, 10, dt);
    this.parts.head.rotation.z = this.dampAngle(this.parts.head.rotation.z, headZ, 10, dt);

    this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, leftArmX, 12, dt);
    this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, rightArmX, 12, dt);
    this.parts.leftArm.rotation.y = this.dampAngle(this.parts.leftArm.rotation.y, leftArmY, 12, dt);
    this.parts.rightArm.rotation.y = this.dampAngle(this.parts.rightArm.rotation.y, rightArmY, 12, dt);
    this.parts.leftArm.rotation.z = this.dampAngle(this.parts.leftArm.rotation.z, leftArmZ, 12, dt);
    this.parts.rightArm.rotation.z = this.dampAngle(this.parts.rightArm.rotation.z, rightArmZ, 12, dt);
    this.parts.leftForearm.rotation.x = this.dampAngle(this.parts.leftForearm.rotation.x, leftForearmX, 12, dt);
    this.parts.rightForearm.rotation.x = this.dampAngle(this.parts.rightForearm.rotation.x, rightForearmX, 12, dt);
    this.parts.leftForearm.rotation.y = this.dampAngle(this.parts.leftForearm.rotation.y, leftForearmY, 12, dt);
    this.parts.rightForearm.rotation.y = this.dampAngle(this.parts.rightForearm.rotation.y, rightForearmY, 12, dt);
    this.parts.leftHand.rotation.x = this.dampAngle(this.parts.leftHand.rotation.x, leftHandX, 12, dt);
    this.parts.rightHand.rotation.x = this.dampAngle(this.parts.rightHand.rotation.x, rightHandX, 12, dt);

    this.applyFingerCurl(this.parts.leftFingers, 0.52, dt);
    this.applyFingerCurl(this.parts.rightFingers, 0.52, dt);
    this.setBodyHeave(bodyLift);
  }

  update(dt) {
    if (this.celebration.active) {
      this.updateGoalCelebration(dt);
      this.pBody.position.copy(this.mesh.position);
      this.pBody.position.y += 1.0;
      this.pBody.quaternion.copy(this.mesh.quaternion);
      this.clampToField();
      this.onStamina?.(this.stamina / this.maxStamina);
      return;
    }

    const now = performance.now();
    this.exitBoost.timeLeft = Math.max(0, this.exitBoost.timeLeft - dt);
    this.slideState.cooldown = Math.max(0, this.slideState.cooldown - dt);

    if (this.slideState.active) {
      this.updateSlideTackle(dt);
      this.pBody.position.copy(this.mesh.position);
      this.pBody.position.y += 1.0;
      this.pBody.quaternion.copy(this.mesh.quaternion);
      this.clampToField();
      this.updateCamera(dt);
      this.onStamina?.(this.stamina / this.maxStamina);
      return;
    }

    if (this.charge) {
      this.charge.hold = Math.min(1.3, this.charge.hold + dt);
      this.onChargeUpdate?.(this.charge.hold / 1.3, this.getChargeLabel());

      // Accumulate Falso
      if (this.keys.KeyL) {
        this.falso = Math.min(1.0, this.falso + dt * 1.5);
        this.falsoType = 'L';
      } else if (this.keys.KeyK) {
        this.falso = Math.max(-1.0, this.falso - dt * 1.5);
        this.falsoType = 'K';
      }
      this.onFalsoUpdate?.(Math.abs(this.falso));
    }

    const inputRight = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);
    const inputForward = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0);

    // 1. Get Camera orientation (only horizontal)
    const camFwd = this.tempCamFwd.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    camFwd.y = 0;
    camFwd.normalize();

    const camRight = this.tempCamRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    camRight.y = 0;
    camRight.normalize();

    // 2. Build movement direction
    this.moveDir.set(0, 0, 0);
    this.moveDir.addScaledVector(camFwd, inputForward);
    this.moveDir.addScaledVector(camRight, inputRight);

    const isMoving = this.moveDir.lengthSq() > 0.0001;
    if (isMoving) this.moveDir.normalize();

    // 3. Apply Stamina & Sprint
    const wantsSprint = !!this.keys.ShiftLeft || !!this.keys.ShiftRight;
    const canSprint = this.stamina > 1 && this.sprintCooldown <= 0;
    const sprinting = isMoving && wantsSprint && canSprint;

    if (sprinting) {
      this.stamina = Math.max(0, this.stamina - this.sprintDrain * dt);
      if (this.stamina === 0) this.sprintCooldown = 0.9;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
    }
    this.sprintCooldown = Math.max(0, this.sprintCooldown - dt);

    if (this.skillState.trigger && now > this.skillState.lockUntil && !this.isSkillActive()) {
      this.startSkill(this.skillState.trigger, inputRight, inputForward);
      this.skillState.trigger = null;
    }

    if (this.isSkillActive()) {
      this.updateSkill(dt);

      const camRotSpeed = 3.0;
      if (this.keys.ArrowLeft) this.cameraYaw += camRotSpeed * dt;
      if (this.keys.ArrowRight) this.cameraYaw -= camRotSpeed * dt;

      this.pBody.position.copy(this.mesh.position);
      this.pBody.position.y += 1.0;
      this.pBody.quaternion.copy(this.mesh.quaternion);
      this.clampToField();
      this.updateCamera(dt);
      this.onStamina?.(this.stamina / this.maxStamina);
      return;
    }

    const targetSpeed = sprinting ? this.sprintSpeed : this.walkSpeed;
    const desiredVelocity = this.tempDesiredVelocity.copy(this.moveDir).multiplyScalar(targetSpeed);
    if (this.exitBoost.timeLeft > 0.001) {
      const boostStrength = (this.exitBoost.multiplier - 1) * clamp01(this.exitBoost.timeLeft / 0.45);
      desiredVelocity.addScaledVector(this.exitBoost.direction, targetSpeed * boostStrength);
    }
    const accel = isMoving ? (sprinting ? 9.5 : 12.5) : 8.5;
    this.velocity.lerp(desiredVelocity, Math.min(1, dt * accel));
    if (!isMoving && this.velocity.lengthSq() < 0.02) this.velocity.set(0, 0, 0);
    this.mesh.position.addScaledVector(this.velocity, dt);
    const actualMoving = this.velocity.lengthSq() > 0.04;

    if (isMoving) {
      const targetAngle = Math.atan2(this.moveDir.x, this.moveDir.z);
      let angleDiff = targetAngle - this.mesh.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.turnLean = THREE.MathUtils.lerp(this.turnLean, THREE.MathUtils.clamp(angleDiff * 1.8, -0.55, 0.55), Math.min(1, dt * 10));
      this.mesh.rotation.y = this.dampAngle(this.mesh.rotation.y, targetAngle, 20, dt);
    } else {
      this.turnLean = THREE.MathUtils.lerp(this.turnLean, 0, Math.min(1, dt * 7));
    }

    // 5. Apply Animations
    this.applyAnimations(dt, isMoving, sprinting, inputForward);

    // 6. Rotate Camera with Arrow Keys
    const camRotSpeed = 3.0; // speed of camera orbit
    if (this.keys.ArrowLeft) this.cameraYaw += camRotSpeed * dt;
    if (this.keys.ArrowRight) this.cameraYaw -= camRotSpeed * dt;

    // 7. Systems
    this.pBody.position.copy(this.mesh.position);
    this.pBody.position.y += 1.0; // Box center
    this.pBody.quaternion.copy(this.mesh.quaternion);

    this.clampToField();
    this.updateCamera(dt);
    this.onStamina?.(this.stamina / this.maxStamina);

    // Apply dribbling after movement/camera update
    this.applyDribbling(dt, sprinting, isMoving);
  }

  triggerKick(style = "shot", variant = null) {
    if (this.celebration.active || this.slideState.active) return false;
    this.kickAnim = 1.0; // Starts the kick swing
    this.kickStyle = style === "bicycle" ? "bicycle" : style === "pass" ? "pass" : "shot";
    this.kickVariant = variant || (this.kickStyle === "pass" ? "shortPass" : this.kickStyle);
    this.lastKickTime = performance.now();
    this.pendingRpmKick = true;
    this.pendingRpmKickName = this.kickStyle === "bicycle" ? "kickBicycle" : "kickShot";
    return true;
  }

  triggerBicycleKick() {
    if (this.celebration.active || this.isSkillActive() || this.slideState.active || this.charge) return false;
    this.velocity.multiplyScalar(0.18);
    return this.triggerKick("bicycle", "bicycle");
  }

  isGoalCelebrating() {
    return this.celebration.active;
  }

  getGoalCelebrationInfo() {
    return {
      active: this.celebration.active,
      style: this.celebration.active ? this.celebration.style : this.celebration.selectedStyle,
      selectedStyle: this.celebration.selectedStyle,
      time: this.celebration.time,
      duration: this.celebration.duration,
      dir: this.celebration.dir.clone(),
    };
  }

  getSelectedGoalCelebrationStyle() {
    return this.celebration.selectedStyle;
  }

  getGoalCelebrationDuration(style = this.celebration.selectedStyle) {
    return GOAL_CELEBRATION_DURATIONS[style] || 4.0;
  }

  startGoalCelebration(direction = null, duration = null) {
    const dir = direction?.clone?.() || new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    dir.y = 0;
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
    dir.normalize();

    this.resetSkillState();
    this.celebration.active = true;
    this.celebration.style = this.celebration.selectedStyle;
    this.celebration.time = 0;
    this.celebration.duration = Math.max(2.4, duration ?? this.getGoalCelebrationDuration());
    this.celebration.dir.copy(dir);
    this.celebration.speed = 3.6;
    this.celebration.baseY = this.mesh.position.y;

    this.slideState.active = false;
    this.slideState.time = 0;
    this.velocity.set(0, 0, 0);
    this.moveDir.set(0, 0, 0);
    this.charge = null;
    this.kickAnim = 0;
    this.kickStyle = "shot";
    this.kickVariant = "shot";
    this.pendingRpmKick = false;
    this.mesh.rotation.x = 0;
    this.mesh.rotation.z = 0;
    if (this.rpmMixer) {
      this.rpmMixer.stopAllAction();
      this.rpmCurrentAction = null;
      this.rpmCurrentActionName = null;
    }
    this.onChargeEnd?.();
  }

  setGoalCelebrationStyle(index) {
    const i = Math.max(1, Math.min(10, Number(index) || 1));
    this.celebration.selectedStyle = i;
    if (!this.celebration.active) return true;
    this.celebration.style = i;
    this.celebration.time = 0;
    this.celebration.duration = this.getGoalCelebrationDuration(i);
    this.celebration.speed = Math.max(this.celebration.speed, 3.9);
    this.celebration.baseY = this.mesh.position.y;
    return true;
  }

  endGoalCelebration() {
    if (!this.celebration.active) return;
    this.celebration.active = false;
    this.celebration.time = 0;
    this.celebration.speed = 0;
    this.mesh.position.y = this.celebration.baseY;
    this.mesh.rotation.x = 0;
    this.mesh.rotation.z = 0;
    this.parts.head.rotation.x = 0;
    this.parts.head.rotation.z = 0;
    this.parts.leftArm.rotation.y = 0;
    this.parts.rightArm.rotation.y = 0;
    this.parts.leftForearm.rotation.y = 0;
    this.parts.rightForearm.rotation.y = 0;
    this.parts.leftForearm.rotation.z = 0;
    this.parts.rightForearm.rotation.z = 0;
    this.parts.leftHand.rotation.y = 0;
    this.parts.rightHand.rotation.y = 0;
    this.parts.leftHand.rotation.z = 0;
    this.parts.rightHand.rotation.z = 0;
    this.parts.head.rotation.y = 0;
    this.parts.leftLeg.rotation.z = 0;
    this.parts.rightLeg.rotation.z = 0;
    this.parts.leftLeg.rotation.y = 0;
    this.parts.rightLeg.rotation.y = 0;
    this.parts.leftShin.rotation.set(0, 0, 0);
    this.parts.rightShin.rotation.set(0, 0, 0);
    this.parts.leftFoot.rotation.set(0, 0, 0);
    this.parts.rightFoot.rotation.set(0, 0, 0);
    this.parts.shorts.rotation.set(0, 0, 0);
    this.setBodyHeave(0);
    if (this.rpmAvatar) this.rpmAvatar.position.y = 0;
    this.onGoalCelebrationEnd?.();
  }

  buildCelebrationProfile(style, t) {
    const clamp01 = (v) => THREE.MathUtils.clamp(v, 0, 1);
    const smooth = (v) => {
      const x = clamp01(v);
      return x * x * (3 - 2 * x);
    };
    const easeOut = (v) => {
      const x = clamp01(v);
      return 1 - Math.pow(1 - x, 3);
    };
    const wave = Math.sin(t * 8.2);
    const snap = Math.sign(Math.sin(t * 6.2)) || 1;
    const p = {
      move: 0.35,
      strafe: 0,
      yawOffset: 0,
      bob: 0,
      lift: 0,
      rootPitch: -0.02,
      rootRoll: 0,
      rootSpinX: 0,
      torsoX: -0.05,
      torsoY: 0,
      torsoZ: 0,
      headX: 0,
      headY: 0,
      headZ: 0,
      lAx: -0.18,
      rAx: -0.18,
      lAy: -0.03,
      rAy: 0.03,
      lAz: -0.08,
      rAz: 0.08,
      lLegX: 0,
      rLegX: 0,
      lLegZ: 0,
      rLegZ: 0,
      lKnee: 0,
      rKnee: 0,
      lForearmX: -0.42,
      rForearmX: -0.42,
      lForearmY: 0,
      rForearmY: 0,
      lForearmZ: -0.02,
      rForearmZ: 0.02,
      lHandX: 0.03,
      rHandX: 0.03,
      lHandY: 0,
      rHandY: 0,
      lHandZ: 0,
      rHandZ: 0,
      lFingerCurl: 0.62,
      rFingerCurl: 0.62,
    };

    switch (style) {
      case 1: {
        if (t < 0.58) {
          p.move = 6.4;
          p.torsoX = -0.16;
          p.rootPitch = -0.06;
          p.lAx = -0.24 + wave * 0.52;
          p.rAx = -0.24 - wave * 0.52;
          p.lLegX = -wave * 0.58;
          p.rLegX = wave * 0.58;
        } else if (t < 1.45) {
          const u = easeOut((t - 0.58) / 0.87);
          const glide = Math.sin(u * Math.PI);
          p.move = THREE.MathUtils.lerp(7.4, 0.9, u);
          p.lift = 0;
          p.rootPitch = THREE.MathUtils.lerp(-0.08, -0.38, u);
          p.torsoX = THREE.MathUtils.lerp(-0.16, -0.42, u);
          p.headX = -0.14 * u;
          p.bob = 0.01;
          p.lAx = THREE.MathUtils.lerp(-0.42, -1.36, u);
          p.rAx = THREE.MathUtils.lerp(-0.42, -1.36, u);
          p.lAy = -0.12 - u * 0.12;
          p.rAy = 0.12 + u * 0.12;
          p.lAz = THREE.MathUtils.lerp(-0.08, -0.62, u);
          p.rAz = THREE.MathUtils.lerp(0.08, 0.62, u);
          p.lForearmX = THREE.MathUtils.lerp(-0.52, -0.86, u);
          p.rForearmX = THREE.MathUtils.lerp(-0.52, -0.86, u);
          p.lLegX = THREE.MathUtils.lerp(0.1, 1.0, u);
          p.rLegX = THREE.MathUtils.lerp(0.1, 1.0, u);
          p.lLegZ = -0.16;
          p.rLegZ = 0.16;
          p.lKnee = 0.24;
          p.rKnee = 0.24;
          p.lFingerCurl = 0.28;
          p.rFingerCurl = 0.28;
        } else {
          const drag = Math.sin((t - 1.45) * 3.8) * 0.04;
          p.move = 0.55;
          p.rootPitch = -0.26;
          p.torsoX = -0.35;
          p.torsoZ = drag * 0.35;
          p.headX = -0.12;
          p.lAx = -1.18 + drag;
          p.rAx = -1.18 - drag;
          p.lAy = -0.18;
          p.rAy = 0.18;
          p.lAz = -0.56;
          p.rAz = 0.56;
          p.lForearmX = -0.7;
          p.rForearmX = -0.7;
          p.lLegX = 0.98;
          p.rLegX = 0.98;
          p.lLegZ = -0.16;
          p.rLegZ = 0.16;
          p.lKnee = 0.32;
          p.rKnee = 0.32;
          p.lFingerCurl = 0.2;
          p.rFingerCurl = 0.2;
        }
        break;
      }

      case 2: {
        if (t < 0.72) {
          p.move = 6.1;
          p.torsoX = -0.14;
          p.rootPitch = -0.06;
          p.lAx = -0.22 + wave * 0.5;
          p.rAx = -0.22 - wave * 0.5;
          p.lLegX = -wave * 0.56;
          p.rLegX = wave * 0.56;
        } else if (t < 1.26) {
          const u = smooth((t - 0.72) / 0.54);
          p.move = THREE.MathUtils.lerp(2.8, 0.35, u);
          p.yawOffset = Math.PI * u;
          p.lift = Math.sin(u * Math.PI) * 1.08;
          p.rootPitch = THREE.MathUtils.lerp(-0.08, 0.22, u);
          p.torsoX = THREE.MathUtils.lerp(-0.14, -0.04, u);
          p.headX = -0.14 * u;
          p.lAx = THREE.MathUtils.lerp(-0.34, -1.42, u);
          p.rAx = THREE.MathUtils.lerp(-0.34, -1.42, u);
          p.lAy = -0.08 - u * 0.08;
          p.rAy = 0.08 + u * 0.08;
          p.lAz = THREE.MathUtils.lerp(-0.08, -0.3, u);
          p.rAz = THREE.MathUtils.lerp(0.08, 0.3, u);
          p.lForearmX = THREE.MathUtils.lerp(-0.45, -0.16, u);
          p.rForearmX = THREE.MathUtils.lerp(-0.45, -0.16, u);
          p.lLegX = THREE.MathUtils.lerp(0.08, 0.28, u);
          p.rLegX = THREE.MathUtils.lerp(0.08, 0.28, u);
          p.lLegZ = -0.24 * u;
          p.rLegZ = 0.24 * u;
          p.lFingerCurl = 0.18;
          p.rFingerCurl = 0.18;
        } else {
          const land = clamp01((t - 1.26) / 0.48);
          const echo = Math.max(0, Math.sin((t - 1.26) * 6.2));
          p.move = 0.26;
          p.lift = Math.max(0, 0.12 - land * 0.12);
          p.torsoX = -0.12;
          p.rootPitch = -0.08;
          p.headX = -0.08;
          p.torsoZ = echo * 0.06;
          p.lAx = 0.24 + echo * 0.04;
          p.rAx = 0.24 + echo * 0.04;
          p.lAy = -0.16;
          p.rAy = 0.16;
          p.lAz = -0.62;
          p.rAz = 0.62;
          p.lForearmX = -0.14;
          p.rForearmX = -0.14;
          p.lLegX = 0.22;
          p.rLegX = 0.22;
          p.lLegZ = -0.24;
          p.rLegZ = 0.24;
          p.lKnee = 0.18;
          p.rKnee = 0.18;
          p.lFingerCurl = 0.14;
          p.rFingerCurl = 0.14;
        }
        break;
      }

      case 3: {
        const hush = easeOut(t / 0.48);
        const crowdShift = Math.sin(Math.max(0, t - 0.48) * 2.2);
        p.move = t < 0.72 ? 1.9 : 0.32;
        p.strafe = 0.12;
        p.torsoX = -0.04;
        p.torsoY = 0.16 + crowdShift * 0.08;
        p.headY = 0.22 + crowdShift * 0.14;
        p.headX = 0.04;
        p.lAx = -0.36 + wave * 0.12;
        p.lAy = -0.28;
        p.lAz = -0.28;
        p.rAx = THREE.MathUtils.lerp(-0.62, -1.12, hush);
        p.rAy = 0.52;
        p.rAz = 0.18;
        p.lForearmX = -0.42;
        p.lForearmY = -0.12;
        p.rForearmX = THREE.MathUtils.lerp(-0.72, -1.18, hush);
        p.rForearmY = 0.22;
        p.rForearmZ = 0.22;
        p.rHandX = -0.22;
        p.rHandY = 0.36;
        p.rHandZ = 0.18;
        p.lLegX = wave * 0.12;
        p.rLegX = -wave * 0.12;
        p.lFingerCurl = 0.68;
        p.rFingerCurl = 0.04;
        break;
      }

      case 4: {
        if (t < 0.3) {
          p.move = 0.9;
          p.rootPitch = 0.24;
          p.torsoX = 0.18;
          p.lAx = 0.18;
          p.rAx = 0.18;
          p.lAz = -0.16;
          p.rAz = 0.16;
          p.lForearmX = -0.12;
          p.rForearmX = -0.12;
          p.lLegX = -0.8;
          p.rLegX = -0.8;
          p.lKnee = 0.34;
          p.rKnee = 0.34;
        } else if (t < 0.55) {
          const u = smooth((t - 0.3) / 0.25);
          p.move = 1.55;
          p.lift = 0.18 + u * 0.35;
          p.rootPitch = THREE.MathUtils.lerp(0.24, -0.18, u);
          p.torsoX = THREE.MathUtils.lerp(0.16, -0.1, u);
          p.lAx = THREE.MathUtils.lerp(0.18, -1.48, u);
          p.rAx = THREE.MathUtils.lerp(0.18, -1.48, u);
          p.lAz = THREE.MathUtils.lerp(-0.16, -0.24, u);
          p.rAz = THREE.MathUtils.lerp(0.16, 0.24, u);
          p.lForearmX = THREE.MathUtils.lerp(-0.12, -0.42, u);
          p.rForearmX = THREE.MathUtils.lerp(-0.12, -0.42, u);
          p.lLegX = THREE.MathUtils.lerp(-0.8, 0.14, u);
          p.rLegX = THREE.MathUtils.lerp(-0.8, 0.14, u);
        } else if (t < 1.18) {
          const u = clamp01((t - 0.55) / 0.63);
          const arc = Math.sin(u * Math.PI);
          p.move = 0.58;
          p.lift = 0.86 + arc * 0.28;
          p.rootSpinX = -Math.PI * 2 * u;
          p.rootPitch = -0.08;
          p.torsoX = -0.08;
          p.headX = arc * 0.18;
          p.lAx = -0.42;
          p.rAx = -0.42;
          p.lForearmX = -1.12;
          p.rForearmX = -1.12;
          p.lLegX = -0.92;
          p.rLegX = -0.92;
          p.lKnee = 0.58;
          p.rKnee = 0.58;
          p.lFingerCurl = 0.32;
          p.rFingerCurl = 0.32;
        } else {
          const u = easeOut((t - 1.18) / 0.45);
          p.move = 0.34;
          p.lift = Math.max(0, 0.24 - u * 0.24);
          p.rootSpinX = THREE.MathUtils.lerp(-Math.PI * 2, 0, u);
          p.rootPitch = THREE.MathUtils.lerp(-0.18, -0.02, u);
          p.torsoX = THREE.MathUtils.lerp(-0.22, -0.04, u);
          p.lAx = THREE.MathUtils.lerp(-0.34, -0.14, u);
          p.rAx = THREE.MathUtils.lerp(-0.34, -0.14, u);
          p.lAz = -0.18;
          p.rAz = 0.18;
          p.lForearmX = -0.44;
          p.rForearmX = -0.44;
          p.lLegX = THREE.MathUtils.lerp(-0.28, 0, u);
          p.rLegX = THREE.MathUtils.lerp(-0.28, 0, u);
          p.lKnee = 0.16;
          p.rKnee = 0.16;
        }
        break;
      }

      case 5: {
        const settle = easeOut(t / 0.5);
        const scan = Math.sin(Math.max(0, t - 0.5) * 2.6);
        p.move = t < 0.45 ? 1.2 : 0.22;
        p.torsoX = -0.04;
        p.torsoY = scan * 0.16;
        p.headY = scan * 0.42;
        p.headX = 0.02;
        p.lAx = THREE.MathUtils.lerp(-0.34, -0.94, settle);
        p.rAx = THREE.MathUtils.lerp(-0.34, -0.94, settle);
        p.lAy = THREE.MathUtils.lerp(-0.08, -0.28, settle);
        p.rAy = THREE.MathUtils.lerp(0.08, 0.28, settle);
        p.lAz = THREE.MathUtils.lerp(-0.08, -0.44, settle);
        p.rAz = THREE.MathUtils.lerp(0.08, 0.44, settle);
        p.lForearmX = THREE.MathUtils.lerp(-0.42, -1.26, settle);
        p.rForearmX = THREE.MathUtils.lerp(-0.42, -1.26, settle);
        p.lForearmY = -0.28 * settle;
        p.rForearmY = 0.28 * settle;
        p.lHandX = -0.34 * settle;
        p.rHandX = -0.34 * settle;
        p.lHandY = -0.4 * settle;
        p.rHandY = 0.4 * settle;
        p.lHandZ = -0.08 * settle;
        p.rHandZ = 0.08 * settle;
        p.lLegX = Math.sin(t * 3.2) * 0.05;
        p.rLegX = -Math.sin(t * 3.2) * 0.05;
        p.lFingerCurl = 0.04;
        p.rFingerCurl = 0.04;
        break;
      }

      case 6:
        if (t < 0.95) {
          p.move = 6.5;
          p.strafe = 0.22;
          p.torsoX = -0.14;
          p.torsoY = 0.12;
          p.rootPitch = -0.06;
          p.lAx = -0.2 + wave * 0.5;
          p.rAx = -0.2 - wave * 0.5;
          p.lLegX = -wave * 0.56;
          p.rLegX = wave * 0.56;
        } else {
          const boxT = t - 0.95;
          const jab = Math.max(0, Math.sin(boxT * 8.2));
          const cross = Math.max(0, Math.sin(boxT * 8.2 + Math.PI / 1.4));
          const weave = Math.sin(boxT * 4.2);
          p.move = 0.28;
          p.strafe = weave * 0.22;
          p.yawOffset = 0.34 + weave * 0.16;
          p.rootRoll = weave * 0.08;
          p.torsoX = -0.1;
          p.torsoY = weave * 0.34;
          p.headY = weave * 0.2;
          p.lAx = -0.56 + jab * 0.66;
          p.rAx = -0.56 + cross * 0.72;
          p.lAy = -0.12 - jab * 0.22;
          p.rAy = 0.12 + cross * 0.28;
          p.lAz = -0.18;
          p.rAz = 0.18;
          p.lForearmX = -1.06 + jab * 0.86;
          p.rForearmX = -1.06 + cross * 0.86;
          p.lForearmY = -0.08 - jab * 0.1;
          p.rForearmY = 0.08 + cross * 0.1;
          p.lLegX = Math.sin(boxT * 6.5) * 0.16;
          p.rLegX = -Math.sin(boxT * 6.5) * 0.16;
          p.lLegZ = -0.08;
          p.rLegZ = 0.08;
          p.lFingerCurl = 0.5;
          p.rFingerCurl = 0.5;
        }
        break;

      case 7: {
        const callPose = easeOut(t / 0.5);
        const beat = Math.max(0, Math.sin(Math.max(0, t - 0.5) * 4.8));
        const stride = t < 0.6 ? Math.sin(t * 5.6) * 0.12 : 0;
        p.move = t < 0.6 ? 1.6 : 0.28;
        p.torsoX = -0.05;
        p.torsoY = -0.14;
        p.headY = 0.28;
        p.headX = 0.06 + beat * 0.08;
        p.lAx = -0.36 + beat * 0.18;
        p.lAy = -0.26;
        p.lAz = -0.26;
        p.rAx = THREE.MathUtils.lerp(-0.62, -1.2, callPose);
        p.rAy = 0.44;
        p.rAz = 0.16;
        p.lForearmX = -0.44 + beat * 0.24;
        p.lForearmY = -0.12;
        p.rForearmX = THREE.MathUtils.lerp(-0.72, -1.18, callPose);
        p.rForearmY = 0.32;
        p.rForearmZ = 0.12;
        p.rHandX = -0.18;
        p.rHandY = 0.54;
        p.rHandZ = 0.06;
        p.lLegX = stride;
        p.rLegX = -stride;
        p.lFingerCurl = 0.46;
        p.rFingerCurl = 0.22;
        break;
      }

      case 8: {
        const raise = easeOut(t / 0.55);
        const breath = Math.sin(Math.max(0, t - 0.55) * 2.4) * 0.02;
        p.move = t < 0.55 ? 0.9 : 0.12;
        p.torsoX = -0.02;
        p.rootPitch = -0.04;
        p.headX = -0.26;
        p.lAx = THREE.MathUtils.lerp(-0.28, -1.48, raise);
        p.rAx = THREE.MathUtils.lerp(-0.28, -1.48, raise);
        p.lAy = THREE.MathUtils.lerp(-0.06, -0.04, raise);
        p.rAy = THREE.MathUtils.lerp(0.06, 0.04, raise);
        p.lAz = THREE.MathUtils.lerp(-0.08, -0.04, raise);
        p.rAz = THREE.MathUtils.lerp(0.08, 0.04, raise);
        p.lForearmX = THREE.MathUtils.lerp(-0.42, -0.06, raise);
        p.rForearmX = THREE.MathUtils.lerp(-0.42, -0.06, raise);
        p.lHandX = THREE.MathUtils.lerp(0.03, -0.12, raise);
        p.rHandX = THREE.MathUtils.lerp(0.03, -0.12, raise);
        p.lLegX = breath;
        p.rLegX = -breath;
        p.lFingerCurl = 0.04;
        p.rFingerCurl = 0.04;
        break;
      }

      case 9:
        p.move = 0.92;
        p.strafe = snap * 0.28;
        p.yawOffset = snap * 0.16;
        p.rootRoll = snap * 0.12;
        p.torsoY = snap * 0.2;
        p.torsoZ = (Math.sign(Math.sin(t * 12.4)) || 1) * 0.12;
        p.headY = -snap * 0.18;
        p.headZ = p.torsoZ * 0.7;
        p.lAx = snap > 0 ? -0.98 : 0.18;
        p.rAx = snap > 0 ? 0.18 : -0.98;
        p.lAy = snap > 0 ? -0.04 : 0.28;
        p.rAy = snap > 0 ? -0.28 : 0.04;
        p.lAz = snap > 0 ? -0.16 : -0.04;
        p.rAz = snap > 0 ? 0.04 : 0.16;
        p.lForearmX = snap > 0 ? -0.1 : -1.14;
        p.rForearmX = snap > 0 ? -1.14 : -0.1;
        p.lHandZ = p.torsoZ;
        p.rHandZ = -p.torsoZ;
        p.lLegX = snap * 0.3;
        p.rLegX = -snap * 0.3;
        p.lLegZ = snap * 0.12;
        p.rLegZ = -snap * 0.12;
        p.lKnee = snap * 0.12;
        p.rKnee = -snap * 0.12;
        p.lFingerCurl = 0.74;
        p.rFingerCurl = 0.74;
        break;

      case 10:
        if (t < 0.78) {
          p.move = 6.4;
          p.torsoX = -0.15;
          p.rootPitch = -0.06;
          p.lAx = -0.18 + wave * 0.5;
          p.rAx = -0.18 - wave * 0.5;
          p.lLegX = -wave * 0.56;
          p.rLegX = wave * 0.56;
        } else {
          const lean = easeOut((t - 0.78) / 0.42);
          const kiss = Math.max(0, Math.sin(Math.max(0, t - 1.12) * 6.2));
          p.move = 0.1;
          p.rootPitch = 0.18 * lean;
          p.torsoX = 0.14 * lean;
          p.headX = 0.08 * lean;
          p.headY = -0.08;
          p.bob = kiss * 0.02;
          p.lAx = THREE.MathUtils.lerp(-0.34, -0.24, lean);
          p.rAx = THREE.MathUtils.lerp(-0.52, -1.08, lean);
          p.lAy = -0.18;
          p.rAy = 0.34;
          p.lAz = -0.18;
          p.rAz = 0.2;
          p.lForearmX = -0.5;
          p.rForearmX = THREE.MathUtils.lerp(-0.62, -1.12, lean);
          p.rForearmY = 0.22 + kiss * 0.16;
          p.rForearmZ = 0.12 + kiss * 0.12;
          p.rHandX = -0.18 - lean * 0.16;
          p.rHandY = 0.3 + lean * 0.2;
          p.rHandZ = kiss * 0.34;
          p.lFingerCurl = 0.48;
          p.rFingerCurl = 0.08;
        }
        break;

      default:
        break;
    }
    return this.sanitizeCelebrationProfile(p);
  }

  sanitizeCelebrationProfile(p) {
    p.move = THREE.MathUtils.clamp(p.move, 0, 8.2);
    p.strafe = THREE.MathUtils.clamp(p.strafe, -1.5, 1.5);
    p.yawOffset = THREE.MathUtils.clamp(p.yawOffset, -Math.PI * 1.05, Math.PI * 1.05);
    p.bob = THREE.MathUtils.clamp(p.bob, -0.05, 0.18);
    p.lift = THREE.MathUtils.clamp(p.lift, 0, 1.25);
    p.rootPitch = THREE.MathUtils.clamp(p.rootPitch, -1.35, 0.55);
    p.rootRoll = THREE.MathUtils.clamp(p.rootRoll, -0.65, 0.65);
    p.rootSpinX = THREE.MathUtils.clamp(p.rootSpinX, -Math.PI * 2.05, Math.PI * 0.55);
    p.torsoX = THREE.MathUtils.clamp(p.torsoX, -0.46, 0.24);
    p.torsoY = THREE.MathUtils.clamp(p.torsoY, -0.42, 0.42);
    p.torsoZ = THREE.MathUtils.clamp(p.torsoZ, -0.26, 0.26);
    p.headX = THREE.MathUtils.clamp(p.headX, -0.42, 0.32);
    p.headY = THREE.MathUtils.clamp(p.headY, -0.45, 0.45);
    p.headZ = THREE.MathUtils.clamp(p.headZ, -0.22, 0.22);
    p.lAx = THREE.MathUtils.clamp(p.lAx, -1.55, 0.55);
    p.rAx = THREE.MathUtils.clamp(p.rAx, -1.55, 0.55);
    p.lAy = THREE.MathUtils.clamp(p.lAy, -0.65, 0.65);
    p.rAy = THREE.MathUtils.clamp(p.rAy, -0.65, 0.65);
    p.lAz = THREE.MathUtils.clamp(p.lAz, -0.65, 0.65);
    p.rAz = THREE.MathUtils.clamp(p.rAz, -0.65, 0.65);
    p.lLegX = THREE.MathUtils.clamp(p.lLegX, -1.05, 1.05);
    p.rLegX = THREE.MathUtils.clamp(p.rLegX, -1.05, 1.05);
    p.lLegZ = THREE.MathUtils.clamp(p.lLegZ, -0.35, 0.35);
    p.rLegZ = THREE.MathUtils.clamp(p.rLegZ, -0.35, 0.35);
    p.lKnee = THREE.MathUtils.clamp(p.lKnee, -0.1, 0.65);
    p.rKnee = THREE.MathUtils.clamp(p.rKnee, -0.1, 0.65);
    p.lForearmX = THREE.MathUtils.clamp(p.lForearmX, -1.25, 0.45);
    p.rForearmX = THREE.MathUtils.clamp(p.rForearmX, -1.25, 0.45);
    p.lForearmY = THREE.MathUtils.clamp(p.lForearmY, -0.55, 0.55);
    p.rForearmY = THREE.MathUtils.clamp(p.rForearmY, -0.55, 0.55);
    p.lForearmZ = THREE.MathUtils.clamp(p.lForearmZ, -0.45, 0.45);
    p.rForearmZ = THREE.MathUtils.clamp(p.rForearmZ, -0.45, 0.45);
    p.lHandX = THREE.MathUtils.clamp(p.lHandX, -0.55, 0.55);
    p.rHandX = THREE.MathUtils.clamp(p.rHandX, -0.55, 0.55);
    p.lHandY = THREE.MathUtils.clamp(p.lHandY, -0.55, 0.55);
    p.rHandY = THREE.MathUtils.clamp(p.rHandY, -0.55, 0.55);
    p.lHandZ = THREE.MathUtils.clamp(p.lHandZ, -0.55, 0.55);
    p.rHandZ = THREE.MathUtils.clamp(p.rHandZ, -0.55, 0.55);
    p.lFingerCurl = THREE.MathUtils.clamp(p.lFingerCurl, 0.02, 0.95);
    p.rFingerCurl = THREE.MathUtils.clamp(p.rFingerCurl, 0.02, 0.95);
    return p;
  }

  applyFingerCurl(fingers = [], curl = 0.6, dt = 0.016) {
    const c = THREE.MathUtils.clamp(curl, 0, 1);
    const bendA = c * 0.9;
    const bendB = c * 0.75;
    const bendC = c * 0.6;
    const alpha = Math.min(1, dt * 14);
    for (const f of fingers) {
      f.knuckle.rotation.x = THREE.MathUtils.lerp(f.knuckle.rotation.x, bendA, alpha);
      f.joint.rotation.x = THREE.MathUtils.lerp(f.joint.rotation.x, bendB, alpha);
      f.tipJoint.rotation.x = THREE.MathUtils.lerp(f.tipJoint.rotation.x, bendC, alpha);
    }
  }

  applyDefaultGoalCelebration(style, t, dt) {
    const blend = Math.min(1, dt * 14);
    const p = this.buildCelebrationProfile(style, t);
    const right = new THREE.Vector3(-this.celebration.dir.z, 0, this.celebration.dir.x);
    const leftFootX = THREE.MathUtils.clamp(-p.lLegX * 0.22 - p.lKnee * 0.48 + Math.max(0, -p.lLegX) * 0.14, -0.72, 0.38);
    const rightFootX = THREE.MathUtils.clamp(-p.rLegX * 0.22 - p.rKnee * 0.48 + Math.max(0, -p.rLegX) * 0.14, -0.72, 0.38);
    this.mesh.position.addScaledVector(this.celebration.dir, dt * p.move);
    this.mesh.position.addScaledVector(right, dt * p.strafe);
    this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, this.celebration.baseY + p.lift, blend);
    const targetYaw = Math.atan2(this.celebration.dir.x, this.celebration.dir.z) + p.yawOffset;
    this.mesh.rotation.y = this.dampAngle(this.mesh.rotation.y, targetYaw, 10, dt);
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, p.rootPitch + p.rootSpinX, blend);
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, p.rootRoll, blend);

    this.parts.leftArm.rotation.x = THREE.MathUtils.lerp(this.parts.leftArm.rotation.x, p.lAx, blend);
    this.parts.leftArm.rotation.y = THREE.MathUtils.lerp(this.parts.leftArm.rotation.y, p.lAy, blend);
    this.parts.rightArm.rotation.x = THREE.MathUtils.lerp(this.parts.rightArm.rotation.x, p.rAx, blend);
    this.parts.rightArm.rotation.y = THREE.MathUtils.lerp(this.parts.rightArm.rotation.y, p.rAy, blend);
    this.parts.leftArm.rotation.z = THREE.MathUtils.lerp(this.parts.leftArm.rotation.z, p.lAz, blend);
    this.parts.rightArm.rotation.z = THREE.MathUtils.lerp(this.parts.rightArm.rotation.z, p.rAz, blend);
    this.parts.shorts.rotation.x = THREE.MathUtils.lerp(this.parts.shorts.rotation.x, 0, blend);
    this.parts.shorts.rotation.y = THREE.MathUtils.lerp(this.parts.shorts.rotation.y, p.torsoY * 0.45, blend);
    this.parts.shorts.rotation.z = THREE.MathUtils.lerp(this.parts.shorts.rotation.z, p.rootRoll * 0.55 + p.strafe * 0.08, blend);
    this.parts.torso.rotation.x = THREE.MathUtils.lerp(this.parts.torso.rotation.x, p.torsoX, blend);
    this.parts.torso.rotation.y = THREE.MathUtils.lerp(this.parts.torso.rotation.y, p.torsoY, blend);
    this.parts.torso.rotation.z = THREE.MathUtils.lerp(this.parts.torso.rotation.z, p.torsoZ, blend);
    this.parts.leftLeg.rotation.x = THREE.MathUtils.lerp(this.parts.leftLeg.rotation.x, p.lLegX, blend);
    this.parts.rightLeg.rotation.x = THREE.MathUtils.lerp(this.parts.rightLeg.rotation.x, p.rLegX, blend);
    this.parts.leftLeg.rotation.y = THREE.MathUtils.lerp(this.parts.leftLeg.rotation.y, p.lLegZ * 0.18, blend);
    this.parts.rightLeg.rotation.y = THREE.MathUtils.lerp(this.parts.rightLeg.rotation.y, p.rLegZ * 0.18, blend);
    this.parts.leftLeg.rotation.z = THREE.MathUtils.lerp(this.parts.leftLeg.rotation.z, p.lLegZ, blend);
    this.parts.rightLeg.rotation.z = THREE.MathUtils.lerp(this.parts.rightLeg.rotation.z, p.rLegZ, blend);
    this.parts.leftShin.rotation.x = THREE.MathUtils.lerp(this.parts.leftShin.rotation.x, p.lKnee, blend);
    this.parts.rightShin.rotation.x = THREE.MathUtils.lerp(this.parts.rightShin.rotation.x, p.rKnee, blend);
    this.parts.leftFoot.rotation.x = THREE.MathUtils.lerp(this.parts.leftFoot.rotation.x, leftFootX, blend);
    this.parts.rightFoot.rotation.x = THREE.MathUtils.lerp(this.parts.rightFoot.rotation.x, rightFootX, blend);
    this.parts.leftFoot.rotation.z = THREE.MathUtils.lerp(this.parts.leftFoot.rotation.z, -p.lLegZ * 0.36, blend);
    this.parts.rightFoot.rotation.z = THREE.MathUtils.lerp(this.parts.rightFoot.rotation.z, -p.rLegZ * 0.36, blend);
    this.parts.head.rotation.x = THREE.MathUtils.lerp(this.parts.head.rotation.x, p.headX, blend);
    this.parts.head.rotation.y = THREE.MathUtils.lerp(this.parts.head.rotation.y, p.headY, blend);
    this.parts.head.rotation.z = THREE.MathUtils.lerp(this.parts.head.rotation.z, p.headZ, blend);
    this.parts.leftForearm.rotation.x = THREE.MathUtils.lerp(this.parts.leftForearm.rotation.x, p.lForearmX, blend);
    this.parts.leftForearm.rotation.y = THREE.MathUtils.lerp(this.parts.leftForearm.rotation.y, p.lForearmY, blend);
    this.parts.leftForearm.rotation.z = THREE.MathUtils.lerp(this.parts.leftForearm.rotation.z, p.lForearmZ, blend);
    this.parts.rightForearm.rotation.x = THREE.MathUtils.lerp(this.parts.rightForearm.rotation.x, p.rForearmX, blend);
    this.parts.rightForearm.rotation.y = THREE.MathUtils.lerp(this.parts.rightForearm.rotation.y, p.rForearmY, blend);
    this.parts.rightForearm.rotation.z = THREE.MathUtils.lerp(this.parts.rightForearm.rotation.z, p.rForearmZ, blend);
    this.parts.leftHand.rotation.x = THREE.MathUtils.lerp(this.parts.leftHand.rotation.x, p.lHandX, blend);
    this.parts.leftHand.rotation.y = THREE.MathUtils.lerp(this.parts.leftHand.rotation.y, p.lHandY, blend);
    this.parts.leftHand.rotation.z = THREE.MathUtils.lerp(this.parts.leftHand.rotation.z, p.lHandZ, blend);
    this.parts.rightHand.rotation.x = THREE.MathUtils.lerp(this.parts.rightHand.rotation.x, p.rHandX, blend);
    this.parts.rightHand.rotation.y = THREE.MathUtils.lerp(this.parts.rightHand.rotation.y, p.rHandY, blend);
    this.parts.rightHand.rotation.z = THREE.MathUtils.lerp(this.parts.rightHand.rotation.z, p.rHandZ, blend);
    this.applyFingerCurl(this.parts.leftFingers, p.lFingerCurl, dt);
    this.applyFingerCurl(this.parts.rightFingers, p.rFingerCurl, dt);
    this.setBodyHeave(p.bob);
  }

  applyRpmGoalCelebration(style, t, dt) {
    const blend = THREE.MathUtils.clamp(dt * 11, 0.08, 0.45);
    const p = this.buildCelebrationProfile(style, t);
    const right = new THREE.Vector3(-this.celebration.dir.z, 0, this.celebration.dir.x);
    this.mesh.position.addScaledVector(this.celebration.dir, dt * p.move);
    this.mesh.position.addScaledVector(right, dt * p.strafe);
    this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, this.celebration.baseY + p.lift, blend);
    const targetYaw = Math.atan2(this.celebration.dir.x, this.celebration.dir.z) + p.yawOffset;
    this.mesh.rotation.y = this.dampAngle(this.mesh.rotation.y, targetYaw, 10, dt);
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, p.rootPitch + p.rootSpinX, blend);
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, p.rootRoll, blend);

    this.setRpmPose("leftUpperArm", p.lAx, p.lAy - 0.04, p.lAz, blend);
    this.setRpmPose("rightUpperArm", p.rAx, p.rAy + 0.04, p.rAz, blend);
    this.setRpmPose("leftLowerArm", p.lForearmX, p.lForearmY, p.lForearmZ - 0.06, blend);
    this.setRpmPose("rightLowerArm", p.rForearmX, p.rForearmY, p.rForearmZ + 0.06, blend);
    this.setRpmPose("chest", p.torsoX, p.torsoY, p.torsoZ, blend);
    this.setRpmPose("spine", p.torsoX * 0.65, p.torsoY * 0.7, p.torsoZ * 0.8, blend);
    this.setRpmPose("leftUpperLeg", p.lLegX, 0, p.lLegZ, blend);
    this.setRpmPose("rightUpperLeg", p.rLegX, 0, p.rLegZ, blend);
    this.setRpmPose("leftLowerLeg", p.lKnee, 0, 0, blend);
    this.setRpmPose("rightLowerLeg", p.rKnee, 0, 0, blend);
    this.setRpmPose("head", p.headX, p.torsoY * 0.35 + p.headY, p.headZ, blend);
    this.rpmAvatar.position.y = p.bob;
  }

  updateGoalCelebration(dt) {
    const c = this.celebration;
    if (!c.active) return;

    if (!this.rpmAvatar && this.rpmOnly) {
      this.endGoalCelebration();
      return;
    }

    c.time += dt;
    c.speed = Math.max(1.4, c.speed - dt * 0.42);
    this.runTime += dt * 8;
    if (this.rpmAvatar) this.applyRpmGoalCelebration(c.style, c.time, dt);
    else this.applyDefaultGoalCelebration(c.style, c.time, dt);

    if (c.time >= c.duration) this.endGoalCelebration();
  }

  applyAnimations(dt, isMoving, sprinting, inputForward = 0) {
    if (this.slideState.active) this.animStyle = "slideTackle";
    else if (this.kickAnim > 0.01) this.animStyle = this.kickStyle === "bicycle" ? "bicycleKick" : "scissorKick";
    else if (isMoving && inputForward < -0.15) this.animStyle = "jogBack";
    else if (isMoving && sprinting) this.animStyle = "strikeJog";
    else if (isMoving) this.animStyle = "dribble";
    else this.animStyle = "idle";

    if (this.rpmAvatar) {
      const hasBall = this.isBallInControlRange();
      this.applyRpmAnimations(dt, isMoving, sprinting, inputForward, hasBall);
      return;
    }
    if (this.rpmOnly) return;

    const blendFast = Math.min(1, dt * 12);
    const speedRatio = THREE.MathUtils.clamp(this.velocity.length() / this.sprintSpeed, 0, 1);
    const movingBack = this.animStyle === "jogBack";

    if (this.gkDive.active && this.isGoalkeeper) {
      const side = this.gkDive.dir.x >= 0 ? 1 : -1;
      const dive = this.gkDive.strength;
      this.setLegPose("left", { hipX: 0.12, hipY: -0.08 * side, hipZ: -0.18 * side, kneeX: 0.48, footX: 0.08, footZ: -0.06 * side }, dt, 14);
      this.setLegPose("right", { hipX: 0.12, hipY: 0.08 * side, hipZ: 0.18 * side, kneeX: 0.48, footX: 0.08, footZ: 0.06 * side }, dt, 14);

      this.parts.shorts.rotation.x = this.dampAngle(this.parts.shorts.rotation.x, -0.08, 12, dt);
      this.parts.shorts.rotation.z = this.dampAngle(this.parts.shorts.rotation.z, -0.18 * side, 12, dt);
      this.parts.torso.rotation.x = this.dampAngle(this.parts.torso.rotation.x, -0.28 - dive * 0.12, 12, dt);
      this.parts.torso.rotation.z = this.dampAngle(this.parts.torso.rotation.z, -0.82 * side * dive, 12, dt);
      this.parts.head.rotation.x = this.dampAngle(this.parts.head.rotation.x, 0.1, 10, dt);
      this.parts.head.rotation.z = this.dampAngle(this.parts.head.rotation.z, -0.32 * side * dive, 10, dt);

      this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, -1.12, 12, dt);
      this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, -1.12, 12, dt);
      this.parts.leftArm.rotation.z = this.dampAngle(this.parts.leftArm.rotation.z, -0.62 * side, 12, dt);
      this.parts.rightArm.rotation.z = this.dampAngle(this.parts.rightArm.rotation.z, -0.62 * side, 12, dt);
      this.parts.leftForearm.rotation.x = this.dampAngle(this.parts.leftForearm.rotation.x, -0.84, 12, dt);
      this.parts.rightForearm.rotation.x = this.dampAngle(this.parts.rightForearm.rotation.x, -0.84, 12, dt);

      this.setBodyHeave(-0.08 * dive);
      return;
    }

    if (this.slideState.active) {
      const phase = clamp01(this.slideState.time / Math.max(0.0001, this.slideState.duration));
      const leadRight = this.slideState.leadSide === "right";
      const stretch = Math.sin(phase * Math.PI);
      const leadPose = {
        hipX: 0.22 - stretch * 0.96,
        hipY: leadRight ? 0.08 : -0.08,
        hipZ: leadRight ? 0.24 : -0.24,
        kneeX: 0.76 - stretch * 0.34,
        footX: 0.24,
        footZ: leadRight ? -0.12 : 0.12,
      };
      const trailPose = {
        hipX: -0.48 + stretch * 0.18,
        hipY: leadRight ? -0.05 : 0.05,
        hipZ: leadRight ? -0.1 : 0.1,
        kneeX: 1.02,
        footX: -0.08,
        footZ: leadRight ? 0.04 : -0.04,
      };
      this.setLegPose(leadRight ? "right" : "left", leadPose, dt, 16);
      this.setLegPose(leadRight ? "left" : "right", trailPose, dt, 16);

      this.parts.shorts.rotation.x = this.dampAngle(this.parts.shorts.rotation.x, 0.08, 12, dt);
      this.parts.shorts.rotation.y = this.dampAngle(this.parts.shorts.rotation.y, 0, 12, dt);
      this.parts.shorts.rotation.z = this.dampAngle(this.parts.shorts.rotation.z, leadRight ? -0.12 : 0.12, 12, dt);
      this.parts.torso.rotation.x = this.dampAngle(this.parts.torso.rotation.x, -0.32, 12, dt);
      this.parts.torso.rotation.y = this.dampAngle(this.parts.torso.rotation.y, 0, 12, dt);
      this.parts.torso.rotation.z = this.dampAngle(this.parts.torso.rotation.z, leadRight ? 0.28 : -0.28, 12, dt);
      this.parts.head.rotation.x = this.dampAngle(this.parts.head.rotation.x, 0.08, 10, dt);
      this.parts.head.rotation.y = this.dampAngle(this.parts.head.rotation.y, 0, 10, dt);
      this.parts.head.rotation.z = this.dampAngle(this.parts.head.rotation.z, leadRight ? -0.08 : 0.08, 10, dt);
      this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, leadRight ? 0.32 : -0.86, 12, dt);
      this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, leadRight ? -0.86 : 0.32, 12, dt);
      this.parts.rightArm.rotation.z = this.dampAngle(this.parts.rightArm.rotation.z, leadRight ? 0.28 : 0.08, 12, dt);
      this.parts.leftArm.rotation.z = this.dampAngle(this.parts.leftArm.rotation.z, leadRight ? -0.08 : -0.28, 12, dt);
      this.parts.rightForearm.rotation.x = this.dampAngle(this.parts.rightForearm.rotation.x, -0.72, 12, dt);
      this.parts.leftForearm.rotation.x = this.dampAngle(this.parts.leftForearm.rotation.x, -0.72, 12, dt);
      this.setBodyHeave(-0.12 * stretch);
      return;
    }

    if (this.kickAnim > 0 && this.kickStyle === "bicycle") {
      this.runTime += dt * 12;
      this.kickAnim = Math.max(0, this.kickAnim - dt * 4.4);
      const phase = 1 - this.kickAnim;
      const scissor = Math.sin(phase * Math.PI);
      this.setLegPose("right", { hipX: 0.52 - scissor * 1.38, hipY: 0.05, hipZ: 0.18, kneeX: 1.06 - scissor * 0.62, footX: 0.18, footZ: -0.08 }, dt, 16);
      this.setLegPose("left", { hipX: -0.16 + scissor * 0.94, hipY: -0.04, hipZ: -0.16, kneeX: 0.34 + scissor * 0.44, footX: -0.12, footZ: 0.06 }, dt, 16);
      this.parts.shorts.rotation.x = this.dampAngle(this.parts.shorts.rotation.x, 0.16, 12, dt);
      this.parts.shorts.rotation.y = this.dampAngle(this.parts.shorts.rotation.y, 0, 12, dt);
      this.parts.shorts.rotation.z = this.dampAngle(this.parts.shorts.rotation.z, 0, 12, dt);
      this.parts.torso.rotation.x = this.dampAngle(this.parts.torso.rotation.x, 0.36 - scissor * 0.18, 12, dt);
      this.parts.torso.rotation.y = this.dampAngle(this.parts.torso.rotation.y, 0, 12, dt);
      this.parts.torso.rotation.z = this.dampAngle(this.parts.torso.rotation.z, 0, 12, dt);
      this.parts.head.rotation.x = this.dampAngle(this.parts.head.rotation.x, -0.18, 10, dt);
      this.parts.head.rotation.y = this.dampAngle(this.parts.head.rotation.y, 0, 10, dt);
      this.parts.head.rotation.z = this.dampAngle(this.parts.head.rotation.z, 0, 10, dt);
      this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, -1.02, 12, dt);
      this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, -0.88, 12, dt);
      this.parts.rightArm.rotation.z = this.dampAngle(this.parts.rightArm.rotation.z, 0.34, 12, dt);
      this.parts.leftArm.rotation.z = this.dampAngle(this.parts.leftArm.rotation.z, -0.34, 12, dt);
      this.parts.rightForearm.rotation.x = this.dampAngle(this.parts.rightForearm.rotation.x, -0.34, 12, dt);
      this.parts.leftForearm.rotation.x = this.dampAngle(this.parts.leftForearm.rotation.x, -0.34, 12, dt);
      this.setBodyHeave(0.08 * scissor);
      return;
    }

    if (this.kickAnim > 0) {
      this.runTime += dt * 10.5;
      this.kickAnim = Math.max(0, this.kickAnim - dt * 4.2);
      const phase = 1 - this.kickAnim;
      const windup = THREE.MathUtils.clamp(phase / 0.35, 0, 1);
      const strike = THREE.MathUtils.clamp((phase - 0.35) / 0.65, 0, 1);
      this.scissorBlend = THREE.MathUtils.lerp(this.scissorBlend, 1, Math.min(1, dt * 14));
      this.strikeBlend = THREE.MathUtils.lerp(this.strikeBlend, 0.9, Math.min(1, dt * 12));
      this.dribbleBlend = THREE.MathUtils.lerp(this.dribbleBlend, 0, blendFast);

      const rightHip = phase < 0.35 ? 0.72 * windup : THREE.MathUtils.lerp(0.72, -1.26, strike);
      const rightKnee = phase < 0.35 ? 0.98 * windup : THREE.MathUtils.lerp(0.98, 0.08, strike);
      const rightFoot = phase < 0.35 ? -0.32 * windup : THREE.MathUtils.lerp(-0.32, 0.2, strike);
      const leftHip = phase < 0.35 ? -0.12 * windup : THREE.MathUtils.lerp(-0.12, 0.48, strike);

      this.setLegPose("right", { hipX: rightHip, hipY: 0.04, hipZ: 0.14, kneeX: rightKnee, footX: rightFoot, footZ: -0.06 }, dt, 16);
      this.setLegPose("left", { hipX: leftHip, hipY: -0.03, hipZ: -0.08, kneeX: 0.12 + Math.sin(phase * Math.PI) * 0.16, footX: -0.05, footZ: 0.03 }, dt, 14);

      this.parts.shorts.rotation.x = this.dampAngle(this.parts.shorts.rotation.x, 0, 12, dt);
      this.parts.shorts.rotation.y = this.dampAngle(this.parts.shorts.rotation.y, -0.16 + strike * 0.22, 12, dt);
      this.parts.shorts.rotation.z = this.dampAngle(this.parts.shorts.rotation.z, -0.07, 12, dt);
      this.parts.torso.rotation.x = this.dampAngle(this.parts.torso.rotation.x, -0.18 + strike * 0.06, 12, dt);
      this.parts.torso.rotation.y = this.dampAngle(this.parts.torso.rotation.y, -0.28 + strike * 0.46, 12, dt);
      this.parts.torso.rotation.z = this.dampAngle(this.parts.torso.rotation.z, this.turnLean * 0.32, 12, dt);
      this.parts.head.rotation.x = this.dampAngle(this.parts.head.rotation.x, 0.04, 10, dt);
      this.parts.head.rotation.y = this.dampAngle(this.parts.head.rotation.y, -this.parts.torso.rotation.y * 0.42, 10, dt);
      this.parts.head.rotation.z = this.dampAngle(this.parts.head.rotation.z, -this.turnLean * 0.12, 10, dt);

      this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, -0.64, 14, dt);
      this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, 0.36, 14, dt);
      this.parts.rightArm.rotation.y = this.dampAngle(this.parts.rightArm.rotation.y, 0.12, 14, dt);
      this.parts.leftArm.rotation.y = this.dampAngle(this.parts.leftArm.rotation.y, -0.08, 14, dt);
      this.parts.rightArm.rotation.z = this.dampAngle(this.parts.rightArm.rotation.z, 0.18, 14, dt);
      this.parts.leftArm.rotation.z = this.dampAngle(this.parts.leftArm.rotation.z, -0.2, 14, dt);
      this.parts.rightForearm.rotation.x = this.dampAngle(this.parts.rightForearm.rotation.x, -0.34, 14, dt);
      this.parts.leftForearm.rotation.x = this.dampAngle(this.parts.leftForearm.rotation.x, -0.74, 14, dt);
      this.parts.rightForearm.rotation.y = this.dampAngle(this.parts.rightForearm.rotation.y, 0.08, 14, dt);
      this.parts.leftForearm.rotation.y = this.dampAngle(this.parts.leftForearm.rotation.y, -0.05, 14, dt);
      this.parts.rightForearm.rotation.z = this.dampAngle(this.parts.rightForearm.rotation.z, 0.06, 14, dt);
      this.parts.leftForearm.rotation.z = this.dampAngle(this.parts.leftForearm.rotation.z, -0.04, 14, dt);
      this.parts.rightHand.rotation.x = this.dampAngle(this.parts.rightHand.rotation.x, 0.14, 12, dt);
      this.parts.leftHand.rotation.x = this.dampAngle(this.parts.leftHand.rotation.x, 0.06, 12, dt);
      this.parts.rightHand.rotation.y = this.dampAngle(this.parts.rightHand.rotation.y, 0.06, 12, dt);
      this.parts.leftHand.rotation.y = this.dampAngle(this.parts.leftHand.rotation.y, -0.04, 12, dt);
      this.parts.rightHand.rotation.z = this.dampAngle(this.parts.rightHand.rotation.z, 0.04, 12, dt);
      this.parts.leftHand.rotation.z = this.dampAngle(this.parts.leftHand.rotation.z, -0.02, 12, dt);
      this.applyFingerCurl(this.parts.leftFingers, 0.48, dt);
      this.applyFingerCurl(this.parts.rightFingers, 0.48, dt);
      this.setBodyHeave(Math.sin(phase * Math.PI) * 0.026);
      return;
    }

    this.scissorBlend = THREE.MathUtils.lerp(this.scissorBlend, 0, Math.min(1, dt * 9));

    if (isMoving) {
      const cadence = sprinting ? 12.8 : (movingBack ? 7.4 : 9.2);
      const direction = movingBack ? -1 : 1;
      const hipAmp = (sprinting ? 0.82 : (movingBack ? 0.42 : 0.58)) * (0.5 + speedRatio * 0.7);
      const kneeAmp = (sprinting ? 0.88 : (movingBack ? 0.4 : 0.62)) * (0.35 + speedRatio * 0.85);
      const footAmp = (sprinting ? 0.44 : 0.32) * (0.35 + speedRatio * 0.7);
      const sideAmp = (sprinting ? 0.1 : 0.075) * (0.45 + speedRatio);

      this.runTime += dt * cadence;
      this.strikeBlend = THREE.MathUtils.lerp(this.strikeBlend, sprinting ? 0.28 : 0.08, Math.min(1, dt * 6));
      this.dribbleBlend = THREE.MathUtils.lerp(this.dribbleBlend, 1, Math.min(1, dt * 8));

      const phase = this.runTime;
      const dribblePulse = Math.sin(phase * 2.2) * this.dribbleBlend * 0.08;
      const buildLeg = (phaseOffset, sideSign, dribbleBias) => {
        const stride = Math.sin(phase + phaseOffset) * direction;
        const swing = Math.max(0, stride);
        const push = Math.max(0, -stride);
        const hipX = stride * hipAmp + dribbleBias;
        const kneeX = 0.08 + swing * kneeAmp + push * 0.12;
        const hipZ = Math.cos(phase + phaseOffset) * sideAmp * sideSign + this.turnLean * 0.08 * sideSign;
        const hipY = Math.cos(phase + phaseOffset) * 0.045 * sideSign * (0.35 + speedRatio * 0.4);
        const footX = -swing * footAmp + push * 0.18 - kneeX * 0.22;
        return {
          hipX,
          hipY,
          hipZ,
          kneeX,
          footX,
          footZ: -hipZ * 0.58,
        };
      };

      const rightPose = buildLeg(0, 1, Math.max(0, dribblePulse));
      const leftPose = buildLeg(Math.PI, -1, Math.max(0, -dribblePulse));
      if (sprinting) {
        rightPose.hipX -= 0.06;
        leftPose.hipX -= 0.06;
      }

      this.setLegPose("right", rightPose, dt, 14);
      this.setLegPose("left", leftPose, dt, 14);

      const pelvisYaw = Math.sin(phase + Math.PI / 2) * 0.08 * direction;
      const pelvisRoll = Math.sin(phase) * 0.05 + this.turnLean * 0.18;
      const bodyLean = sprinting ? -0.18 : (movingBack ? 0.05 : -0.08);
      const torsoRoll = this.turnLean * 0.42 - pelvisRoll * 0.52;
      const shoulderCounter = -pelvisYaw * 0.82;
      const bob = Math.sin(phase * 2 - 0.3) * 0.01 + Math.abs(Math.sin(phase * 2)) * (0.012 + speedRatio * 0.018);

      this.parts.shorts.rotation.x = this.dampAngle(this.parts.shorts.rotation.x, 0, 12, dt);
      this.parts.shorts.rotation.y = this.dampAngle(this.parts.shorts.rotation.y, pelvisYaw, 12, dt);
      this.parts.shorts.rotation.z = this.dampAngle(this.parts.shorts.rotation.z, pelvisRoll, 12, dt);

      const rightArmX = -rightPose.hipX * 0.72 - (sprinting ? 0.16 : 0.1);
      const leftArmX = -leftPose.hipX * 0.72 - (sprinting ? 0.16 : 0.1);
      this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, rightArmX, 12, dt);
      this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, leftArmX, 12, dt);
      this.parts.rightArm.rotation.y = this.dampAngle(this.parts.rightArm.rotation.y, 0.06 + Math.sin(phase + Math.PI / 2) * 0.03, 10, dt);
      this.parts.leftArm.rotation.y = this.dampAngle(this.parts.leftArm.rotation.y, -0.06 - Math.sin(phase + Math.PI / 2) * 0.03, 10, dt);
      this.parts.rightArm.rotation.z = this.dampAngle(this.parts.rightArm.rotation.z, 0.16, 10, dt);
      this.parts.leftArm.rotation.z = this.dampAngle(this.parts.leftArm.rotation.z, -0.16, 10, dt);
      this.parts.rightForearm.rotation.x = this.dampAngle(this.parts.rightForearm.rotation.x, -0.72 + Math.abs(rightArmX + 0.1) * 0.16, 12, dt);
      this.parts.leftForearm.rotation.x = this.dampAngle(this.parts.leftForearm.rotation.x, -0.72 + Math.abs(leftArmX + 0.1) * 0.16, 12, dt);
      this.parts.rightForearm.rotation.y = this.dampAngle(this.parts.rightForearm.rotation.y, 0.02, 10, dt);
      this.parts.leftForearm.rotation.y = this.dampAngle(this.parts.leftForearm.rotation.y, -0.02, 10, dt);
      this.parts.rightForearm.rotation.z = this.dampAngle(this.parts.rightForearm.rotation.z, 0.02, 10, dt);
      this.parts.leftForearm.rotation.z = this.dampAngle(this.parts.leftForearm.rotation.z, -0.02, 10, dt);
      this.parts.rightHand.rotation.x = this.dampAngle(this.parts.rightHand.rotation.x, 0.06, 10, dt);
      this.parts.leftHand.rotation.x = this.dampAngle(this.parts.leftHand.rotation.x, 0.06, 10, dt);
      this.parts.rightHand.rotation.y = this.dampAngle(this.parts.rightHand.rotation.y, 0, 10, dt);
      this.parts.leftHand.rotation.y = this.dampAngle(this.parts.leftHand.rotation.y, 0, 10, dt);
      this.parts.rightHand.rotation.z = this.dampAngle(this.parts.rightHand.rotation.z, 0, 10, dt);
      this.parts.leftHand.rotation.z = this.dampAngle(this.parts.leftHand.rotation.z, 0, 10, dt);
      this.applyFingerCurl(this.parts.leftFingers, 0.56, dt);
      this.applyFingerCurl(this.parts.rightFingers, 0.56, dt);

      this.parts.torso.rotation.x = this.dampAngle(this.parts.torso.rotation.x, bodyLean + Math.sin(phase * 2) * 0.016 - this.strikeBlend * 0.08, 12, dt);
      this.parts.torso.rotation.y = this.dampAngle(this.parts.torso.rotation.y, shoulderCounter, 12, dt);
      this.parts.torso.rotation.z = this.dampAngle(this.parts.torso.rotation.z, torsoRoll, 12, dt);
      this.parts.head.rotation.x = this.dampAngle(this.parts.head.rotation.x, sprinting ? 0.05 : 0.03, 10, dt);
      this.parts.head.rotation.y = this.dampAngle(this.parts.head.rotation.y, Math.sin(phase * 0.5) * 0.035 + shoulderCounter * 0.18, 10, dt);
      this.parts.head.rotation.z = this.dampAngle(this.parts.head.rotation.z, -this.turnLean * 0.14 - pelvisRoll * 0.15, 10, dt);

      this.setBodyHeave(bob);
      return;
    }

    this.runTime += dt * 2.4;
    this.strikeBlend = THREE.MathUtils.lerp(this.strikeBlend, 0, Math.min(1, dt * 8));
    this.dribbleBlend = THREE.MathUtils.lerp(this.dribbleBlend, 0, Math.min(1, dt * 8));

    const breath = Math.sin(this.runTime) * 0.016;
    this.setLegPose("right", { hipX: 0.03, hipY: 0.01, hipZ: 0.02, kneeX: 0.08, footX: 0.02, footZ: -0.01 }, dt, 8);
    this.setLegPose("left", { hipX: -0.03, hipY: -0.01, hipZ: -0.02, kneeX: 0.08, footX: 0.02, footZ: 0.01 }, dt, 8);

    this.parts.shorts.rotation.x = this.dampAngle(this.parts.shorts.rotation.x, 0, 8, dt);
    this.parts.shorts.rotation.y = this.dampAngle(this.parts.shorts.rotation.y, Math.sin(this.runTime * 0.5) * 0.015, 8, dt);
    this.parts.shorts.rotation.z = this.dampAngle(this.parts.shorts.rotation.z, 0, 8, dt);
    this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, -0.12 + breath * 0.4, 8, dt);
    this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, -0.12 - breath * 0.4, 8, dt);
    this.parts.rightArm.rotation.y = this.dampAngle(this.parts.rightArm.rotation.y, 0.04, 8, dt);
    this.parts.leftArm.rotation.y = this.dampAngle(this.parts.leftArm.rotation.y, -0.04, 8, dt);
    this.parts.rightArm.rotation.z = this.dampAngle(this.parts.rightArm.rotation.z, 0.14, 8, dt);
    this.parts.leftArm.rotation.z = this.dampAngle(this.parts.leftArm.rotation.z, -0.14, 8, dt);
    this.parts.rightForearm.rotation.x = this.dampAngle(this.parts.rightForearm.rotation.x, -0.72, 8, dt);
    this.parts.leftForearm.rotation.x = this.dampAngle(this.parts.leftForearm.rotation.x, -0.72, 8, dt);
    this.parts.rightForearm.rotation.y = this.dampAngle(this.parts.rightForearm.rotation.y, 0, 8, dt);
    this.parts.leftForearm.rotation.y = this.dampAngle(this.parts.leftForearm.rotation.y, 0, 8, dt);
    this.parts.rightForearm.rotation.z = this.dampAngle(this.parts.rightForearm.rotation.z, 0, 8, dt);
    this.parts.leftForearm.rotation.z = this.dampAngle(this.parts.leftForearm.rotation.z, 0, 8, dt);
    this.parts.rightHand.rotation.x = this.dampAngle(this.parts.rightHand.rotation.x, 0.04, 8, dt);
    this.parts.leftHand.rotation.x = this.dampAngle(this.parts.leftHand.rotation.x, 0.04, 8, dt);
    this.parts.rightHand.rotation.y = this.dampAngle(this.parts.rightHand.rotation.y, 0, 8, dt);
    this.parts.leftHand.rotation.y = this.dampAngle(this.parts.leftHand.rotation.y, 0, 8, dt);
    this.parts.rightHand.rotation.z = this.dampAngle(this.parts.rightHand.rotation.z, 0, 8, dt);
    this.parts.leftHand.rotation.z = this.dampAngle(this.parts.leftHand.rotation.z, 0, 8, dt);
    this.applyFingerCurl(this.parts.leftFingers, 0.62, dt);
    this.applyFingerCurl(this.parts.rightFingers, 0.62, dt);
    this.parts.torso.rotation.x = this.dampAngle(this.parts.torso.rotation.x, -0.03 + breath * 0.35, 8, dt);
    this.parts.torso.rotation.y = this.dampAngle(this.parts.torso.rotation.y, 0, 8, dt);
    this.parts.torso.rotation.z = this.dampAngle(this.parts.torso.rotation.z, 0, 8, dt);
    this.parts.head.rotation.x = this.dampAngle(this.parts.head.rotation.x, 0.02, 8, dt);
    this.parts.head.rotation.y = this.dampAngle(this.parts.head.rotation.y, Math.sin(this.runTime * 0.45) * 0.03, 8, dt);
    this.parts.head.rotation.z = this.dampAngle(this.parts.head.rotation.z, 0, 8, dt);
    this.setBodyHeave(breath);
  }

  // Get aiming direction (Where the camera is looking)
  getAimDir() {
    const dir = this.tempAimDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    dir.y = 0;
    return dir.normalize();
  }

  applyDribbling(dt, sprinting, isMoving) {
    if (!window.game || !window.game.ball) return;
    const game = window.game;
    if (game?.mode === "room") {
      const ownerId = game.ballOwnerId;
      if (ownerId && ownerId !== game.myPlayerId) {
        const lastSync = game.lastBallSyncAt || 0;
        const timeout = game.ballOwnerTimeout || 350;
        if (performance.now() - lastSync < timeout) return;
      }
    }

    // Skip only if a kick was just performed to allow separation
    if (performance.now() - this.lastKickTime < 450) return;

    const ball = window.game.ball;
    const pPos = this.mesh.position;
    const bBody = ball.body;

    // Use THREE vectors for precision math
    const ballPos = this.tempBallPos.set(bBody.position.x, bBody.position.y, bBody.position.z);
    const dist = pPos.distanceTo(ballPos);

    const controlRange = 3.4;
    if (dist > controlRange || ballPos.y > 1.4) return;
    bBody.wakeUp();

    const facing = this.tempFacing.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).setY(0);
    if (facing.lengthSq() > 0.0001) facing.normalize();
    const driveDir = isMoving ? this.tempDriveDir.copy(this.moveDir) : facing;
    const side = this.tempSide.set(-driveDir.z, 0, driveDir.x);

    // Foot-to-foot rhythm so the ball feels player-driven, not self-driven
    const touchWave = isMoving ? Math.sin(this.runTime * (sprinting ? 6.8 : 5.4)) * 0.17 : 0;
    const targetDist = sprinting ? 1.3 : 1.04;
    const controlPoint = this.tempControlPoint
      .copy(pPos)
      .addScaledVector(driveDir, targetDist)
      .addScaledVector(side, touchWave);

    // Sticky control with smooth snap: ball stays attached but still rolls and shifts naturally
    const snapAlpha = Math.min(1, dt * (isMoving ? 16 : 12));
    const targetX = THREE.MathUtils.lerp(bBody.position.x, controlPoint.x, snapAlpha);
    const targetZ = THREE.MathUtils.lerp(bBody.position.z, controlPoint.z, snapAlpha);
    const nextY = Math.max(0.225, bBody.position.y - dt * 4);
    bBody.position.set(targetX, nextY, targetZ);

    // Match velocity to player movement to avoid "self moving" look
    const speed = this.velocity.length();
    const flow = driveDir.clone().multiplyScalar(speed * (sprinting ? 0.98 : 0.9));
    bBody.velocity.set(flow.x, Math.min(0.2, bBody.velocity.y), flow.z);

    // Rolling spin based on move direction
    const rightAxis = side;
    const rollStrength = speed * 1.8;
    bBody.angularVelocity.set(
      rightAxis.x * rollStrength,
      touchWave * 2.2,
      rightAxis.z * rollStrength
    );

    // Feed animation system so foot touches visually match dribble
    this.dribbleBlend = THREE.MathUtils.lerp(this.dribbleBlend, isMoving ? 1 : 0.35, Math.min(1, dt * 10));
  }

  dampAngle(current, target, lambda, dt) {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * (1 - Math.exp(-lambda * dt));
  }

  clampToField() {
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -41, 41);
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -28, 28);
  }

  updateCamera(dt) {
    const target = this.tempCameraTarget.copy(this.mesh.position);
    const speedRatio = THREE.MathUtils.clamp(this.velocity.length() / this.sprintSpeed, 0, 1);
    const strideBob = Math.sin(this.runTime * 2.0) * 0.12 * speedRatio;
    let targetFov = this.lastCameraFov;
    if (this.mode === "thirdPerson") {
      const offset = this.tempCameraOffset.set(
        Math.sin(this.cameraYaw) * (this.cameraDistanceBase - speedRatio * 0.35) - this.turnLean * 0.55,
        this.cameraHeightBase + strideBob + speedRatio * 0.18,
        Math.cos(this.cameraYaw) * (this.cameraDistanceBase - speedRatio * 0.35) + Math.abs(this.turnLean) * 0.12
      );
      const camPos = this.tempCameraPos.copy(target).add(offset);
      this.camera.position.lerp(camPos, Math.min(1, dt * 8.5));
      targetFov = THREE.MathUtils.lerp(this.camera.fov, 63 + speedRatio * 5, Math.min(1, dt * 5));
    } else {
      const camPos = this.tempCameraPos.copy(target).add(this.tempCameraOffset.set(15, 15.5 + speedRatio, 15));
      this.camera.position.lerp(camPos, Math.min(1, dt * 3.2));
      targetFov = THREE.MathUtils.lerp(this.camera.fov, 58, Math.min(1, dt * 5));
    }
    if (Math.abs(targetFov - this.lastCameraFov) > 0.02) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
      this.lastCameraFov = targetFov;
    }
    this.tempCameraLook.set(
      target.x + this.moveDir.x * speedRatio * 0.65,
      target.y + 1.18 + strideBob * 0.45,
      target.z + this.moveDir.z * speedRatio * 0.65
    );
    this.camera.lookAt(this.tempCameraLook);
  }

  doSkill(index) {
    return this.queueSkill(index);
  }
}


