import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

export class Physics {
  constructor(scene) {
    this.scene = scene;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.dynamicBodies = [];
  }

  setupField() {
    const groundMat = new CANNON.Material("ground");
    const ballMat = new CANNON.Material("ball");
    const playerMat = new CANNON.Material("player");

    const contact = new CANNON.ContactMaterial(groundMat, ballMat, {
      friction: 0.35,
      restitution: 0.45,
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

    // Invisible Walls for Ball
    const wallMat = new CANNON.Material("wall");
    const createWall = (x, z, w, h, d, visible = false) => {
      const body = new CANNON.Body({ mass: 0, material: wallMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w, h, d)));
      body.position.set(x, h, z);
      this.world.addBody(body);
      if (visible) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * 2, h * 2, d * 2), new THREE.MeshStandardMaterial({ color: 0x112233 }));
        mesh.position.set(x, h, z);
        this.scene.add(mesh);
      }
    };
    createWall(46, 0, 1, 10, 31);   // Right
    createWall(-46, 0, 1, 10, 31);  // Left
    createWall(0, 31, 46, 10, 1);   // Back
    createWall(0, -31, 46, 10, 1);  // Front

    this.buildVisualStadium();

    this.groundMaterial = groundMat;
    this.ballMaterial = ballMat;
  }

  buildVisualStadium() {
    const fieldWidth = 90;
    const fieldHeight = 60;

    // Grass
    const grassGeo = new THREE.PlaneGeometry(fieldWidth + 10, fieldHeight + 10);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1a4d1a,
      roughness: 0.8,
      metalness: 0.1
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // Lines
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222 });

    // Outer Border
    const border = new THREE.Mesh(new THREE.PlaneGeometry(fieldWidth, fieldHeight), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.01;
    // We use a LineSegments approach for better precision or just slightly larger plane
    const outerLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(fieldWidth, fieldHeight)),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    outerLines.rotation.x = -Math.PI / 2;
    outerLines.position.y = 0.02;
    this.scene.add(outerLines);

    // Halfway line
    const halfLine = new THREE.Mesh(new THREE.PlaneGeometry(0.2, fieldHeight), lineMat);
    halfLine.rotation.x = -Math.PI / 2;
    halfLine.position.y = 0.02;
    this.scene.add(halfLine);

    // Center Circle
    const circleGeo = new THREE.RingGeometry(9.15, 9.35, 64);
    const circle = new THREE.Mesh(circleGeo, lineMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.02;
    this.scene.add(circle);

    // Penalty Areas (Simplified Boxes)
    const createArea = (xOffset) => {
      const area = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(16.5, 40.3)),
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );
      area.rotation.x = -Math.PI / 2;
      area.position.set(xOffset, 0.02, 0);
      this.scene.add(area);
    };
    createArea(45 - 8.25);
    createArea(-45 + 8.25);

    // Arena Walls / Stands (REMATCH style)
    const wallHeight = 8;
    const wallThickness = 2;
    const standMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.5 });

    const createStand = (x, z, w, d, rotY = 0) => {
      const stand = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), standMat);
      base.position.y = wallHeight / 2;
      stand.add(base);

      // Add a sloping part for seats
      const slope = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight * 1.5, d * 0.1), standMat);
      slope.position.set(0, wallHeight * 0.8, -d * 0.4);
      slope.rotation.x = -Math.PI / 5;
      stand.add(slope);

      stand.position.set(x, 0, z);
      stand.rotation.y = rotY;
      this.scene.add(stand);
    };

    createStand(0, 35, 100, 10);  // Back
    createStand(0, -35, 100, 10, Math.PI); // Front
    createStand(50, 0, 70, 10, -Math.PI / 2); // Right
    createStand(-50, 0, 70, 10, Math.PI / 2); // Left

    // Floodlights
    const createLight = (x, z) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 25), standMat);
      pole.position.set(x, 12.5, z);
      this.scene.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff }));
      head.position.set(x, 25, z);
      this.scene.add(head);
    };
    createLight(48, 33);
    createLight(-48, 33);
    createLight(48, -33);
    createLight(-48, -33);
  }

  createBall() {
    const radius = 0.23;
    const group = new THREE.Group();

    // Base Sphere
    const ballGeo = new THREE.SphereGeometry(radius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1
    });
    const mainMesh = new THREE.Mesh(ballGeo, ballMat);
    mainMesh.castShadow = true;
    group.add(mainMesh);

    // Decorative "panels" for better rolling visibility (REMATCH style)
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.28), panelMat);
      const pivot = new THREE.Object3D();
      pivot.add(panel);
      panel.position.y = radius;
      pivot.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(pivot);
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

    return { mesh: group, body, radius };
  }

  createGoal(x) {
    const group = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7 });

    const post = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), postMat);
    const left = post(0.12, 2.2, 0.12);
    const right = post(0.12, 2.2, 0.12);
    const top = post(3.2, 0.12, 0.12);

    left.position.set(0, 1.1, -1.6);
    right.position.set(0, 1.1, 1.6);
    top.position.set(0, 2.2, 0);

    group.add(left, right, top);
    group.position.set(x, 0, 0);
    this.scene.add(group);

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
    this.world.step(1 / 60, dt, 3);
    for (const obj of this.dynamicBodies) {
      obj.mesh.position.copy(obj.body.position);
      obj.mesh.quaternion.copy(obj.body.quaternion);
      if (obj.isModel) {
        // Adjust for model offset if needed
        if (obj.offset) obj.mesh.position.add(obj.offset);
      }
    }
  }
}
