import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

export class Physics {
  constructor(scene) {
    this.scene = scene;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.dynamicBodies = [];
    this.flagCloths = [];
    this.crowdGlowMaterials = [];
    this.adBoardTextures = [];
    this.scoreboardMaterials = [];
    this.floodMaterials = [];
    this.skyDome = null;
    this.performanceProfile = "high";
    this.visualTick = 0;
    this.ballBody = null;
    this.ballGroundY = 0.225;
  }

  setupField() {
    const groundMat = new CANNON.Material("ground");
    const ballMat = new CANNON.Material("ball");
    const playerMat = new CANNON.Material("player");

    const contact = new CANNON.ContactMaterial(groundMat, ballMat, {
      friction: 0.42,
      restitution: 0.34,
    });
    this.world.addContactMaterial(contact);

    const playerBallContact = new CANNON.ContactMaterial(playerMat, ballMat, {
      friction: 0.2,
      restitution: 0.5,
    });
    this.world.addContactMaterial(playerBallContact);

    const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    this.playerMaterial = playerMat;

    // Invisible Walls for Ball (Field boundaries)
    // Field is 90x60 -> ±45, ±30.
    // We place walls slightly outside (±46, ±31) to allow top to reach lines
    const wallMat = new CANNON.Material("wall");
    const wallContact = new CANNON.ContactMaterial(ballMat, wallMat, {
      friction: 0.1,
      restitution: 0.5,
    });
    this.world.addContactMaterial(wallContact);

    const createWall = (x, z, w, h, d, visible = false) => {
      const body = new CANNON.Body({ mass: 0, material: wallMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w, h, d)));
      body.position.set(x, h, z);
      this.world.addBody(body);
      if (visible) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * 2, h * 2, d * 2), new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.2 }));
        mesh.position.set(x, h, z);
        this.scene.add(mesh);
      }
    };

    // Strict Arena Boundaries (Increased height to 50m)
    // Pushed back slightly (±48) to allow ball to enter the goal net
    createWall(48, 0, 1, 50, 31);   // Right
    createWall(-48, 0, 1, 50, 31);  // Left
    createWall(0, 31, 48, 50, 1);   // Front
    createWall(0, -31, 48, 50, 1);  // Back

    // Physical Goal Posts to allow bouncing (approximate positions)
    const postRadius = 0.1;
    const postMat = new CANNON.Material("post");
    const postContact = new CANNON.ContactMaterial(ballMat, postMat, {
      friction: 0.2,
      restitution: 0.6, // Bouncy goal posts
    });
    this.world.addContactMaterial(postContact);

    const createPhysicalPost = (x, z, h) => {
      const body = new CANNON.Body({ mass: 0, material: postMat });
      body.addShape(new CANNON.Cylinder(postRadius, postRadius, h, 8));
      body.position.set(x, h / 2, z);
      // Cannon cylinders are along Y axis by default
      this.world.addBody(body);
    };

    const createPhysicalCrossbar = (x, z, w) => {
      const body = new CANNON.Body({ mass: 0, material: postMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.08, 0.08, w / 2)));
      body.position.set(x, 3.0, z);
      this.world.addBody(body);
    };

    // Goal Left (at x = -45)
    createPhysicalPost(-45, -3.7, 3.0); // Left post
    createPhysicalPost(-45, 3.7, 3.0);  // Right post
    createPhysicalCrossbar(-45, 0, 7.4); // Crossbar

    // Goal Right (at x = 45)
    createPhysicalPost(45, -3.7, 3.0); // Left post
    createPhysicalPost(45, 3.7, 3.0);  // Right post
    createPhysicalCrossbar(45, 0, 7.4); // Crossbar

    this.buildVisualStadium();

    this.groundMaterial = groundMat;
    this.ballMaterial = ballMat;
    this.setPerformanceProfile("high");
  }

  buildVisualStadium() {
    const staticStartIndex = this.scene.children.length;
    const fieldWidth = 90;
    const fieldHeight = 60;
    const lineWidth = 0.22;
    const halfField = fieldWidth / 2;
    const halfHeight = fieldHeight / 2;

    this.skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(185, 40, 24),
      new THREE.MeshBasicMaterial({
        map: this.createSkyTexture(),
        side: THREE.BackSide,
      })
    );
    this.skyDome.position.y = 28;
    this.scene.add(this.skyDome);

    // Pitch base
    const baseGeo = new THREE.PlaneGeometry(fieldWidth + 20, fieldHeight + 20);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0d3511,
      roughness: 0.96,
      metalness: 0.0,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.025;
    base.receiveShadow = true;
    this.scene.add(base);

    // Grass pitch
    const grassTex = this.createGrassTexture();
    const grassBump = this.createGrassBumpTexture();
    const grassGeo = new THREE.PlaneGeometry(fieldWidth, fieldHeight, 24, 16);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1b6426,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0x091706,
      emissiveIntensity: 0.015,
      map: grassTex,
      bumpMap: grassBump,
      bumpScale: 0.05,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    const pitchGloss = new THREE.Mesh(
      new THREE.PlaneGeometry(fieldWidth, fieldHeight),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.012,
        roughness: 0.34,
        metalness: 0.0,
        clearcoat: 0.06,
        clearcoatRoughness: 0.46,
      })
    );
    pitchGloss.rotation.x = -Math.PI / 2;
    pitchGloss.position.y = 0.004;
    pitchGloss.receiveShadow = true;
    this.scene.add(pitchGloss);

    // Mowing stripes
    const stripeMatA = new THREE.MeshStandardMaterial({
      color: 0x2c8f3d,
      roughness: 0.86,
      metalness: 0,
      bumpMap: grassBump,
      bumpScale: 0.045,
    });
    const stripeMatB = new THREE.MeshStandardMaterial({
      color: 0x1f7430,
      roughness: 0.92,
      metalness: 0,
      bumpMap: grassBump,
      bumpScale: 0.045,
    });
    const stripeCount = 10;
    const stripeWidth = fieldWidth / stripeCount;
    for (let i = 0; i < stripeCount; i += 1) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(stripeWidth, fieldHeight),
        i % 2 === 0 ? stripeMatA : stripeMatB
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-fieldWidth / 2 + stripeWidth * (i + 0.5), 0.001, 0);
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }

    // Stadium markings
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xfefefe,
      roughness: 0.58,
      metalness: 0.02,
      emissive: 0x1f1f1f,
      emissiveIntensity: 0.02,
    });

    const addMarking = (w, h, x, z, rot = 0, y = 0.023) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, y, z);
      this.scene.add(m);
    };

    const addRectOutline = (cx, cz, w, h, t = lineWidth) => {
      addMarking(w, t, cx, cz - h / 2);
      addMarking(w, t, cx, cz + h / 2);
      addMarking(t, h, cx - w / 2, cz);
      addMarking(t, h, cx + w / 2, cz);
    };

    // Full pitch border
    addRectOutline(0, 0, fieldWidth, fieldHeight);
    // Halfway line
    addMarking(lineWidth, fieldHeight, 0, 0);

    // Center Circle
    const circleGeo = new THREE.RingGeometry(9.15 - lineWidth / 2, 9.15 + lineWidth / 2, 96);
    const circle = new THREE.Mesh(circleGeo, lineMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.024;
    this.scene.add(circle);

    // Center spot
    const centerSpot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), lineMat);
    centerSpot.rotation.x = -Math.PI / 2;
    centerSpot.position.y = 0.025;
    this.scene.add(centerSpot);

    const centerBadge = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0f2238,
        roughness: 0.65,
        metalness: 0.12,
        transparent: true,
        opacity: 0.28,
      })
    );
    centerBadge.rotation.x = -Math.PI / 2;
    centerBadge.position.y = 0.019;
    this.scene.add(centerBadge);

    // Penalty boxes and goal boxes
    const penaltyDepth = 16.5;
    const penaltyWidth = 40.3;
    const goalDepth = 5.5;
    const goalWidth = 18.32;

    addRectOutline(-halfField + penaltyDepth / 2, 0, penaltyDepth, penaltyWidth);
    addRectOutline(halfField - penaltyDepth / 2, 0, penaltyDepth, penaltyWidth);
    addRectOutline(-halfField + goalDepth / 2, 0, goalDepth, goalWidth);
    addRectOutline(halfField - goalDepth / 2, 0, goalDepth, goalWidth);

    // Penalty spots
    const addSpot = (x) => {
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), lineMat);
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(x, 0.025, 0);
      this.scene.add(spot);
    };
    addSpot(-halfField + 11);
    addSpot(halfField - 11);

    // Penalty arcs
    const arcLeft = new THREE.Mesh(
      new THREE.RingGeometry(9.15 - lineWidth / 2, 9.15 + lineWidth / 2, 72, 1, -1.03, 2.06),
      lineMat
    );
    arcLeft.rotation.x = -Math.PI / 2;
    arcLeft.position.set(-halfField + 11, 0.024, 0);
    this.scene.add(arcLeft);

    const arcRight = new THREE.Mesh(
      new THREE.RingGeometry(9.15 - lineWidth / 2, 9.15 + lineWidth / 2, 72, 1, Math.PI - 1.03, 2.06),
      lineMat
    );
    arcRight.rotation.x = -Math.PI / 2;
    arcRight.position.set(halfField - 11, 0.024, 0);
    this.scene.add(arcRight);

    // Corner arcs
    const addCornerArc = (x, z, start) => {
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(0.95 - lineWidth / 2, 0.95 + lineWidth / 2, 36, 1, start, Math.PI / 2),
        lineMat
      );
      arc.rotation.x = -Math.PI / 2;
      arc.position.set(x, 0.024, z);
      this.scene.add(arc);
    };
    addCornerArc(-halfField, -halfHeight, 0);
    addCornerArc(-halfField, halfHeight, -Math.PI / 2);
    addCornerArc(halfField, -halfHeight, Math.PI / 2);
    addCornerArc(halfField, halfHeight, Math.PI);

    // Wear decals in high traffic zones
    const wearMat = new THREE.MeshStandardMaterial({
      color: 0x2a6f35,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
    });
    const addWearPatch = (x, z, w, h, rot = 0) => {
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wearMat);
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = rot;
      patch.position.set(x, 0.008, z);
      this.scene.add(patch);
    };
    addWearPatch(0, 0, 13, 9);
    addWearPatch(-halfField + 13, 0, 11, 16, 0.08);
    addWearPatch(halfField - 13, 0, 11, 16, -0.08);

    // Runoff track around pitch
    const runoffMat = new THREE.MeshStandardMaterial({
      color: 0x39434b,
      roughness: 0.9,
      metalness: 0.08,
    });
    const runoff = new THREE.Mesh(new THREE.RingGeometry(halfHeight + 4.5, halfHeight + 8.5, 4, 1), runoffMat);
    runoff.scale.set((halfField + 8.5) / (halfHeight + 8.5), 1, 1);
    runoff.rotation.x = -Math.PI / 2;
    runoff.position.y = -0.018;
    this.scene.add(runoff);

    // Ad boards
    const boardColors = ["#0d2740", "#123e5d", "#145d4b", "#7a4a0f"];
    const boardLabels = ["3D FUTBOL", "MATCHDAY", "GOAL CAM", "BAKU ARENA"];
    const addBoardLine = (z, width, rotY = 0) => {
      for (let i = -4; i <= 4; i += 1) {
        const index = i + 4;
        const boardTex = this.createBannerTexture(boardLabels[index % boardLabels.length], boardColors[index % boardColors.length]);
        const boardMat = new THREE.MeshPhysicalMaterial({
          map: boardTex,
          emissiveMap: boardTex,
          emissive: 0xffffff,
          emissiveIntensity: 0.08,
          roughness: 0.28,
          metalness: 0.16,
          clearcoat: 0.22,
          clearcoatRoughness: 0.45,
        });
        this.adBoardTextures.push(boardTex);

        if (rotY === Math.PI / 2 && Math.abs(i) <= 1) continue;

        const board = new THREE.Mesh(new THREE.BoxGeometry(width, 1.1, 0.3), boardMat);
        if (rotY === 0) {
          board.position.set(i * (width + 0.35), 0.6, z);
        } else {
          board.position.set(z, 0.6, i * (width + 0.35));
          board.rotation.y = rotY;
        }
        board.castShadow = true;
        this.scene.add(board);
      }
    };
    addBoardLine(halfHeight - 0.9, 9.6, 0);
    addBoardLine(-halfHeight + 0.9, 9.6, 0);
    // End boards pushed back slightly more to clear goal area
    addBoardLine(halfField + 2.5, 6.2, Math.PI / 2);
    addBoardLine(-halfField - 2.5, 6.2, Math.PI / 2);

    // Corner flags
    const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xe6edf7, roughness: 0.55, metalness: 0.35 });
    const makeFlag = (x, z, colorA, colorB) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 10), flagPoleMat);
      pole.position.y = 0.9;
      pole.castShadow = true;
      g.add(pole);

      const clothGeo = new THREE.PlaneGeometry(0.55, 0.32, 7, 4);
      const cloth = new THREE.Mesh(
        clothGeo,
        new THREE.MeshStandardMaterial({
          color: colorA,
          roughness: 0.6,
          metalness: 0.0,
          side: THREE.DoubleSide,
          emissive: colorB,
          emissiveIntensity: 0.05,
        })
      );
      cloth.position.set(0.28, 1.55, 0);
      cloth.rotation.y = Math.PI / 2;
      cloth.castShadow = true;
      this.flagCloths.push({
        mesh: cloth,
        base: Float32Array.from(cloth.geometry.attributes.position.array),
        phase: Math.random() * Math.PI * 2,
      });
      g.add(cloth);

      g.position.set(x, 0, z);
      this.scene.add(g);
    };
    makeFlag(-halfField + 0.1, -halfHeight + 0.1, 0xffc617, 0x772200);
    makeFlag(-halfField + 0.1, halfHeight - 0.1, 0xffc617, 0x772200);
    makeFlag(halfField - 0.1, -halfHeight + 0.1, 0xffc617, 0x772200);
    makeFlag(halfField - 0.1, halfHeight - 0.1, 0xffc617, 0x772200);

    // Team benches (dugout)
    const dugoutMat = new THREE.MeshStandardMaterial({
      color: 0xbfd9ee,
      roughness: 0.22,
      metalness: 0.12,
      transparent: true,
      opacity: 0.42,
    });
    const addDugout = (z) => {
      const dugout = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2.2, 20, 1, false, 0, Math.PI), dugoutMat);
      shell.rotation.z = Math.PI / 2;
      shell.rotation.y = z > 0 ? Math.PI : 0;
      shell.position.set(0, 1.12, 0);
      dugout.add(shell);

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(4.9, 0.16, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x233544, roughness: 0.7, metalness: 0.08 })
      );
      frame.position.set(0, 2.05, z > 0 ? -0.3 : 0.3);
      dugout.add(frame);

      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.18, 0.46),
        new THREE.MeshStandardMaterial({ color: 0x1f2e39, roughness: 0.75, metalness: 0.05 })
      );
      bench.position.set(0, 0.4, 0);
      dugout.add(bench);

      dugout.position.set(0, 0, z);
      this.scene.add(dugout);
    };
    addDugout(halfHeight - 3.4);
    addDugout(-halfHeight + 3.4);

    // Arena walls / stands
    const wallHeight = 9;
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x112a3a,
      roughness: 0.58,
      metalness: 0.12,
    });
    const seatRowMat = new THREE.MeshStandardMaterial({
      color: 0x19384e,
      roughness: 0.62,
      metalness: 0.08,
    });

    const createStand = (x, z, w, d, rotY = 0) => {
      const stand = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), standMat);
      base.position.y = wallHeight / 2;
      stand.add(base);

      const slope = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight * 1.5, d * 0.1), standMat);
      slope.position.set(0, wallHeight * 0.8, -d * 0.4);
      slope.rotation.x = -Math.PI / 5;
      stand.add(slope);

      for (let i = 0; i < 5; i += 1) {
        const row = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.55, d * 0.14), seatRowMat);
        row.position.set(0, 2 + i * 1.05, -d * 0.1 - i * 0.48);
        row.castShadow = true;
        stand.add(row);
      }

      const fascia = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.98, 0.5, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x29485f, roughness: 0.54, metalness: 0.12 })
      );
      fascia.position.set(0, wallHeight + 0.25, d * 0.18);
      fascia.castShadow = true;
      stand.add(fascia);

      stand.position.set(x, 0, z);
      stand.rotation.y = rotY;
      this.scene.add(stand);
    };

    createStand(0, 35, 100, 10);
    createStand(0, -35, 100, 10, Math.PI);
    createStand(55, 0, 70, 10, -Math.PI / 2);
    createStand(-55, 0, 70, 10, Math.PI / 2);

    const crowdBlocks = [
      { x: 0, z: 35.5, w: 96, h: 0.55, d: 1.2, c: 0xf2b705 },
      { x: 0, z: -35.5, w: 96, h: 0.55, d: 1.2, c: 0x2ea2ff },
      { x: 55.5, z: 0, w: 66, h: 0.55, d: 1.2, c: 0xf2b705, ry: -Math.PI / 2 },
      { x: -55.5, z: 0, w: 66, h: 0.55, d: 1.2, c: 0x2ea2ff, ry: Math.PI / 2 },
    ];
    crowdBlocks.forEach((b) => {
      const crowdMat = new THREE.MeshStandardMaterial({
        color: b.c,
        roughness: 0.72,
        metalness: 0.02,
        emissive: 0x162430,
        emissiveIntensity: 0.025,
      });
      const block = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), crowdMat);
      block.position.set(b.x, 8.8, b.z);
      if (b.ry) block.rotation.y = b.ry;
      block.castShadow = true;
      this.crowdGlowMaterials.push(crowdMat);
      this.scene.add(block);
    });

    // Floodlights
    const createLight = (x, z) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 25, 14), standMat);
      pole.position.set(x, 12.5, z);
      pole.castShadow = true;
      this.scene.add(pole);

      const floodMat = new THREE.MeshStandardMaterial({
        color: 0xb3c9df,
        emissive: 0x7db9ef,
        emissiveIntensity: 0.1,
        roughness: 0.28,
        metalness: 0.16,
      });
      this.floodMaterials.push(floodMat);

      const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 3.1), floodMat);
      head.position.set(x, 25, z);
      head.castShadow = true;
      this.scene.add(head);
    };
    createLight(53, 33);
    createLight(-53, 33);
    createLight(53, -33);
    createLight(-53, -33);

    // Scoreboards
    const addScoreboard = (x, z, rotY) => {
      const screenTex = this.createScoreboardTexture();
      const screenMat = new THREE.MeshStandardMaterial({
        map: screenTex,
        emissiveMap: screenTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.12,
        roughness: 0.24,
        metalness: 0.12,
      });
      this.scoreboardMaterials.push(screenMat);

      const board = new THREE.Group();
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(7.8, 2.8, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x111d27, roughness: 0.55, metalness: 0.12 })
      );
      shell.castShadow = true;
      board.add(shell);

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.05, 2.2), screenMat);
      screen.position.z = 0.28;
      board.add(screen);

      const supportL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 7.2, 0.24), standMat);
      supportL.position.set(-3.2, -4.8, 0);
      const supportR = supportL.clone();
      supportR.position.x = 3.2;
      board.add(supportL, supportR);

      board.position.set(x, 15.2, z);
      board.rotation.y = rotY;
      this.scene.add(board);
    };
    addScoreboard(0, 41.5, Math.PI);
    addScoreboard(0, -41.5, 0);

    // Camera gantry / broadcaster bridge
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(28, 0.45, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x1c2a36, roughness: 0.52, metalness: 0.18 })
    );
    bridge.position.set(0, 16.2, -36.5);
    bridge.castShadow = true;
    this.scene.add(bridge);

    for (let i = staticStartIndex; i < this.scene.children.length; i += 1) {
      const child = this.scene.children[i];
      if (child === this.skyDome) continue;
      this.freezeObject(child);
    }
  }

  freezeObject(root) {
    root.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    });
    return root;
  }

  setPerformanceProfile(profile = "high") {
    this.performanceProfile = ["ultra", "high", "medium"].includes(profile) ? profile : "high";
  }

  createSkyTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#0f2537");
    grad.addColorStop(0.35, "#3f88b8");
    grad.addColorStop(0.72, "#9bc7e6");
    grad.addColorStop(1, "#dceeff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 14; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.7;
      const r = 90 + Math.random() * 180;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, "rgba(255,255,255,0.16)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  createBannerTexture(label, baseColor = "#0d2740") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(0.5, "#112b3b");
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 10; i += 1) {
      ctx.fillRect(i * 120, 0, 54, canvas.height);
    }

    ctx.strokeStyle = "rgba(188,240,255,0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(canvas.width, 14);
    ctx.moveTo(0, canvas.height - 14);
    ctx.lineTo(canvas.width, canvas.height - 14);
    ctx.stroke();

    ctx.fillStyle = "#e8fbff";
    ctx.font = "800 48px Sora, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillText(label, 160 + i * 240, canvas.height / 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  createScoreboardTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#08111a");
    grad.addColorStop(1, "#123348");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(28, 28, canvas.width - 56, canvas.height - 56);

    ctx.fillStyle = "#7be0ff";
    ctx.font = "800 44px Sora, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("3D FUTBOL", canvas.width / 2, 96);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 76px Sora, Arial, sans-serif";
    ctx.fillText("00 : 00", canvas.width / 2, 175);

    ctx.font = "600 28px Manrope, Arial, sans-serif";
    ctx.fillStyle = "#c7e8ff";
    ctx.fillText("MATCHDAY | BAKU", canvas.width / 2, 222);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  updateVisuals(dt, elapsed) {
    this.visualTick += 1;
    const materialStep = this.performanceProfile === "ultra" ? 1 : this.performanceProfile === "high" ? 2 : 3;
    const flagStep = this.performanceProfile === "ultra" ? 1 : this.performanceProfile === "high" ? 2 : 4;

    if (this.skyDome) this.skyDome.rotation.y += dt * 0.01;

    if (this.visualTick % flagStep === 0) {
      this.flagCloths.forEach((flag, index) => {
        const pos = flag.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += 1) {
          const baseX = flag.base[i * 3];
          const baseY = flag.base[i * 3 + 1];
          const influence = (baseX + 0.275) / 0.55;
          pos.array[i * 3] = baseX;
          pos.array[i * 3 + 1] = baseY + Math.sin(elapsed * 4.4 + baseY * 5 + flag.phase) * 0.01 * influence;
          pos.array[i * 3 + 2] = Math.sin(elapsed * 5.6 + baseX * 8 + flag.phase + index) * 0.06 * influence;
        }
        pos.needsUpdate = true;
      });
    }

    if (this.visualTick % materialStep !== 0) return;

    this.crowdGlowMaterials.forEach((mat, index) => {
      mat.emissiveIntensity = 0.015 + (Math.sin(elapsed * 2.4 + index * 0.7) * 0.5 + 0.5) * 0.025;
    });

    this.adBoardTextures.forEach((tex, index) => {
      tex.offset.x = (elapsed * 0.06 + index * 0.03) % 1;
    });

    this.scoreboardMaterials.forEach((mat, index) => {
      mat.emissiveIntensity = 0.1 + (Math.sin(elapsed * 1.7 + index) * 0.5 + 0.5) * 0.05;
    });

    this.floodMaterials.forEach((mat, index) => {
      mat.emissiveIntensity = 0.08 + (Math.sin(elapsed * 1.3 + index * 0.9) * 0.5 + 0.5) * 0.04;
    });
  }

  createBall() {
    const radius = 0.23;
    const group = new THREE.Group();
    const ballTex = this.createBallTexture();

    // Match ball (high detail)
    const ballGeo = new THREE.SphereGeometry(radius, 28, 24);
    const ballMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.0,
      envMapIntensity: 1.3,
      clearcoat: 0.36,
      clearcoatRoughness: 0.22,
      map: ballTex,
      bumpMap: ballTex,
      bumpScale: 0.012,
    });
    const mainMesh = new THREE.Mesh(ballGeo, ballMat);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // Valve detail
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.004, 10),
      new THREE.MeshStandardMaterial({ color: 0x2e2e2e, roughness: 0.6 })
    );
    valve.position.set(0.08, 0.2, 0.08);
    valve.lookAt(0, 0, 0);
    group.add(valve);

    // Subtle seams ring accents
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x222831,
      roughness: 0.55,
      metalness: 0.0,
      transparent: true,
      opacity: 0.35,
    });
    for (let i = 0; i < 3; i += 1) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, 0.004, 8, 48), seamMat);
      seam.rotation.set(i * 0.8, i * 1.2, i * 0.35);
      group.add(seam);
    }

    this.scene.add(group);

    const body = new CANNON.Body({
      mass: 0.45,
      shape: new CANNON.Sphere(radius),
      material: this.ballMaterial,
      linearDamping: 0.15,
      angularDamping: 0.1,
    });
    body.position.set(0, 0.5, 0); // Spawn slightly higher
    this.world.addBody(body);
    this.dynamicBodies.push({ mesh: group, body });
    this.ballBody = body;

    return { mesh: group, body, radius };
  }

  createGrassTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#2e8e3d");
    gradient.addColorStop(1, "#1e6d2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Mowing bands
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)";
      ctx.fillRect((canvas.width / 18) * i, 0, canvas.width / 18, canvas.height);
    }

    // Fine grain/noise
    for (let i = 0; i < 24000; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const alpha = Math.random() * 0.08;
      ctx.fillStyle = `rgba(12,36,12,${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Blade-like streaks for richer turf detail
    for (let i = 0; i < 18000; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const len = 2 + Math.random() * 5;
      const shade = 18 + Math.floor(Math.random() * 24);
      const alpha = 0.035 + Math.random() * 0.06;
      ctx.strokeStyle = `rgba(${shade},${70 + shade},${24 + Math.floor(shade * 0.25)},${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 2 - 1, y + len);
      ctx.stroke();
    }

    // Soft radial color variance so field does not look flat
    for (let i = 0; i < 14; i += 1) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      const rr = 80 + Math.random() * 170;
      const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      rg.addColorStop(0, "rgba(155,210,130,0.06)");
      rg.addColorStop(1, "rgba(30,70,30,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.4, 1.6);
    tex.anisotropy = 8;
    return tex;
  }

  createGrassBumpTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 22000; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const v = 110 + Math.floor(Math.random() * 60);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    for (let i = 0; i < 12000; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const len = 3 + Math.random() * 7;
      const v = 120 + Math.floor(Math.random() * 40);
      ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 2 - 1, y + len);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4);
    tex.anisotropy = 8;
    return tex;
  }

  createBallTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const baseGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    baseGrad.addColorStop(0, "#fefefe");
    baseGrad.addColorStop(1, "#dbe8ff");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Base panel guides
    const panelCols = 12;
    const panelRows = 6;
    const panelW = canvas.width / panelCols;
    const panelH = canvas.height / panelRows;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(20,20,20,0.55)";
    for (let r = 0; r < panelRows; r += 1) {
      for (let c = 0; c < panelCols; c += 1) {
        const cx = c * panelW + panelW / 2 + (r % 2 ? panelW * 0.5 : 0);
        const cy = r * panelH + panelH / 2;
        const radius = Math.min(panelW, panelH) * 0.26;

        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = cx + Math.cos(a) * radius;
          const py = cy + Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        if ((r + c) % 3 === 0) {
          ctx.fillStyle = "#0f1720";
          ctx.fill();
        } else if ((r + c) % 3 === 1) {
          ctx.fillStyle = "#f6f7fb";
          ctx.fill();
        } else {
          ctx.fillStyle = "#41a0ff";
          ctx.fill();
        }
        ctx.stroke();
      }
    }

    // Subtle wear
    for (let i = 0; i < 8000; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const alpha = Math.random() * 0.06;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  createGoal(x) {
    const group = new THREE.Group();
    const goalWidth = 8.1;
    const goalHeight = 3.0;
    const goalDepth = 2.9;
    const halfWidth = goalWidth / 2;
    const halfDepth = goalDepth / 2;
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xf7f7f7,
      roughness: 0.3,
      metalness: 0.32,
      envMapIntensity: 1.2,
    });

    const post = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), postMat);
    const left = post(0.14, goalHeight, 0.14);
    const right = post(0.14, goalHeight, 0.14);
    const top = post(goalWidth, 0.14, 0.14);

    left.position.set(0, goalHeight / 2, -halfWidth);
    right.position.set(0, goalHeight / 2, halfWidth);
    top.position.set(0, goalHeight, 0);

    const addNet = () => {
      const netMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
      });

      const back = new THREE.Mesh(new THREE.PlaneGeometry(goalWidth, goalHeight), netMat);
      back.position.set(goalDepth * Math.sign(x), goalHeight / 2, 0);
      back.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;

      const sideL = new THREE.Mesh(new THREE.PlaneGeometry(goalDepth, goalHeight), netMat);
      sideL.position.set(halfDepth * Math.sign(x), goalHeight / 2, -halfWidth);
      sideL.rotation.y = x > 0 ? Math.PI : 0;

      const sideR = new THREE.Mesh(new THREE.PlaneGeometry(goalDepth, goalHeight), netMat);
      sideR.position.set(halfDepth * Math.sign(x), goalHeight / 2, halfWidth);
      sideR.rotation.y = x > 0 ? Math.PI : 0;

      const roof = new THREE.Mesh(new THREE.PlaneGeometry(goalWidth, goalDepth), netMat);
      roof.position.set(halfDepth * Math.sign(x), goalHeight, 0);
      roof.rotation.x = Math.PI / 2;

      group.add(back, sideL, sideR, roof);
    };

    group.add(left, right, top);
    addNet();
    group.position.set(x, 0, 0);
    this.scene.add(group);
    this.freezeObject(group);

    return group;
  }

  createPlayerBody() {
    const shape = new CANNON.Box(new CANNON.Vec3(0.45, 1.0, 0.45));
    const body = new CANNON.Body({
      mass: 5, // Small mass to avoid pushing it too hard but still collide
      material: this.playerMaterial,
      shape: shape,
      type: CANNON.Body.KINEMATIC
    });
    this.world.addBody(body);
    return body;
  }

  step(dt) {
    this.world.step(1 / 60, dt, 4);
    this.stabilizeBall(dt);
    for (const obj of this.dynamicBodies) {
      obj.mesh.position.copy(obj.body.position);
      obj.mesh.quaternion.copy(obj.body.quaternion);
      if (obj.isModel) {
        // Adjust for model offset if needed
        if (obj.offset) obj.mesh.position.add(obj.offset);
      }
    }
  }

  stabilizeBall(dt) {
    if (!this.ballBody) return;

    const body = this.ballBody;
    const nearGround = body.position.y <= this.ballGroundY + 0.04;
    const planarSpeedSq = body.velocity.x * body.velocity.x + body.velocity.z * body.velocity.z;

    if (nearGround) {
      const groundDrag = Math.exp(-dt * 0.9);
      body.velocity.x *= groundDrag;
      body.velocity.z *= groundDrag;
      body.angularVelocity.x *= Math.exp(-dt * 0.55);
      body.angularVelocity.y *= Math.exp(-dt * 0.7);
      body.angularVelocity.z *= Math.exp(-dt * 0.55);

      if (planarSpeedSq < 0.012 && Math.abs(body.velocity.y) < 0.09) {
        body.velocity.x = 0;
        body.velocity.z = 0;
        if (body.position.y < this.ballGroundY + 0.004) body.position.y = this.ballGroundY;
        if (Math.abs(body.velocity.y) < 0.03) body.velocity.y = 0;
      }
    }

    const speedSq = body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y + body.velocity.z * body.velocity.z;
    const maxSpeed = 36;
    if (speedSq > maxSpeed * maxSpeed) {
      const scale = maxSpeed / Math.sqrt(speedSq);
      body.velocity.scale(scale, body.velocity);
    }

    // Strict Pitch Boundaries Clamping (90x60 -> ±45, ±30)
    // We allow more space on X (47.5) so the ball can go into the net depth
    const limitX = 47.5;
    const limitZ = 30.5;

    if (Math.abs(body.position.x) > limitX) {
      body.position.x = Math.sign(body.position.x) * limitX;
      body.velocity.x *= -0.5; // Bounce back
    }
    if (Math.abs(body.position.z) > limitZ) {
      body.position.z = Math.sign(body.position.z) * limitZ;
      body.velocity.z *= -0.5; // Bounce back
    }
  }
}
