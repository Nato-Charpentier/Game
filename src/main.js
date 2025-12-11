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

const player = createPlayer();
scene.add(player.mesh);
player.mesh.userData.radius = 0.45;

const enemies = createEnemies();
enemies.forEach((e) => scene.add(e.mesh));

const torches = createTorches();
torches.forEach((t) => scene.add(t.light));

const loot = createLoot();
scene.add(loot.mesh);

const manaCrystal = createManaCrystal();
scene.add(manaCrystal.mesh);

const goal = createGoal();
scene.add(goal.door);
scene.add(goal.key);
scene.add(goal.chest);

const traps = createTraps();
traps.forEach((t) => scene.add(t.mesh));

const specters = createSpecters();
specters.forEach((s) => scene.add(s.mesh));

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

const staminaMax = 100;
let stamina = staminaMax;
let exhausted = false;
let exhaustionNoticeCooldown = 0;

updateHealthDisplay();
updateObjective('Trouve la clé pour ouvrir la porte.');
updateScore(0);

function animate() {
  const delta = clock.getDelta();
  exhaustionNoticeCooldown = Math.max(0, exhaustionNoticeCooldown - delta);
  handleInput(delta);
  updateEnemies(delta);
  updateLoot(delta);
  updateManaCrystal(delta);
  updateKey(delta);
  updateDoor(delta);
  updateChest(delta);
  updateTraps(delta);
  updateSpecters(delta);
  updateShieldEffect(delta);
  updateStaminaBar();
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
    foes.push({ mesh, ...o });
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

function createKeyMap() {
  const map = new Map();
  window.addEventListener('keydown', (e) => map.set(e.code, true));
  window.addEventListener('keyup', (e) => map.set(e.code, false));
  return map;
}

function handleInput(delta) {
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-1);

  const move = new THREE.Vector3();
  if (keys.get('KeyZ') || keys.get('KeyW')) move.add(forward);
  if (keys.get('KeyS')) move.add(forward.clone().multiplyScalar(-1));
  if (keys.get('ArrowLeft')) move.add(right.clone().multiplyScalar(-1));
  if (keys.get('ArrowRight')) move.add(right);

  if (keys.get('KeyQ')) player.mesh.rotation.y += delta * 1.8;
  if (keys.get('KeyD')) player.mesh.rotation.y -= delta * 1.8;

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

  const rotatedMove = move.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.rotation.y);
  attemptMove(rotatedMove, delta, sprint);

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
  const camOffset = new THREE.Vector3(0, 4.5, 7);
  camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.mesh.rotation.y);
  const camPos = player.mesh.position.clone().add(camOffset);
  camera.position.lerp(camPos, 0.08);
  const lookAt = player.mesh.position.clone();
  lookAt.y += 1.5;
  camera.lookAt(lookAt);
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
    return { mesh, wanderOffset: idx * 0.8 };
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

function updateStaminaBar() {
  if (!staminaFill) return;
  const ratio = stamina / staminaMax;
  staminaFill.style.width = `${Math.round(ratio * 100)}%`;
  staminaFill.style.background = ratio < 0.2
    ? 'linear-gradient(90deg, #e69d7d, #e85f5f)'
    : 'linear-gradient(90deg, #8ee67d, #4bb14b)';
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
