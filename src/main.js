import * as THREE from 'https://unpkg.com/three@0.164.0/build/three.module.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

autoResize();
window.addEventListener('resize', autoResize);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d0f);
scene.fog = new THREE.FogExp2(0x0d0d0f, 0.04);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 8);

const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(5, 9, 3);
dirLight.castShadow = true;
scene.add(dirLight);

const floorGeo = new THREE.PlaneGeometry(40, 40);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1f1f29, roughness: 0.8, metalness: 0.1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
grid.position.y = 0.01;
scene.add(grid);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x3f2d2f, roughness: 0.6 });
const wallSegments = createDungeonWalls();
wallSegments.forEach((wall) => {
  wall.material = wallMaterial;
  wall.castShadow = true;
  wall.receiveShadow = true;
  wall.userData.bounds = new THREE.Box3().setFromObject(wall);
  wall.userData.boundsExpanded = wall.userData.bounds.clone().expandByScalar(0.45);
  scene.add(wall);
});

const dungeonProps = createDungeonProps();
dungeonProps.forEach((p) => scene.add(p));

const player = createPlayer();
scene.add(player.mesh);
player.mesh.userData.radius = 0.45;
yaw = player.mesh.rotation.y;

const enemies = createEnemies();
enemies.forEach((e) => scene.add(e.mesh));

const torches = createTorches();
torches.forEach((t) => scene.add(t.light));

const loot = createLoot();
scene.add(loot.mesh);

const manaCrystal = createManaCrystal();
scene.add(manaCrystal.mesh);

const runeSet = createRunes();
runeSet.runes.forEach((r) => scene.add(r.mesh));
scene.add(runeSet.pedestal);
scene.add(runeSet.portal);

const spellbook = createSpellbook();
scene.add(spellbook.mesh);

const goal = createGoal();
scene.add(goal.door);
scene.add(goal.key);
scene.add(goal.chest);

const traps = createTraps();
traps.forEach((t) => scene.add(t.mesh));

const specters = createSpecters();
specters.forEach((s) => scene.add(s.mesh));

const turrets = createTurrets();
turrets.forEach((t) => scene.add(t.mesh));
const projectiles = [];
const arcaneBolts = [];

const golem = createGolem();
scene.add(golem.mesh);

const campfire = createCampfire();
scene.add(campfire.mesh);

const clock = new THREE.Clock();
const keys = createKeyMap();
let velocityY = 0;
const gravity = -20;
const speed = 5;
const sprintMultiplier = 1.6;
const jumpForce = 8;
let gameOver = false;
let score = 0;
const healthDisplay = document.getElementById('health');
const tip = document.getElementById('tip');
const objectiveDisplay = document.getElementById('objective');
const scoreDisplay = document.getElementById('score');
const staminaFill = document.getElementById('staminaFill');
const runeProgress = document.getElementById('runeProgress');
const portalStatus = document.getElementById('portalStatus');
const crosshair = document.getElementById('crosshair');
const spellStatus = document.getElementById('spellStatus');

const staminaMax = 100;
let stamina = staminaMax;
let exhausted = false;
let exhaustionNoticeCooldown = 0;
let runesLinked = 0;
let cameraMode = 'third';
let yaw = 0;
let pitch = 0;
let pointerLocked = false;
let hasSpellbook = false;
let boltCooldown = 0;

updateHealthDisplay();
updateObjective('Trouve la clé et cherche le grimoire pour percer la défense du gardien.');
updateScore(0);
updateRuneUI();
updateCrosshair();
updateSpellStatus();

canvas.addEventListener('click', () => {
  if (cameraMode === 'fps' && !pointerLocked) {
    canvas.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  updateCrosshair();
});

document.addEventListener('mousemove', (event) => {
  if (cameraMode === 'fps' && pointerLocked) {
    yaw -= event.movementX * 0.0023;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.002, -1.05, 1.05);
  }
});

window.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    fireArcaneBolt();
  }
});

function animate() {
  const delta = clock.getDelta();
  exhaustionNoticeCooldown = Math.max(0, exhaustionNoticeCooldown - delta);
  boltCooldown = Math.max(0, boltCooldown - delta);
  handleInput(delta);
  updateEnemies(delta);
  updateLoot(delta);
  updateManaCrystal(delta);
  updateSpellbook(delta);
  updateRunes(delta);
  updatePortal(delta);
  updateKey(delta);
  updateDoor(delta);
  updateChest(delta);
  updateTraps(delta);
  updateSpecters(delta);
  updateTurrets(delta);
  updateProjectiles(delta);
  updateArcaneBolts(delta);
  updateGolem(delta);
  updateCampfire(delta);
  updateShieldEffect(delta);
  updateStaminaBar();
  updateSpellStatus();
  flickerTorches();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

function autoResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function createDungeonWalls() {
  const walls = [];
  const wallGeo = new THREE.BoxGeometry(1, 2.5, 8);
  const longWallGeo = new THREE.BoxGeometry(20, 2.5, 1);

  // Périmètre
  walls.push(new THREE.Mesh(longWallGeo.clone(), wallMaterial));
  walls[walls.length - 1].position.set(0, 1.25, -10);
  walls.push(new THREE.Mesh(longWallGeo.clone(), wallMaterial));
  walls[walls.length - 1].position.set(0, 1.25, 10);
  walls.push(new THREE.Mesh(wallGeo.clone(), wallMaterial));
  walls[walls.length - 1].scale.z = 3;
  walls[walls.length - 1].position.set(-10, 1.25, 0);
  walls.push(new THREE.Mesh(wallGeo.clone(), wallMaterial));
  walls[walls.length - 1].scale.z = 3;
  walls[walls.length - 1].position.set(10, 1.25, 0);

  // Couloirs internes
  const corridor = new THREE.Mesh(wallGeo.clone(), wallMaterial);
  corridor.position.set(0, 1.25, -2);
  walls.push(corridor);

  const innerWall = new THREE.Mesh(longWallGeo.clone(), wallMaterial);
  innerWall.scale.x = 0.7;
  innerWall.position.set(-2, 1.25, 4);
  walls.push(innerWall);

  const alcove = new THREE.Mesh(wallGeo.clone(), wallMaterial);
  alcove.scale.z = 1.2;
  alcove.position.set(5, 1.25, 3);
  walls.push(alcove);

  return walls;
}

function createDungeonProps() {
  const props = [];
  const pillarGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.6, 10);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x72615c, roughness: 0.65, metalness: 0.2 });
  const pillars = [
    [-3, -4],
    [3, -4],
    [-6.5, 2.5],
    [6.5, 2.5],
  ];
  pillars.forEach(([x, z]) => {
    const mesh = new THREE.Mesh(pillarGeo.clone(), pillarMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, 1.3, z);
    props.push(mesh);
  });

  const bannerGeo = new THREE.PlaneGeometry(1.2, 2.4);
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0x8b1c2c,
    roughness: 0.4,
    side: THREE.DoubleSide,
    emissive: 0x1a0206,
    emissiveIntensity: 0.3,
  });
  const bannerPositions = [
    [0, -1.9, -9.8, 0],
    [-4, 1.8, 9.8, Math.PI],
    [4, 1.8, 9.8, Math.PI],
  ];
  bannerPositions.forEach(([x, y, z, rot]) => {
    const banner = new THREE.Mesh(bannerGeo.clone(), bannerMat);
    banner.position.set(x, y, z);
    banner.rotation.y = rot;
    banner.castShadow = true;
    props.push(banner);
  });

  return props;
}

function createPlayer() {
  const mesh = new THREE.Group();
  mesh.position.set(0, 0, 6);

  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5fb0e5, roughness: 0.4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.position.y = 0.7;

  const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe5d29f, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.5;
  head.castShadow = true;
  body.add(head);

  const directionGeo = new THREE.ConeGeometry(0.3, 0.6, 8);
  const directionMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
  const arrow = new THREE.Mesh(directionGeo, directionMat);
  arrow.position.set(0, 0.3, 0.55);
  arrow.rotation.x = Math.PI;
  body.add(arrow);

  mesh.add(body);

  const auraGeo = new THREE.TorusGeometry(0.7, 0.05, 12, 32);
  const auraMat = new THREE.MeshBasicMaterial({ color: 0x7ecbff, transparent: true, opacity: 0.6 });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.rotation.x = Math.PI / 2;
  aura.visible = false;
  mesh.add(aura);

  return { mesh, health: 3, invulnerable: 0, maxHealth: 3, shield: 0, aura };
}

function createEnemies() {
  const foes = [];
  const geo = new THREE.SphereGeometry(0.6, 16, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9d2d2f });

  const orbs = [
    { base: new THREE.Vector3(-4, 0.6, -5), amplitude: 2, speed: 1.4 },
    { base: new THREE.Vector3(6, 0.6, 1), amplitude: 1.5, speed: 1.1 },
  ];

  orbs.forEach((o) => {
    const mesh = new THREE.Mesh(geo.clone(), mat);
    mesh.castShadow = true;
    mesh.position.copy(o.base);
    foes.push({ mesh, ...o, health: 1 });
  });
  return foes;
}

function createTorches() {
  const points = [
    new THREE.Vector3(-7, 2.2, -7),
    new THREE.Vector3(7, 2.2, -3),
    new THREE.Vector3(-3, 2.2, 6),
  ];

  return points.map((p) => {
    const light = new THREE.PointLight(0xffa95a, 1.3, 9);
    light.castShadow = true;
    light.position.copy(p);
    light.userData.baseIntensity = light.intensity;
    return { light };
  });
}

function createLoot() {
  const bottleGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.8, 10);
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x3da35d, emissive: 0x1e7c3a, roughness: 0.2 });
  const bottle = new THREE.Mesh(bottleGeo, bottleMat);
  bottle.castShadow = true;
  bottle.position.set(4, 0.4, -4);

  const stopperGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
  const stopperMat = new THREE.MeshStandardMaterial({ color: 0x8c6239, roughness: 0.5 });
  const stopper = new THREE.Mesh(stopperGeo, stopperMat);
  stopper.position.y = 0.46;
  bottle.add(stopper);

  return { mesh: bottle, active: true };
}

function createManaCrystal() {
  const geo = new THREE.DodecahedronGeometry(0.35);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7f4dff, emissive: 0x2e1463, roughness: 0.25, metalness: 0.4 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-6, 0.45, -1);
  mesh.castShadow = true;

  return { mesh, active: true };
}

function createSpellbook() {
  const book = new THREE.Group();
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.12, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x3d2e6b, metalness: 0.2, roughness: 0.5 })
  );
  cover.castShadow = true;
  book.add(cover);

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshStandardMaterial({ color: 0x9ff1ff, emissive: 0x53b1d9, metalness: 0.4 })
  );
  gem.position.set(0, 0.2, 0);
  cover.add(gem);

  book.position.set(-2, 0.2, -8);
  return { mesh: book, active: true };
}

function createRunes() {
  const positions = [new THREE.Vector3(-5, 0.4, 4), new THREE.Vector3(5, 0.4, -2), new THREE.Vector3(1, 0.4, 0)];
  const runes = positions.map((pos, idx) => {
    const geo = new THREE.IcosahedronGeometry(0.32, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6c9cff,
      emissive: 0x234d8f,
      roughness: 0.35,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    return { mesh, collected: false, pulseOffset: idx * 0.8 };
  });

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.9, 0.3, 14),
    new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.8 })
  );
  pedestal.position.set(1, 0.15, 0);
  pedestal.receiveShadow = true;

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.12, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0x9ff1ff, emissive: 0x3b7d8f, transparent: true, opacity: 0.85 })
  );
  portal.rotation.x = Math.PI / 2;
  portal.position.set(1, 1, 0);
  portal.visible = false;
  portal.userData.active = false;
  portal.userData.used = false;

  return { runes, pedestal, portal };
}

function createGoal() {
  const doorGeo = new THREE.BoxGeometry(2.4, 2.4, 0.3);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5b4b2d, roughness: 0.7, metalness: 0.15 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.castShadow = true;
  door.position.set(0, 1.2, -6);
  door.userData.bounds = new THREE.Box3().setFromObject(door).expandByScalar(0.2);
  door.userData.locked = true;

  const keyGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 24, Math.PI * 1.3);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xf5d142, emissive: 0x8a6c1a });
  const key = new THREE.Mesh(keyGeo, keyMat);
  key.castShadow = true;
  key.position.set(7, 0.5, 2);
  key.rotation.x = Math.PI / 2;

  const chest = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.8, 1),
    new THREE.MeshStandardMaterial({ color: 0x744c24, roughness: 0.5, metalness: 0.1 })
  );
  base.position.y = 0.4;
  base.castShadow = true;
  chest.add(base);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.25, 1.02),
    new THREE.MeshStandardMaterial({ color: 0x8b6133, roughness: 0.45, metalness: 0.15 })
  );
  lid.position.set(0, 0.9, 0);
  lid.castShadow = true;
  lid.userData.baseRotation = lid.rotation.x;
  chest.add(lid);

  const latch = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.3, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xd8c27a, metalness: 0.7, roughness: 0.3 })
  );
  latch.position.set(0, 0.7, 0.55);
  chest.add(latch);

  chest.position.set(0, 0, -8.2);

  return { door, key, chest, hasKey: false, opened: false, scored: false, lid };
}

function createTraps() {
  const points = [
    new THREE.Vector3(-2, 0, -3),
    new THREE.Vector3(3, 0, -5),
    new THREE.Vector3(1.5, 0, 1.5),
  ];

  return points.map((p, idx) => {
    const cone = new THREE.ConeGeometry(0.35, 0.6, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9c1c2d, emissive: 0x4a0f1a });
    const mesh = new THREE.Mesh(cone, mat);
    mesh.castShadow = true;
    mesh.position.copy(p);
    mesh.position.y = 0.3;
    const bounds = new THREE.Sphere(p.clone(), 0.75);
    return { mesh, bounds, cooldown: 0, wiggleOffset: idx * 0.4 };
  });
}

function createTurrets() {
  const points = [new THREE.Vector3(-7, 0, -1), new THREE.Vector3(6, 0, 4)];
  return points.map((p) => {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.55, 0.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x3b3b42, roughness: 0.6 })
    );
    base.position.copy(p);
    base.position.y = 0.4;
    base.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.3, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x7dd7ff, emissive: 0x2d6c8f, metalness: 0.3 })
    );
    head.position.y = 0.6;
    head.castShadow = true;
    base.add(head);
    base.userData.head = head;
    base.userData.cooldown = 2 + Math.random();
    return { mesh: base, health: 2 };
  });
}

function createGolem() {
  const golem = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x5b4a3b, roughness: 0.8 })
  );
  base.castShadow = true;
  base.receiveShadow = true;
  golem.add(base);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x8a7b65, roughness: 0.6 })
  );
  torso.position.y = 0.9;
  torso.castShadow = true;
  golem.add(torso);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0xff8c42 })
  );
  eye.position.set(0, 1.4, 0.36);
  torso.add(eye);

  golem.position.set(2, 0, -5.5);

  return { mesh: golem, health: 5, alive: true, cooldown: 0, awake: false };
}

function createCampfire() {
  const camp = new THREE.Group();
  const stones = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 0.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x4c4c4c, roughness: 0.9 })
  );
  stones.receiveShadow = true;
  camp.add(stones);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.7, 10),
    new THREE.MeshStandardMaterial({ color: 0xffc45f, emissive: 0xb36b1b, transparent: true, opacity: 0.9 })
  );
  flame.position.y = 0.5;
  flame.castShadow = true;
  camp.add(flame);
  camp.userData.flame = flame;
  camp.userData.cooldown = 0;
  camp.position.set(-1, 0, 7);

  const light = new THREE.PointLight(0xffaa66, 1.4, 6);
  light.position.set(0, 1.4, 0);
  camp.add(light);

  return { mesh: camp };
}

function createKeyMap() {
  const map = new Map();
  window.addEventListener('keydown', (e) => {
    map.set(e.code, true);
    if (e.code === 'KeyF' && !e.repeat) {
      toggleCameraMode();
    }
  });
  window.addEventListener('keyup', (e) => map.set(e.code, false));
  return map;
}

function toggleCameraMode() {
  cameraMode = cameraMode === 'third' ? 'fps' : 'third';
  if (cameraMode === 'fps') {
    yaw = player.mesh.rotation.y;
    pitch = 0;
    tip.textContent = 'Vue FPS active : souris pour viser, F pour revenir en troisième personne.';
    updateCrosshair();
  } else {
    tip.textContent = 'Vue héro réactivée : pivote avec Q/D ou reprends la souris en FPS.';
    document.exitPointerLock?.();
    updateCrosshair();
  }
}

function handleInput(delta) {
  let orientationY = cameraMode === 'fps' ? yaw : player.mesh.rotation.y;
  if (cameraMode === 'third') {
    if (keys.get('KeyQ')) orientationY += delta * 1.8;
    if (keys.get('KeyD')) orientationY -= delta * 1.8;
    player.mesh.rotation.y = orientationY;
    yaw = orientationY;
  } else {
    if (keys.get('KeyQ')) yaw += delta * 1.4;
    if (keys.get('KeyD')) yaw -= delta * 1.4;
    orientationY = yaw;
    player.mesh.rotation.y = yaw;
  }

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), orientationY);
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const move = new THREE.Vector3();
  if (keys.get('KeyZ') || keys.get('KeyW')) move.add(forward);
  if (keys.get('KeyS')) move.add(forward.clone().multiplyScalar(-1));
  if (keys.get('ArrowLeft')) move.add(right.clone().multiplyScalar(-1));
  if (keys.get('ArrowRight')) move.add(right);

  const wantsSprint = keys.get('ShiftLeft') || keys.get('ShiftRight');
  let sprint = 1;
  if (wantsSprint && stamina > 1 && !exhausted) {
    sprint = sprintMultiplier;
    stamina = Math.max(0, stamina - delta * 35);
    if (stamina === 0) {
      exhausted = true;
    }
  } else {
    stamina = Math.min(staminaMax, stamina + delta * 25);
    if (stamina > 35) exhausted = false;
  }

  if (exhausted && wantsSprint && exhaustionNoticeCooldown === 0) {
    exhaustionNoticeCooldown = 2.8;
    tip.textContent = 'Tu es à bout de souffle, reprends ton souffle !';
  }

  attemptMove(move, delta, sprint);

  // Jump logic
  if (keys.get('Space') && Math.abs(player.mesh.position.y - 0) < 0.05) {
    velocityY = jumpForce;
  }
  velocityY += gravity * delta;
  player.mesh.position.y += velocityY * delta;
  if (player.mesh.position.y < 0) {
    player.mesh.position.y = 0;
    velocityY = 0;
  }

  player.invulnerable = Math.max(0, player.invulnerable - delta);

  // Camera follow
  if (cameraMode === 'third') {
    const camOffset = new THREE.Vector3(0, 4.5, 7);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), orientationY);
    const camPos = player.mesh.position.clone().add(camOffset);
    camera.position.lerp(camPos, 0.08);
    const lookAt = player.mesh.position.clone();
    lookAt.y += 1.5;
    camera.lookAt(lookAt);
  } else {
    const headOffset = new THREE.Vector3(0, 1.6, 0);
    const camTarget = player.mesh.position.clone().add(headOffset);
    camera.position.lerp(camTarget, 0.18);
    const lookDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    camera.lookAt(camTarget.clone().add(lookDir));
  }
}

function attemptMove(move, delta, sprint) {
  if (move.lengthSq() === 0 || gameOver) return;

  const normalized = move.clone().normalize();
  const displacement = normalized.multiplyScalar(speed * sprint * delta);
  const target = player.mesh.position.clone().add(displacement);

  if (!collides(target)) {
    player.mesh.position.copy(target);
    return;
  }

  // Slide against walls when possible
  const testX = player.mesh.position.clone().add(new THREE.Vector3(displacement.x, 0, 0));
  if (!collides(testX)) {
    player.mesh.position.x = testX.x;
  }
  const testZ = player.mesh.position.clone().add(new THREE.Vector3(0, 0, displacement.z));
  if (!collides(testZ)) {
    player.mesh.position.z = testZ.z;
  }
}

function collides(position) {
  const wallHit = wallSegments.some((wall) => wall.userData.boundsExpanded.containsPoint(position));
  const doorHit = goal.door.userData.locked && goal.door.userData.bounds.containsPoint(position);
  return wallHit || doorHit;
}

function updateEnemies(delta) {
  enemies.forEach((enemy, idx) => {
    const direction = idx % 2 === 0 ? 1 : -1;
    const offset = Math.sin(clock.elapsedTime * enemy.speed * direction) * enemy.amplitude;
    enemy.mesh.position.x = enemy.base.x + offset;
    enemy.mesh.position.z = enemy.base.z + Math.cos(clock.elapsedTime * enemy.speed) * enemy.amplitude;

    const dist = enemy.mesh.position.distanceTo(player.mesh.position);
    if (dist < 1.2) {
      hitByEnemy();
    }
  });
}

let flashTimeout;
function flashHit() {
  if (flashTimeout) return;
  const original = scene.background.clone();
  scene.background = new THREE.Color(0x330000);
  flashTimeout = setTimeout(() => {
    scene.background = original;
    flashTimeout = null;
  }, 180);
}

function hitByEnemy() {
  if (player.invulnerable > 0 || gameOver) return;
  damagePlayer(1);
}

function damagePlayer(amount) {
  if (player.shield > 0) {
    player.shield = Math.max(0, player.shield - 0.8);
    tip.textContent = 'Le bouclier absorbe les dégâts !';
    return;
  }
  player.health = Math.max(0, player.health - amount);
  player.invulnerable = 1.2;
  flashHit();
  updateHealthDisplay();
  if (player.health === 0) {
    tip.textContent = 'K.O. ! Rafraîchis la page pour recommencer.';
    gameOver = true;
  }
}

function healPlayer(amount) {
  const prev = player.health;
  player.health = Math.min(player.maxHealth, player.health + amount);
  if (player.health > prev) {
    tip.textContent = 'Potion bue : +1 vie.';
    updateHealthDisplay();
  }
}

function updateLoot(delta) {
  if (!loot.active || gameOver) return;
  loot.mesh.rotation.y += delta * 1.2;
  loot.mesh.position.y = 0.4 + Math.sin(clock.elapsedTime * 2) * 0.1;

  const dist = loot.mesh.position.distanceTo(player.mesh.position);
  if (dist < 1) {
    healPlayer(1);
    loot.active = false;
    loot.mesh.visible = false;
  }
}

function updateManaCrystal(delta) {
  if (!manaCrystal.active || gameOver) return;
  manaCrystal.mesh.rotation.y += delta * 1.5;
  manaCrystal.mesh.position.y = 0.45 + Math.sin(clock.elapsedTime * 2.5) * 0.12;

  const dist = manaCrystal.mesh.position.distanceTo(player.mesh.position);
  if (dist < 1.1) {
    manaCrystal.active = false;
    manaCrystal.mesh.visible = false;
    player.shield = 8;
    tip.textContent = 'Cristal ramassé : bouclier magique !';
    updateScore(10);
  }
}

function updateSpellbook(delta) {
  if (!spellbook.active || gameOver) return;
  spellbook.mesh.rotation.y += delta * 1.1;
  spellbook.mesh.position.y = 0.2 + Math.sin(clock.elapsedTime * 3) * 0.06;

  const dist = spellbook.mesh.position.distanceTo(player.mesh.position);
  if (dist < 1) {
    spellbook.active = false;
    spellbook.mesh.visible = false;
    hasSpellbook = true;
    boltCooldown = 0;
    updateSpellStatus();
    updateObjective('Le grimoire est à toi : tente le tir arcanique pour affaiblir le gardien.');
    tip.textContent = 'Grimoire récupéré, clique pour lancer un trait arcanique !';
    updateScore(5);
  }
}

function updateRunes(delta) {
  runeSet.runes.forEach((rune) => {
    if (rune.collected) return;
    rune.mesh.rotation.y += delta * 1.6;
    rune.mesh.position.y = 0.4 + Math.sin(clock.elapsedTime * 2.4 + rune.pulseOffset) * 0.08;

    const dist = rune.mesh.position.distanceTo(player.mesh.position);
    if (dist < 1) {
      rune.collected = true;
      rune.mesh.visible = false;
      runesLinked += 1;
      tip.textContent = 'Rune liée ! Trouve les autres.';
      updateRuneUI();

      if (runesLinked === runeSet.runes.length) {
        runeSet.portal.visible = true;
        runeSet.portal.userData.active = true;
        tip.textContent = 'Toutes les runes vibrent : le portail répond !';
        if (portalStatus) {
          portalStatus.textContent = 'Portail bonus invoqué : traverse-le pour gagner du butin.';
        }
      }
    }
  });
}

function updatePortal(delta) {
  if (!runeSet.portal.visible) return;
  runeSet.portal.rotation.z += delta * 1.2;
  const pulse = 0.18 * Math.sin(clock.elapsedTime * 4) + 1;
  runeSet.portal.scale.setScalar(pulse);

  if (runeSet.portal.userData.active && !runeSet.portal.userData.used) {
    const dist = runeSet.portal.position.distanceTo(player.mesh.position);
    if (dist < 1.1) {
      runeSet.portal.userData.used = true;
      tip.textContent = 'Portail atteint : +30 de butin !';
      updateScore(30);
      updateObjective('La porte reste ouverte, explore encore.');
      if (portalStatus) {
        portalStatus.textContent = 'Portail traversé. Merci des runes !';
      }
    }
  }
}

function updateKey(delta) {
  if (goal.hasKey || gameOver) return;
  goal.key.rotation.y += delta * 2.5;
  goal.key.position.y = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.1;

  const dist = goal.key.position.distanceTo(player.mesh.position);
  if (dist < 1) {
    goal.hasKey = true;
    goal.key.visible = false;
    updateObjective('Rends-toi à la porte : elle va s\'ouvrir.');
    tip.textContent = 'Clé obtenue !';
  }
}

function updateDoor(delta) {
  if (gameOver) return;
  if (goal.hasKey && goal.door.userData.locked) {
    goal.door.userData.locked = false;
    tip.textContent = 'La porte se soulève !';
  }

  if (!goal.door.userData.locked) {
    goal.door.position.y = THREE.MathUtils.lerp(goal.door.position.y, 4, 0.04);
    if (!goal.opened && goal.door.position.y > 3.8) {
      goal.opened = true;
      updateObjective('Passe la porte et ouvre le coffre.');
    }
  }
}

function updateChest(delta) {
  goal.lid.rotation.x = goal.lid.userData.baseRotation + Math.sin(clock.elapsedTime * 1.5) * 0.08;
  if (!goal.opened || goal.scored || gameOver) return;

  const dist = goal.chest.position.distanceTo(player.mesh.position);
  if (dist < 1.2) {
    goal.scored = true;
    updateScore(50);
    tip.textContent = 'Coffre pillé : +50 butin !';
    updateObjective('Continue d\'explorer ou rafraîchis pour rejouer.');
  }
}

function updateTraps(delta) {
  traps.forEach((trap) => {
    trap.cooldown = Math.max(0, trap.cooldown - delta);
    trap.mesh.rotation.y += delta * 1.2;
    trap.mesh.position.y = 0.28 + Math.sin(clock.elapsedTime * 6 + trap.wiggleOffset) * 0.04;

    if (trap.cooldown === 0 && trap.bounds.containsPoint(player.mesh.position)) {
      trap.cooldown = 1.2;
      tip.textContent = 'Attention aux pointes !';
      damagePlayer(1);
    }
  });
}

function createSpecters() {
  const points = [
    new THREE.Vector3(-6, 0.6, 6),
    new THREE.Vector3(6, 0.6, -7),
  ];

  return points.map((p, idx) => {
    const geo = new THREE.OctahedronGeometry(0.5 + idx * 0.1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6ab0ff, emissive: 0x1a3658, metalness: 0.3, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(p);
    mesh.castShadow = true;
    return { mesh, wanderOffset: idx * 0.8, health: 1 };
  });
}

function updateSpecters(delta) {
  specters.forEach((specter, idx) => {
    const direction = player.mesh.position.clone().sub(specter.mesh.position).setY(0);
    if (direction.lengthSq() > 0.001) {
      direction.normalize();
      const sway = Math.sin(clock.elapsedTime * 1.4 + specter.wanderOffset) * 0.5;
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), sway * 0.05);
      specter.mesh.position.add(direction.multiplyScalar(delta * 1.8));
    }

    specter.mesh.position.y = 0.55 + Math.sin(clock.elapsedTime * 3 + idx) * 0.1;

    const dist = specter.mesh.position.distanceTo(player.mesh.position);
    if (dist < 1.05) {
      tip.textContent = 'Un spectre te poursuit !';
      damagePlayer(1);
    }
  });
}

function updateTurrets(delta) {
  turrets.forEach((turret) => {
    const head = turret.mesh.userData.head;
    const dir = player.mesh.position.clone().sub(turret.mesh.position);
    const yaw = Math.atan2(dir.x, dir.z);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, yaw, 0.08);

    turret.mesh.userData.cooldown = Math.max(0, turret.mesh.userData.cooldown - delta);
    if (turret.mesh.userData.cooldown === 0 && dir.lengthSq() > 0.5) {
      spawnProjectile(turret.mesh.position, dir.normalize());
      turret.mesh.userData.cooldown = 2.5;
      tip.textContent = 'Une tourelle arcanique te vise !';
    }
  });
}

function spawnProjectile(origin, direction) {
  const geo = new THREE.SphereGeometry(0.18, 12, 12);
  const mat = new THREE.MeshStandardMaterial({ color: 0xa7f0ff, emissive: 0x5fb3c7, roughness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.position.copy(origin);
  mesh.position.y = 0.6;
  const velocity = direction.setY(0).normalize().multiplyScalar(6);
  projectiles.push({ mesh, velocity, life: 4 });
  scene.add(mesh);
}

function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.life -= delta;
    projectile.mesh.position.add(projectile.velocity.clone().multiplyScalar(delta));

    if (projectile.life <= 0 || collides(projectile.mesh.position)) {
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    const dist = projectile.mesh.position.distanceTo(player.mesh.position);
    if (dist < 0.9) {
      damagePlayer(1);
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function fireArcaneBolt() {
  if (gameOver) return;
  if (!hasSpellbook) {
    tip.textContent = 'Trouve le grimoire avant de canaliser un tir arcanique.';
    return;
  }
  if (boltCooldown > 0) return;

  const origin = player.mesh.position.clone();
  origin.y += cameraMode === 'fps' ? 1.4 : 1.1;

  const lookEuler =
    cameraMode === 'fps'
      ? new THREE.Euler(pitch, yaw, 0, 'YXZ')
      : new THREE.Euler(0, player.mesh.rotation.y, 0);
  const direction = new THREE.Vector3(0, 0, -1).applyEuler(lookEuler).normalize();
  direction.y = THREE.MathUtils.clamp(direction.y, -0.35, 0.35);

  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6),
    new THREE.MeshStandardMaterial({ color: 0x9fe6ff, emissive: 0x4ab9ff, metalness: 0.5, roughness: 0.1 })
  );
  bolt.rotation.x = Math.PI / 2;
  bolt.position.copy(origin);
  bolt.castShadow = true;
  arcaneBolts.push({ mesh: bolt, velocity: direction.multiplyScalar(10), life: 3 });
  scene.add(bolt);

  boltCooldown = 0.75;
  tip.textContent = 'Trait arcanique lancé !';
  updateSpellStatus();
}

function checkBoltHits(list, bolt, boltIndex, radius, reward, message) {
  for (let j = list.length - 1; j >= 0; j -= 1) {
    const target = list[j];
    if (target.mesh.position.distanceTo(bolt.mesh.position) < radius) {
      target.health = (target.health || 1) - 1;
      scene.remove(bolt.mesh);
      arcaneBolts.splice(boltIndex, 1);
      if (target.health <= 0) {
        scene.remove(target.mesh);
        list.splice(j, 1);
        updateScore(reward);
        if (message) tip.textContent = message;
      }
      return true;
    }
  }
  return false;
}

function updateArcaneBolts(delta) {
  for (let i = arcaneBolts.length - 1; i >= 0; i -= 1) {
    const bolt = arcaneBolts[i];
    bolt.life -= delta;
    bolt.mesh.position.add(bolt.velocity.clone().multiplyScalar(delta));
    bolt.mesh.rotation.y += delta * 8;

    if (bolt.life <= 0 || collides(bolt.mesh.position)) {
      scene.remove(bolt.mesh);
      arcaneBolts.splice(i, 1);
      continue;
    }

    if (checkBoltHits(enemies, bolt, i, 0.9, 6, 'Orbe dissipée !')) continue;
    if (checkBoltHits(specters, bolt, i, 0.9, 8, 'Spectre dissipé !')) continue;
    if (checkBoltHits(turrets, bolt, i, 0.9, 12, 'Tourelle détruite !')) continue;

    if (golem.alive && bolt.mesh.position.distanceTo(golem.mesh.position) < 1.3) {
      scene.remove(bolt.mesh);
      arcaneBolts.splice(i, 1);
      golem.health -= 1;
      tip.textContent = 'Le golem est ébranlé par la magie !';
      if (golem.health <= 0) {
        golem.alive = false;
        scene.remove(golem.mesh);
        updateScore(25);
        updateObjective('Golem vaincu : ouvre le coffre ou poursuis tes quêtes.');
        tip.textContent = 'Gardien terrassé !';
      }
    }
  }
}

function updateCampfire(delta) {
  campfire.mesh.userData.cooldown = Math.max(0, campfire.mesh.userData.cooldown - delta);
  const flame = campfire.mesh.userData.flame;
  flame.scale.y = 1 + Math.sin(clock.elapsedTime * 6) * 0.15;
  flame.material.opacity = 0.75 + Math.sin(clock.elapsedTime * 5) * 0.1;

  const dist = campfire.mesh.position.distanceTo(player.mesh.position);
  if (dist < 1.1 && campfire.mesh.userData.cooldown === 0 && !gameOver) {
    campfire.mesh.userData.cooldown = 4;
    healPlayer(1);
    stamina = staminaMax;
    tip.textContent = 'Feu de camp : repos complet !';
  }
}

function updateGolem(delta) {
  if (!golem.alive) return;
  golem.cooldown = Math.max(0, golem.cooldown - delta);

  const dist = golem.mesh.position.distanceTo(player.mesh.position);
  if (dist < 8.5) {
    golem.awake = true;
  }

  if (golem.awake) {
    const direction = player.mesh.position.clone().sub(golem.mesh.position).setY(0);
    if (direction.lengthSq() > 0.001) {
      direction.normalize();
      golem.mesh.position.add(direction.multiplyScalar(delta * 1.1));
      golem.mesh.position.x = THREE.MathUtils.clamp(golem.mesh.position.x, -8.5, 8.5);
      golem.mesh.position.z = THREE.MathUtils.clamp(golem.mesh.position.z, -9, 9);
    }
  }

  golem.mesh.rotation.y += delta * 0.4;

  if (dist < 1.2 && golem.cooldown === 0) {
    damagePlayer(1);
    golem.cooldown = 1.4;
    tip.textContent = 'Le golem te percute !';
  }
}

function updateHealthDisplay() {
  if (!healthDisplay) return;
  const hearts = '❤'.repeat(player.health) || '☠';
  healthDisplay.textContent = hearts;
}

function updateScore(amount) {
  score += amount;
  if (scoreDisplay) {
    scoreDisplay.textContent = `Butin : ${score}`;
  }
}

function updateObjective(message) {
  if (objectiveDisplay) {
    objectiveDisplay.textContent = message;
  }
}

function updateRuneUI() {
  if (runeProgress) {
    runeProgress.textContent = `Runes liées : ${runesLinked} / ${runeSet.runes.length}`;
  }
  if (portalStatus && !runeSet.portal.userData.active) {
    portalStatus.textContent = 'Active la stèle pour invoquer un portail bonus.';
  }
}

function updateStaminaBar() {
  if (!staminaFill) return;
  const ratio = stamina / staminaMax;
  staminaFill.style.width = `${Math.round(ratio * 100)}%`;
  staminaFill.style.background = ratio < 0.2
    ? 'linear-gradient(90deg, #e69d7d, #e85f5f)'
    : 'linear-gradient(90deg, #8ee67d, #4bb14b)';
}

function updateSpellStatus() {
  if (!spellStatus) return;
  if (!hasSpellbook) {
    spellStatus.textContent = 'Grimoire non découvert.';
    return;
  }

  if (boltCooldown > 0) {
    spellStatus.textContent = 'Canalisation... recharge en cours';
  } else {
    spellStatus.textContent = 'Trait arcanique prêt.';
  }
}

function updateCrosshair() {
  if (!crosshair) return;
  if (cameraMode === 'fps') {
    crosshair.style.display = 'block';
    crosshair.style.opacity = pointerLocked ? '0.9' : '0.55';
  } else {
    crosshair.style.display = 'none';
  }
}

function flickerTorches() {
  torches.forEach(({ light }, idx) => {
    const noise = Math.sin(clock.elapsedTime * (4 + idx)) * 0.1;
    light.intensity = light.userData.baseIntensity + noise;
  });
}

function updateShieldEffect(delta) {
  if (player.shield > 0) {
    player.shield = Math.max(0, player.shield - delta);
    player.aura.visible = true;
    const pulse = 0.06 * Math.sin(clock.elapsedTime * 6) + 0.95;
    player.aura.scale.setScalar(pulse);
  } else if (player.aura.visible) {
    player.aura.visible = false;
  }
}
