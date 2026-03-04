import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const SKILL_MOVESETS = {
  1: { burst: 0.2, yaw: 0.18, side: -0.1 },
  2: { burst: 0.28, yaw: -0.24, side: 0.12 },
  3: { burst: 0.32, yaw: 0.3, side: -0.15 },
  4: { burst: 0.34, yaw: -0.34, side: 0.16 },
  5: { burst: 0.36, yaw: 0.36, side: -0.18 },
  6: { burst: 0.4, yaw: -0.38, side: 0.2 },
  7: { burst: 0.43, yaw: 0.42, side: -0.23 },
  8: { burst: 0.46, yaw: -0.44, side: 0.24 },
  9: { burst: 0.5, yaw: 0.48, side: -0.26 },
  10: { burst: 0.56, yaw: -0.54, side: 0.3 },
};

export class Player {
  constructor(scene, camera, physics) {
    this.scene = scene;
    this.camera = camera;
    this.physics = physics;

    this.keys = {};
    this.mode = "thirdPerson";

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
    this.skillState = { cHeld: false, trigger: null, lockUntil: 0 };
    this.runTime = 0;
    this.kickAnim = 0;
    this.lastKickTime = 0; // Prevent immediate re-pick after shot

    this.mesh = this.buildMesh();
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
    this.cameraYaw = 0; // The angle around the player
    this.cameraDistance = 8.5;
    this.cameraHeight = 4.5;

    this.pBody = this.physics.createPlayerBody();
    this.bindInput();
  }

  buildMesh() {
    const root = new THREE.Group();

    // Materials
    this.kitMat = new THREE.MeshStandardMaterial({ color: 0x4e8dff, roughness: 0.65 }); // Shirt
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xdcab7c, roughness: 0.8 }); // Skin
    this.shortMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 }); // Shorts
    this.hairMat = new THREE.MeshStandardMaterial({ color: 0x33241b, roughness: 0.8 });
    this.beardMat = new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 0.8 });
    this.bootMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.4, metalness: 0.2 }); // Shoes

    // Torso (Shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), this.kitMat);
    torso.position.y = 1.35;
    torso.castShadow = true;

    // Shorts
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.32), this.shortMat);
    shorts.position.y = 0.95;
    shorts.castShadow = true;

    // Legs (Pivot at hips y=0.95)
    const createLeg = (x) => {
      const legGroup = new THREE.Group();
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.85, 8), this.skinMat);
      leg.position.y = -0.425; // Center is half of height
      leg.castShadow = true;

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.35), this.bootMat);
      boot.position.set(0, -0.85, 0.1);
      boot.castShadow = true;

      legGroup.add(leg, boot);
      legGroup.position.set(x, 0.95, 0); // Attach at hips
      return legGroup;
    };
    const leftLeg = createLeg(-0.16);
    const rightLeg = createLeg(0.16);

    // Arms (Pivot at shoulders y=1.65)
    const createArm = (x) => {
      const armGroup = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.7, 8), this.skinMat);
      arm.position.y = -0.35;
      arm.castShadow = true;

      armGroup.add(arm);
      armGroup.position.set(x, 1.65, 0); // Attach at shoulders
      // Default pose
      armGroup.rotation.z = x > 0 ? 0.2 : -0.2;
      return armGroup;
    };
    const leftArm = createArm(-0.35);
    const rightArm = createArm(0.35);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 14), this.skinMat);
    head.position.y = 1.84;
    head.castShadow = true;

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), this.hairMat);
    hair.position.y = 1.94;

    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.38), this.beardMat);
    beard.position.set(0, 1.74, 0.11);

    // Number on shirt (Back)
    const numberPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    numberPlane.position.set(0, 1.45, -0.16);
    numberPlane.rotation.y = Math.PI;

    this.parts = { head, hair, beard, numberPlane, torso, shorts, leftLeg, rightLeg, leftArm, rightArm };
    root.add(torso, shorts, leftLeg, rightLeg, leftArm, rightArm, head, hair, beard, numberPlane);
    return root;
  }

  applyAvatar(avatar) {
    const skinMap = { Aciq: 0xf0ccab, Orta: 0xd8a87d, Tund: 0x8d5a3f };
    const hairMap = { Qisa: 0x2e241f, Uzun: 0x4a2f24, Topuz: 0x1f1713 };
    const beardVisible = avatar.beard !== "Yox";

    this.skinMat.color.setHex(skinMap[avatar.skin] ?? skinMap.Orta);
    this.hairMat.color.setHex(hairMap[avatar.hair] ?? hairMap.Qisa);
    this.parts.beard.visible = beardVisible;

    // Scaling hair for different styles
    if (avatar.hair === "Topuz") {
      this.parts.hair.scale.set(1.1, 1.2, 1.1);
    } else if (avatar.hair === "Uzun") {
      this.parts.hair.scale.set(1.05, 1.05, 1.15);
    } else {
      this.parts.hair.scale.set(1, 1, 1);
    }

    const jerseyHue = (Number(avatar.jerseyNumber) % 50) / 50;
    this.kitMat.color.setHSL(0.55 + jerseyHue * 0.16, 0.75, 0.56);

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(avatar.jerseyNumber), 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    this.parts.numberPlane.material.map = tex;
    this.parts.numberPlane.material.needsUpdate = true;
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat && e.code === "KeyV") return;
      this.keys[e.code] = true;
      if (e.code === "ArrowLeft") this.spinInput = -1;
      if (e.code === "ArrowRight") this.spinInput = 1;

      if (e.code === "KeyC") this.skillState.cHeld = true;
      if (this.skillState.cHeld && /^Digit([1-9]|0)$/.test(e.code)) {
        const index = e.code === "Digit0" ? 10 : Number(e.code.replace("Digit", ""));
        this.skillState.trigger = index;
      }

      if (["Space", "KeyE", "KeyQ"].includes(e.code) && !this.charge) {
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

  update(dt) {
    const now = performance.now();
    if (this.skillState.trigger && now > this.skillState.lockUntil) {
      this.doSkill(this.skillState.trigger);
      this.skillState.trigger = null;
      this.skillState.lockUntil = now + 380;
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
    const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    camFwd.y = 0;
    camFwd.normalize();

    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
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

    const targetSpeed = sprinting ? this.sprintSpeed : this.walkSpeed;
    this.velocity.copy(this.moveDir).multiplyScalar(targetSpeed);
    this.mesh.position.addScaledVector(this.velocity, dt);

    if (isMoving) {
      const targetAngle = Math.atan2(this.moveDir.x, this.moveDir.z);
      this.mesh.rotation.y = this.dampAngle(this.mesh.rotation.y, targetAngle, 20, dt);
    }

    // 5. Apply Animations
    this.applyAnimations(dt, isMoving, sprinting);

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

    // CRITICAL: Apply Dribbling LAST after all movements to ensure ZERO delay/lag
    this.applyDribbling(dt, sprinting);
  }

  triggerKick() {
    this.kickAnim = 1.0; // Starts the kick swing
    this.lastKickTime = performance.now();
  }

  applyAnimations(dt, isMoving, sprinting) {
    // Determine animation speed
    const speedFactor = sprinting ? 14 : 9;

    // Kick Animation overrides right leg
    if (this.kickAnim > 0) {
      this.kickAnim = Math.max(0, this.kickAnim - dt * 4);
      // Swing right leg forward then back
      this.parts.rightLeg.rotation.x = Math.sin(this.kickAnim * Math.PI) * -1.2;
    }

    // Movement Animations
    if (isMoving) {
      this.runTime += dt * speedFactor;

      // Running cycle
      const legPitch = Math.sin(this.runTime) * (sprinting ? 1.0 : 0.6);

      // If kicking, do not modify right leg here
      if (this.kickAnim <= 0) {
        this.parts.rightLeg.rotation.x = legPitch;
      }
      this.parts.leftLeg.rotation.x = -legPitch;

      // Arms swing opposite to legs
      this.parts.rightArm.rotation.x = -legPitch * 0.8;
      this.parts.leftArm.rotation.x = legPitch * 0.8;

      // Arm bend
      this.parts.rightArm.rotation.z = 0.2;
      this.parts.leftArm.rotation.z = -0.2;

      // Torso bobbing
      const bob = Math.abs(Math.sin(this.runTime * 2)) * 0.05;
      this.parts.torso.position.y = 1.35 + bob;
      this.parts.head.position.y = 1.84 + bob;
      this.parts.hair.position.y = 1.94 + bob;
      this.parts.beard.position.y = 1.74 + bob;
      this.parts.numberPlane.position.y = 1.45 + bob;

    } else {
      // Idle Breathing Animation
      this.runTime += dt * 2.5;

      if (this.kickAnim <= 0) {
        this.parts.rightLeg.rotation.x = this.dampAngle(this.parts.rightLeg.rotation.x, 0, 10, dt);
      }
      this.parts.leftLeg.rotation.x = this.dampAngle(this.parts.leftLeg.rotation.x, 0, 10, dt);

      this.parts.rightArm.rotation.x = this.dampAngle(this.parts.rightArm.rotation.x, 0, 10, dt);
      this.parts.leftArm.rotation.x = this.dampAngle(this.parts.leftArm.rotation.x, 0, 10, dt);

      // Relaxed arms
      this.parts.rightArm.rotation.z = 0.15;
      this.parts.leftArm.rotation.z = -0.15;

      const breath = Math.sin(this.runTime) * 0.02;
      this.parts.torso.position.y = 1.35 + breath;
      this.parts.head.position.y = 1.84 + breath;
      this.parts.hair.position.y = 1.94 + breath;
      this.parts.beard.position.y = 1.74 + breath;
      this.parts.numberPlane.position.y = 1.45 + breath;
    }
  }

  // Get aiming direction (Where the camera is looking)
  getAimDir() {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    dir.y = 0;
    return dir.normalize();
  }

  applyDribbling(dt, sprinting) {
    if (!window.game || !window.game.ball) return;

    // Skip only if a kick was just performed to allow separation
    if (performance.now() - this.lastKickTime < 450) return;

    const ball = window.game.ball;
    const pPos = this.mesh.position;
    const bBody = ball.body;

    // Use THREE vectors for precision math
    const ballPos = new THREE.Vector3(bBody.position.x, bBody.position.y, bBody.position.z);
    const dist = pPos.distanceTo(ballPos);

    // ZERO DELAY LOCK: Large range to ensure we never "drop" the ball unless kicked
    const lockRange = 4.5;
    if (dist < lockRange && ballPos.y < 3.0) {
      bBody.wakeUp();

      // Get direction the player is looking
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);

      // Calculate PERFECT target point - constant 1.2m in front
      const targetDist = sprinting ? 1.5 : 1.15;
      const targetPos = pPos.clone().addScaledVector(fwd, targetDist);

      // --- ZERO LAG SNAP ---
      // We hard-reset the position to the target every single frame
      bBody.position.set(targetPos.x, 0.225, targetPos.z);

      // --- MATCH VELOCITY EXACTLY ---
      // This eliminates the "trailing" effect completely
      bBody.velocity.set(this.velocity.x, 0, this.velocity.z);

      // --- MANUAL ROLLING ANIMATION ---
      const speed = this.velocity.length();
      if (speed > 0.05) {
        const radius = 0.23;
        const rollAngle = (speed * dt) / radius;
        // Direction of movement is forward, so rotation axis is Right
        const axis = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();

        const q = new THREE.Quaternion().setFromAxisAngle(axis, rollAngle);
        const currentQ = new THREE.Quaternion(bBody.quaternion.x, bBody.quaternion.y, bBody.quaternion.z, bBody.quaternion.w);
        currentQ.premultiply(q);
        bBody.quaternion.set(currentQ.x, currentQ.y, currentQ.z, currentQ.w);
      }

      // Kill all independent movement
      bBody.angularVelocity.set(0, 0, 0);
    }
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
    const target = this.mesh.position.clone();
    if (this.mode === "thirdPerson") {
      // Orbit camera calculation
      const offset = new THREE.Vector3(
        Math.sin(this.cameraYaw) * this.cameraDistance,
        this.cameraHeight,
        Math.cos(this.cameraYaw) * this.cameraDistance
      );
      const camPos = target.clone().add(offset);
      this.camera.position.lerp(camPos, Math.min(1, dt * 10));
    } else {
      const camPos = target.clone().add(new THREE.Vector3(15, 15, 15));
      this.camera.position.lerp(camPos, Math.min(1, dt * 3));
    }
    // Look at player slightly from above
    this.camera.lookAt(target.x, target.y + 1.2, target.z);
  }

  doSkill(index) {
    const skill = SKILL_MOVESETS[index] || SKILL_MOVESETS[1];
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
    this.mesh.position.addScaledVector(fwd, skill.burst);
    this.mesh.position.addScaledVector(side, skill.side);
    this.mesh.rotation.y += skill.yaw;
  }
}
