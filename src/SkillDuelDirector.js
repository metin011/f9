import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import { isArcSkill, isNutmegSkill } from "./SkillData.js?v=20260308-1";

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(min, max, value) {
  const t = clamp01((value - min) / Math.max(0.0001, max - min));
  return t * t * (3 - 2 * t);
}

export class SkillDuelDirector {
  constructor({ scene, player, ball }) {
    this.scene = scene;
    this.player = player;
    this.ball = ball;

    this.mode = "menu";
    this.trainingEnabled = false;
    this.academyDrill = null;
    this.currentEngagement = null;
    this.attackDir = new THREE.Vector3(1, 0, 0);
    this.rightDir = new THREE.Vector3(0, 0, 1);
    this.tempA = new THREE.Vector3();
    this.tempB = new THREE.Vector3();
    this.tempC = new THREE.Vector3();
    this.defender = this.buildDefender();
    this.exitGate = this.buildExitGate();
    this.scene.add(this.defender.mesh);
    this.scene.add(this.exitGate.mesh);
    this.syncVisibility();
  }

  buildDefender() {
    const root = new THREE.Group();
    const kitMat = new THREE.MeshPhysicalMaterial({
      color: 0xc93b47,
      roughness: 0.48,
      metalness: 0.03,
      clearcoat: 0.1,
      clearcoatRoughness: 0.66,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffe5dd, roughness: 0.46, metalness: 0.06 });
    const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xc69067, roughness: 0.72, metalness: 0.0 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x261b16, roughness: 0.74 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.36, metalness: 0.08 });

    const torso = new THREE.Group();
    torso.position.y = 1.42;
    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.44, 6, 16), kitMat);
    chest.rotation.z = Math.PI / 2;
    chest.castShadow = true;
    torso.add(chest);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.28), trimMat);
    stripe.position.set(0, 0.02, 0.14);
    stripe.castShadow = true;
    torso.add(stripe);

    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.34), trimMat);
    shorts.position.y = 1.03;
    shorts.castShadow = true;

    const createLeg = (x) => {
      const hip = new THREE.Group();
      hip.position.set(x, 1.02, 0);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.32, 5, 12), skinMat);
      thigh.position.y = -0.2;
      thigh.castShadow = true;
      hip.add(thigh);

      const shin = new THREE.Group();
      shin.position.y = -0.42;
      hip.add(shin);

      const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 5, 12), skinMat);
      calf.position.y = -0.19;
      calf.castShadow = true;
      shin.add(calf);

      const foot = new THREE.Group();
      foot.position.set(0, -0.41, 0.03);
      shin.add(foot);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.3), bootMat);
      boot.position.set(0, -0.04, 0.14);
      boot.castShadow = true;
      foot.add(boot);

      return { hip, shin, foot };
    };

    const createArm = (x) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(x, 1.68, 0.02);
      shoulder.rotation.z = x > 0 ? 0.14 : -0.14;

      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.18, 5, 12), kitMat);
      upper.position.y = -0.16;
      upper.castShadow = true;
      shoulder.add(upper);

      const forearm = new THREE.Group();
      forearm.position.y = -0.3;
      shoulder.add(forearm);

      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 5, 12), skinMat);
      lower.position.y = -0.14;
      lower.castShadow = true;
      forearm.add(lower);

      return { shoulder, forearm };
    };

    const head = new THREE.Group();
    head.position.y = 1.86;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), skinMat);
    skull.scale.set(0.95, 1.04, 0.98);
    skull.castShadow = true;
    head.add(skull);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.225, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMat);
    hair.position.y = 0.08;
    hair.castShadow = true;
    head.add(hair);

    const leftLeg = createLeg(-0.16);
    const rightLeg = createLeg(0.16);
    const leftArm = createArm(-0.32);
    const rightArm = createArm(0.32);

    root.add(torso, shorts, leftLeg.hip, rightLeg.hip, leftArm.shoulder, rightArm.shoulder, head);
    root.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });

    return {
      mesh: root,
      torso,
      shorts,
      head,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      state: "jockey",
      stateTime: 0,
      committedSide: 1,
      anchor: new THREE.Vector3(),
    };
  }

  buildExitGate() {
    const root = new THREE.Group();
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7ef29c,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd9fff0,
      emissive: 0x3faa7a,
      emissiveIntensity: 0.32,
      roughness: 0.32,
      metalness: 0.08,
    });

    const left = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12), frameMat);
    left.position.set(0, 0.9, -1.4);
    left.castShadow = true;
    const right = left.clone();
    right.position.z = 1.4;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 12), frameMat);
    top.rotation.x = Math.PI / 2;
    top.position.y = 1.78;
    top.castShadow = true;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.45), glowMat);
    glow.position.y = 0.94;
    glow.rotation.y = Math.PI / 2;

    root.add(left, right, top, glow);
    return {
      mesh: root,
      width: 2.8,
    };
  }

  getPlayerContext() {
    return {
      hasNearbyDefender: (distance = 3.3) => this.hasNearbyDefender(distance),
      getDefenderPosition: () => (this.isActive() ? this.defender.mesh.position.clone() : null),
      resolveSkillWindow: (payload) => this.resolveSkillWindow(payload),
      confirmSkillExit: (payload) => this.confirmSkillExit(payload),
      resetSkillDuel: () => this.resetEngagement(),
    };
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== "academy") this.academyDrill = null;
    this.syncVisibility();
  }

  toggleTrainingEnabled() {
    this.setTrainingEnabled(!this.trainingEnabled);
    return this.trainingEnabled;
  }

  setTrainingEnabled(enabled) {
    this.trainingEnabled = !!enabled;
    if (this.mode === "training" && this.trainingEnabled) this.resetPositions(true);
    if (!this.trainingEnabled && this.mode !== "academy") this.resetEngagement();
    this.syncVisibility();
  }

  isTrainingEnabled() {
    return this.trainingEnabled;
  }

  startAcademyDrill(drill) {
    this.academyDrill = {
      id: drill.id,
      skillId: drill.skillId,
      difficulty: drill.difficulty,
    };
    this.resetPositions(true, true);
    this.syncVisibility();
  }

  stopAcademyDrill() {
    this.academyDrill = null;
    if (this.mode !== "training") this.resetEngagement();
    this.syncVisibility();
  }

  isActive() {
    return (this.mode === "training" && this.trainingEnabled) || (this.mode === "academy" && !!this.academyDrill);
  }

  syncVisibility() {
    const active = this.isActive();
    this.defender.mesh.visible = active;
    this.exitGate.mesh.visible = active && !!this.academyDrill;
  }

  resetEngagement() {
    this.currentEngagement = null;
    this.defender.state = "jockey";
    this.defender.stateTime = 0;
    this.defender.committedSide = 1;
  }

  resetPositions(forceGate = false, force = false) {
    if (!force && !this.isActive()) {
      this.syncVisibility();
      return;
    }

    this.resetEngagement();

    const forward = this.getCarrierForward();
    const side = this.tempA.set(-forward.z, 0, forward.x);
    const playerPos = this.player.mesh.position;
    const gateSideBias = this.academyDrill ? 0.4 : 0;
    this.attackDir.copy(forward);
    this.rightDir.copy(side);

    this.defender.anchor.copy(playerPos).addScaledVector(forward, 2.8).addScaledVector(side, gateSideBias);
    this.defender.mesh.position.copy(this.defender.anchor);
    this.defender.mesh.rotation.set(0, Math.atan2(playerPos.x - this.defender.anchor.x, playerPos.z - this.defender.anchor.z), 0);
    this.defender.state = "jockey";
    this.defender.stateTime = 0;
    this.defender.committedSide = 1;

    if (forceGate && this.academyDrill) {
      this.exitGate.mesh.position.copy(this.defender.anchor).addScaledVector(forward, 1.9);
      this.exitGate.mesh.rotation.y = Math.atan2(forward.x, forward.z);
    }

    this.syncVisibility();
  }

  hasNearbyDefender(distance = 3.3) {
    if (!this.isActive()) return false;
    return this.player.mesh.position.distanceTo(this.defender.mesh.position) <= distance;
  }

  handleSkillEvent(payload = {}) {
    if (!this.isActive()) return;
    if (payload.phase === "telegraph") {
      this.ensureEngagement(payload);
      this.setDefenderState("closeDown");
    } else if (payload.phase === "finished" && !payload.success) {
      this.setDefenderState("recover");
    } else if (payload.phase === "blocked") {
      this.setDefenderState("jockey");
    }
  }

  ensureEngagement(payload = {}) {
    if (this.currentEngagement?.attemptId === payload.attemptId) return this.currentEngagement;
    this.currentEngagement = {
      attemptId: payload.attemptId,
      skillId: payload.skillId,
      resolved: false,
      success: false,
      beatDefender: false,
      cleanExit: false,
      airRecovery: false,
      perfectTiming: false,
    };
    return this.currentEngagement;
  }

  resolveSkillWindow({
    attemptId,
    descriptor,
    normalizedTime = 0,
    fakeSideSign = 1,
    exitSideSign = 1,
    playerPos,
  } = {}) {
    if (!this.isActive()) {
      return {
        attemptId,
        skillId: descriptor?.id,
        resolved: true,
        success: false,
        beatDefender: false,
        cleanExit: false,
        airRecovery: false,
        perfectTiming: false,
      };
    }
    const engagement = this.ensureEngagement({ attemptId, skillId: descriptor?.id });
    if (engagement.resolved) return { ...engagement };

    const playerPosition = playerPos || this.player.mesh.position;
    const dist = playerPosition.distanceTo(this.defender.mesh.position);
    const cueSide = descriptor?.defenderCue?.biteSide === "left"
      ? -1
      : descriptor?.defenderCue?.biteSide === "right"
        ? 1
        : (fakeSideSign || 1);
    const biteWindow = descriptor?.defenderCue?.biteWindow || [0.28, 0.5];
    const center = (biteWindow[0] + biteWindow[1]) * 0.5;
    const error = Math.abs(normalizedTime - center);
    const nearEnough = dist <= 3.45;
    const success = nearEnough && error <= 0.14;
    const perfectTiming = success && error <= 0.055;

    engagement.resolved = true;
    engagement.success = success;
    engagement.perfectTiming = perfectTiming;
    engagement.beatDefender = success;
    engagement.commitSide = cueSide;
    engagement.exitSideSign = exitSideSign || -cueSide || 1;
    engagement.distAtResolve = dist;
    this.defender.committedSide = cueSide;

    if (success) {
      if (descriptor?.defenderCue?.shieldWindow) this.setDefenderState("shielded");
      else if (descriptor?.defenderCue?.nutmeg) this.setDefenderState("beaten");
      else this.setDefenderState("stumble");
    } else {
      this.setDefenderState("bite");
      this.pokeBall(engagement.exitSideSign);
    }

    return { ...engagement };
  }

  confirmSkillExit({ attemptId, descriptor, playerPos, ballPos } = {}) {
    if (!this.isActive()) {
      return {
        attemptId,
        skillId: descriptor?.id,
        resolved: true,
        success: false,
        beatDefender: false,
        cleanExit: false,
        airRecovery: false,
        perfectTiming: false,
      };
    }
    const engagement = this.ensureEngagement({ attemptId, skillId: descriptor?.id });
    if (!engagement.resolved) return { ...engagement };

    const playerPosition = playerPos || this.player.mesh.position;
    const liveBall = ballPos || this.tempA.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    const defenderPos = this.defender.mesh.position;

    const playerForward = this.tempB.copy(playerPosition).sub(defenderPos).dot(this.attackDir);
    const ballForward = this.tempC.copy(liveBall).sub(defenderPos).dot(this.attackDir);
    const playerLateral = Math.abs(this.tempB.copy(playerPosition).sub(defenderPos).dot(this.rightDir));
    const ballLateral = Math.abs(this.tempC.copy(liveBall).sub(defenderPos).dot(this.rightDir));
    const gatePassed = this.academyDrill
      ? this.isPastGate(playerPosition, liveBall)
      : playerForward > 0.7 && playerLateral < 2.2;

    let cleanExit = engagement.success && gatePassed;
    let airRecovery = false;

    if (isArcSkill(descriptor)) {
      airRecovery = engagement.success &&
        gatePassed &&
        ballForward > 0.45 &&
        liveBall.y < 1.35 &&
        playerPosition.distanceTo(liveBall) <= 1.8;
      cleanExit = cleanExit && airRecovery;
    } else {
      cleanExit = cleanExit &&
        playerForward > 0.55 &&
        ballForward > 0.1 &&
        playerPosition.distanceTo(liveBall) <= 2.15 &&
        ballLateral < 2.1;
    }

    if (isNutmegSkill(descriptor)) {
      cleanExit = cleanExit && ballLateral < 0.62 && ballForward > 0.2;
    }

    engagement.cleanExit = cleanExit;
    engagement.airRecovery = airRecovery;

    if (cleanExit) this.setDefenderState("beaten");
    else if (engagement.success) this.setDefenderState("recover");

    return { ...engagement };
  }

  isPastGate(playerPos, ballPos) {
    const gatePos = this.exitGate.mesh.position;
    const playerForward = this.tempA.copy(playerPos).sub(gatePos).dot(this.attackDir);
    const ballForward = this.tempB.copy(ballPos).sub(gatePos).dot(this.attackDir);
    const playerLateral = Math.abs(this.tempA.dot(this.rightDir));
    const ballLateral = Math.abs(this.tempB.dot(this.rightDir));
    return playerForward > -0.05 &&
      ballForward > -0.28 &&
      Math.min(playerLateral, ballLateral) <= this.exitGate.width * 0.52;
  }

  pokeBall(exitSideSign = 1) {
    const forward = this.attackDir;
    const side = this.rightDir;
    this.ball.body.velocity.set(
      forward.x * -4.2 + side.x * exitSideSign * 2.8,
      Math.max(0.4, this.ball.body.velocity.y * 0.3),
      forward.z * -4.2 + side.z * exitSideSign * 2.8
    );
    this.ball.body.angularVelocity.y = exitSideSign * 3.1;
  }

  setDefenderState(state) {
    if (this.defender.state === state) return;
    this.defender.state = state;
    this.defender.stateTime = 0;
  }

  getCarrierForward() {
    return this.tempA.set(0, 0, 1).applyQuaternion(this.player.mesh.quaternion).setY(0).normalize();
  }

  update(dt, elapsed, { mode = this.mode, frozen = false } = {}) {
    this.mode = mode;
    this.syncVisibility();
    if (!this.isActive()) return;

    this.defender.stateTime += dt;

    if (!frozen) {
      if (this.defender.state === "jockey" || this.defender.state === "closeDown") {
        this.updateJockey(dt, elapsed);
      } else if (this.defender.state === "bite") {
        this.updateBite(dt);
      } else if (this.defender.state === "shielded") {
        this.updateShielded(dt);
      } else if (this.defender.state === "stumble") {
        this.updateStumble(dt);
      } else if (this.defender.state === "beaten") {
        this.updateBeaten(dt);
      } else {
        this.updateRecover(dt);
      }
    }

    this.animateDefenderPose(dt, elapsed);
    this.animateGate(elapsed);
  }

  updateJockey(dt, elapsed) {
    const playerPos = this.player.mesh.position;
    const forward = this.getCarrierForward();
    const side = this.tempB.set(-forward.z, 0, forward.x);
    this.attackDir.copy(forward);
    this.rightDir.copy(side);

    const strafe = Math.sin(elapsed * 1.7) * (this.defender.state === "closeDown" ? 0.42 : 0.26);
    const depth = this.defender.state === "closeDown" ? 2.2 : 2.8;
    const desired = this.tempC.copy(playerPos).addScaledVector(forward, depth).addScaledVector(side, strafe);
    this.defender.mesh.position.lerp(desired, Math.min(1, dt * 3.8));
    const targetYaw = Math.atan2(playerPos.x - this.defender.mesh.position.x, playerPos.z - this.defender.mesh.position.z);
    this.defender.mesh.rotation.y += (targetYaw - this.defender.mesh.rotation.y) * Math.min(1, dt * 6.5);
  }

  updateBite(dt) {
    const side = this.rightDir;
    this.defender.mesh.position.addScaledVector(side, this.defender.committedSide * dt * 4.8);
    this.defender.mesh.position.addScaledVector(this.attackDir, -dt * 1.5);
    if (this.defender.stateTime > 0.28) this.setDefenderState("recover");
  }

  updateShielded(dt) {
    this.defender.mesh.position.addScaledVector(this.attackDir, dt * 0.8);
    this.defender.mesh.position.addScaledVector(this.rightDir, this.defender.committedSide * dt * 1.2);
    if (this.defender.stateTime > 0.32) this.setDefenderState("beaten");
  }

  updateStumble(dt) {
    this.defender.mesh.position.addScaledVector(this.rightDir, this.defender.committedSide * dt * 3.4);
    this.defender.mesh.position.addScaledVector(this.attackDir, -dt * 1.1);
    if (this.defender.stateTime > 0.42) this.setDefenderState("recover");
  }

  updateBeaten(dt) {
    this.defender.mesh.position.addScaledVector(this.rightDir, this.defender.committedSide * dt * 1.5);
    this.defender.mesh.position.addScaledVector(this.attackDir, -dt * 0.65);
    if (this.defender.stateTime > 0.6) this.setDefenderState("recover");
  }

  updateRecover(dt) {
    const playerPos = this.player.mesh.position;
    const desired = this.tempA.copy(playerPos).addScaledVector(this.attackDir, 2.65);
    this.defender.mesh.position.lerp(desired, Math.min(1, dt * 2.8));
    if (this.defender.stateTime > 0.5) this.setDefenderState("jockey");
  }

  animateDefenderPose(dt, elapsed) {
    const state = this.defender.state;
    const pulse = Math.sin(elapsed * 5.2) * 0.08;
    let torsoLean = 0;
    let torsoRoll = 0;
    let legX = 0;
    let knee = 0.12;
    let armSwing = 0.12;
    let headTilt = 0;

    if (state === "jockey" || state === "closeDown") {
      const crouch = state === "closeDown" ? 0.22 : 0.14;
      torsoLean = -0.18 - crouch * 0.3;
      torsoRoll = pulse * 0.18;
      legX = 0.16 + pulse * 0.1;
      knee = 0.34;
      armSwing = 0.22;
    } else if (state === "bite") {
      torsoLean = -0.28;
      torsoRoll = this.defender.committedSide * 0.34;
      legX = 0.32;
      knee = 0.62;
      armSwing = 0.38;
      headTilt = this.defender.committedSide * 0.14;
    } else if (state === "shielded") {
      torsoLean = -0.12;
      torsoRoll = -this.defender.committedSide * 0.22;
      legX = 0.24;
      knee = 0.44;
      armSwing = 0.3;
      headTilt = -this.defender.committedSide * 0.08;
    } else if (state === "stumble" || state === "beaten") {
      torsoLean = 0.06;
      torsoRoll = this.defender.committedSide * 0.44;
      legX = -0.18;
      knee = 0.18;
      armSwing = 0.46;
      headTilt = this.defender.committedSide * 0.2;
    } else {
      torsoLean = -0.08;
      torsoRoll = pulse * 0.1;
      legX = 0.1;
      knee = 0.22;
      armSwing = 0.18;
    }

    const leftLeg = this.defender.leftLeg;
    const rightLeg = this.defender.rightLeg;
    const leftArm = this.defender.leftArm;
    const rightArm = this.defender.rightArm;

    this.defender.torso.rotation.x += (torsoLean - this.defender.torso.rotation.x) * Math.min(1, dt * 10);
    this.defender.torso.rotation.z += (torsoRoll - this.defender.torso.rotation.z) * Math.min(1, dt * 10);
    this.defender.shorts.rotation.z += (torsoRoll * 0.6 - this.defender.shorts.rotation.z) * Math.min(1, dt * 10);
    this.defender.head.rotation.z += (headTilt - this.defender.head.rotation.z) * Math.min(1, dt * 10);
    this.defender.head.rotation.y += ((-torsoRoll * 0.35) - this.defender.head.rotation.y) * Math.min(1, dt * 10);

    leftLeg.hip.rotation.x += ((legX + pulse * 0.18) - leftLeg.hip.rotation.x) * Math.min(1, dt * 10);
    rightLeg.hip.rotation.x += ((legX - pulse * 0.18) - rightLeg.hip.rotation.x) * Math.min(1, dt * 10);
    leftLeg.hip.rotation.z += ((0.12 + torsoRoll * 0.3) - leftLeg.hip.rotation.z) * Math.min(1, dt * 10);
    rightLeg.hip.rotation.z += ((-0.12 + torsoRoll * 0.3) - rightLeg.hip.rotation.z) * Math.min(1, dt * 10);
    leftLeg.shin.rotation.x += (knee - leftLeg.shin.rotation.x) * Math.min(1, dt * 10);
    rightLeg.shin.rotation.x += (knee - rightLeg.shin.rotation.x) * Math.min(1, dt * 10);

    leftArm.shoulder.rotation.x += ((-0.28 - armSwing) - leftArm.shoulder.rotation.x) * Math.min(1, dt * 10);
    rightArm.shoulder.rotation.x += ((-0.28 + armSwing) - rightArm.shoulder.rotation.x) * Math.min(1, dt * 10);
    leftArm.shoulder.rotation.z += ((-0.2 - torsoRoll * 0.35) - leftArm.shoulder.rotation.z) * Math.min(1, dt * 10);
    rightArm.shoulder.rotation.z += ((0.2 - torsoRoll * 0.35) - rightArm.shoulder.rotation.z) * Math.min(1, dt * 10);
    leftArm.forearm.rotation.x += ((-0.6 - armSwing * 0.35) - leftArm.forearm.rotation.x) * Math.min(1, dt * 10);
    rightArm.forearm.rotation.x += ((-0.6 - armSwing * 0.35) - rightArm.forearm.rotation.x) * Math.min(1, dt * 10);
  }

  animateGate(elapsed) {
    if (!this.exitGate.mesh.visible) return;
    const pulse = 1 + Math.sin(elapsed * 4.2) * 0.06;
    this.exitGate.mesh.scale.setScalar(pulse);
  }
}
