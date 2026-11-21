import { DISTRICTS, ITEM_ASSETS } from './config/assets.js';
import { ParallaxBackground } from './systems/ParallaxBackground.js';
import { drawHUD } from './systems/HUD.js';
import { Input } from './systems/Input.js';
import { AudioSynth } from './systems/AudioSynth.js';
import { Player } from './entities/Player.js';
import { Enemy, preloadAllEnemies } from './entities/Enemy.js';
import { ParticleSystem, preloadExplosionSprite } from './entities/Projectile.js';
import { Chest, Pickup, preloadItemAssets } from './entities/Pickup.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const input = new Input(canvas);
const audio = new AudioSynth();
const background = new ParallaxBackground();
const particles = new ParticleSystem();
const player = new Player(180, 470);

let currentDistrictIndex = 0;
let cameraX = 0;
let districtBannerTimer = 2.8;
let score = 0;
let totalKills = 0;
let killsTowardsChest = 0;
let chestSpawnCount = 0;
const KILLS_PER_CHEST = 15;

let enemies = [];
let projectiles = [];
let chests = [];
let pickups = [];
let isReady = false;
let isPaused = false;

const tierBtns = document.querySelectorAll('[data-tier]');
const variantBtn = document.getElementById('variant-btn');
const districtBtns = document.querySelectorAll('[data-district]');
const pauseBtn = document.getElementById('pause-btn');
const muteBtn = document.getElementById('mute-btn');

// The rank-preview toolbar (setTierDirectly) is a dev/balancing tool —
// it only shows when the page is opened with ?debug=1
const debugMode = new URLSearchParams(window.location.search).has('debug');
if (!debugMode) {
  const rankToolbar = document.getElementById('tier-buttons');
  if (rankToolbar) rankToolbar.style.display = 'none';
}

function syncToolbarUI() {
  tierBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tier === player.tierKey);
  });
  districtBtns.forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.district) === currentDistrictIndex);
  });
  if (pauseBtn) {
    pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    pauseBtn.classList.toggle('active', isPaused);
  }
}

function togglePause() {
  if (player.state === 'dead') return;
  isPaused = !isPaused;
  syncToolbarUI();
}

tierBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    player.setTierDirectly(btn.dataset.tier, particles, audio);
    syncToolbarUI();
    canvas.focus();
  });
});

variantBtn.addEventListener('click', () => {
  player.cycleVariant(particles, audio);
  canvas.focus();
});

districtBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    isPaused = false;
    loadDistrictStage(Number(btn.dataset.district));
    canvas.focus();
  });
});

if (pauseBtn) {
  pauseBtn.addEventListener('click', () => {
    togglePause();
    canvas.focus();
  });
}

muteBtn.addEventListener('click', () => {
  audio.muted = !audio.muted;
  muteBtn.textContent = audio.muted ? '🔇 Muted' : '🔊 SFX';
});

function randomLaneY(district) {
  return (
    district.groundTopY +
    4 +
    Math.random() * Math.max(4, district.groundBottomY - district.groundTopY - 8)
  );
}

async function loadDistrictStage(index) {
  currentDistrictIndex = (index + DISTRICTS.length) % DISTRICTS.length;
  const district = DISTRICTS[currentDistrictIndex];
  await background.loadDistrict(district);

  cameraX = 0;
  player.x = 160;
  player.laneY = (district.groundTopY + district.groundBottomY) / 2;
  player.hp = player.maxHp;
  player.ammo = player.maxAmmo;
  player.reserveAmmo = Math.max(player.reserveAmmo, player.config.startReserveAmmo || 30);
  player.secAmmo = player.maxSecAmmo;
  player.secReserveAmmo = Math.max(player.secReserveAmmo, player.config.startSecReserveAmmo || 18);
  player.state = 'idle';

  enemies = [];
  projectiles = [];
  chests = [];
  pickups = [];
  districtBannerTimer = 3.0;
  syncToolbarUI();

  populateLongLevel(district);
}

function populateLongLevel(district) {
  const levelLen = district.length || 9200;
  // Per-stage difficulty is tuned in config/assets.js (DISTRICTS[].difficulty)
  const difficulty = district.difficulty || 1 + currentDistrictIndex * 0.18;
  const pool = district.enemyPool;

  // Populate enemies along the long 9,200px+ street in 1-3 enemy groups.
  // Density is 1.5x the original spacing (~260-333px between groups) for heavier pressure.
  // Zero pre-spawned items or chests on the street — all loot & chests come from defeating enemies!
  for (let x = 620; x < levelLen - 620; x += (390 + Math.floor(Math.random() * 110)) / 1.5) {
    const roll = Math.random();
    const groupSize = roll < 0.35 ? 1 : roll < 0.82 ? 2 : 3;
    for (let i = 0; i < groupSize; i++) {
      const archetype = pool[Math.floor(Math.random() * pool.length)];
      const spawnX = x + i * 88 + (Math.random() - 0.5) * 35;
      enemies.push(new Enemy(archetype, spawnX, randomLaneY(district), difficulty));
    }
  }

  // Spawn District Boss at the end of the avenue
  if (district.boss) {
    enemies.push(
      new Enemy(
        district.boss,
        levelLen - 340,
        (district.groundTopY + district.groundBottomY) / 2,
        difficulty
      )
    );
  }
}

function spawnEnemyLoot(enemy) {
  const district = DISTRICTS[currentDistrictIndex];
  totalKills += 1;
  killsTowardsChest += 1;

  // 1. Spawn a Supply Chest ONLY every 15 enemy kills!
  if (killsTowardsChest >= KILLS_PER_CHEST) {
    killsTowardsChest -= KILLS_PER_CHEST;
    const clampedLaneY = Math.max(
      district.groundTopY + 4,
      Math.min(district.groundBottomY - 4, enemy.laneY)
    );
    chests.push(new Chest(enemy.x, clampedLaneY, chestSpawnCount++, district));
    audio.playChestOpen();
    particles.spawnHitSparks(enemy.x, clampedLaneY - 40, '#ffd166', 20);
    particles.spawnFloatingText(
      enemy.x,
      clampedLaneY - 115,
      '★ 15 KILLS! SUPPLY CHEST DROPPED! ★',
      '#ffd166'
    );
  }

  // 2. Roll strictly 0 to 2 item drops per enemy kill
  // (35% chance of 0 items, 45% chance of 1 item, 20% chance of 2 items; Boss drops 2 items)
  const dropRoll = Math.random();
  const dropCount = enemy.isBoss ? 2 : dropRoll < 0.35 ? 0 : dropRoll < 0.8 ? 1 : 2;
  const isPlayerLowAmmo =
    player.ammo + player.reserveAmmo <= player.maxAmmo ||
    player.secAmmo + player.secReserveAmmo <= player.maxSecAmmo;

  for (let i = 0; i < dropCount; i++) {
    const offsetX = (i - (dropCount - 1) / 2) * 32 + (Math.random() - 0.5) * 12;
    const clampedY = Math.max(
      district.groundTopY + 4,
      Math.min(district.groundBottomY - 4, enemy.laneY + (Math.random() - 0.5) * 12)
    );

    const typeRoll = Math.random();
    if (isPlayerLowAmmo && i === 0) {
      // Prioritize ammo if player is running dry
      const aCfg = ITEM_ASSETS.ammos[Math.floor(Math.random() * ITEM_ASSETS.ammos.length)];
      pickups.push(
        new Pickup({
          kind: 'ammo',
          x: enemy.x + offsetX,
          laneY: clampedY,
          config: aCfg,
          popVy: -170 - Math.random() * 35,
        })
      );
    } else if (typeRoll < 0.5) {
      // Gold / Cash item
      const tCfg = ITEM_ASSETS.treasures[Math.floor(Math.random() * ITEM_ASSETS.treasures.length)];
      pickups.push(
        new Pickup({
          kind: 'gold',
          x: enemy.x + offsetX,
          laneY: clampedY,
          config: tCfg,
          popVy: -165 - Math.random() * 40,
        })
      );
    } else if (typeRoll < 0.82) {
      // Ammo Pack
      const aCfg = ITEM_ASSETS.ammos[Math.floor(Math.random() * ITEM_ASSETS.ammos.length)];
      pickups.push(
        new Pickup({
          kind: 'ammo',
          x: enemy.x + offsetX,
          laneY: clampedY,
          config: aCfg,
          popVy: -175 - Math.random() * 35,
        })
      );
    } else {
      // Food HP item
      const fCfg = ITEM_ASSETS.foods[Math.floor(Math.random() * ITEM_ASSETS.foods.length)];
      pickups.push(
        new Pickup({
          kind: 'food',
          x: enemy.x + offsetX,
          laneY: clampedY,
          config: fCfg,
          popVy: -180 - Math.random() * 30,
        })
      );
    }
  }
}

function detonateGrenade(proj) {
  particles.spawnExplosion(proj.x, proj.laneY);
  audio.playExplosion();
  for (const enemy of enemies) {
    if (enemy.state === 'dead') continue;
    const distX = Math.abs(enemy.x - proj.x);
    const distLane = Math.abs(enemy.laneY - proj.laneY);
    if (distX <= 135 && distLane <= 55) {
      const dir = enemy.x >= proj.x ? 1 : -1;
      const died = enemy.takeDamage(proj.damage, dir * 28, particles, audio);
      if (died && !enemy.droppedLoot) {
        enemy.droppedLoot = true;
        score += enemy.score;
        spawnEnemyLoot(enemy);
      }
    }
  }
}

function updateProjectiles(dt) {
  for (const proj of projectiles) {
    proj.update(dt);

    if (proj.isGrenade && proj.detonated) {
      detonateGrenade(proj);
      continue;
    }

    if (!proj.active) continue;

    if (proj.fromPlayer) {
      // Check if player shot hits an unopened chest
      for (const chest of chests) {
        if (
          !chest.opened &&
          Math.abs(proj.x - chest.x) < 30 &&
          Math.abs(proj.laneY - chest.laneY) < 28
        ) {
          chest.open(pickups, particles, audio);
          if (!proj.isGrenade) proj.active = false;
          break;
        }
      }
      if (!proj.active) continue;

      for (const enemy of enemies) {
        if (enemy.state === 'dead') continue;
        const hitX = Math.abs(proj.x - enemy.x) < (enemy.isBoss ? 38 : 28);
        const hitLane = Math.abs(proj.laneY - enemy.laneY) < 34;
        if (hitX && hitLane) {
          proj.active = false;
          if (proj.isGrenade) {
            detonateGrenade(proj);
          } else {
            const knockback = Math.sign(proj.vx) * (enemy.isBoss ? 6 : 16);
            const died = enemy.takeDamage(proj.damage, knockback, particles, audio);
            if (died && !enemy.droppedLoot) {
              enemy.droppedLoot = true;
              score += enemy.score;
              spawnEnemyLoot(enemy);
            }
          }
          break;
        }
      }
    } else if (player.state !== 'dead') {
      const hitX = Math.abs(proj.x - player.x) < 24;
      const hitLane = Math.abs(proj.laneY - player.laneY) < 28;
      const dodgedByJump = player.jumpOffset < -42;
      const dodgedByCrouch = player.isCrouching; // head drops below the bullet line
      if (hitX && hitLane && !dodgedByJump && !dodgedByCrouch) {
        proj.active = false;
        player.takeDamage(proj.damage, particles, audio);
      }
    }
  }
  projectiles = projectiles.filter((p) => p.active);
}

function updateGame(dt) {
  // Check Escape key to toggle Pause
  if (input.wasPressed('Escape')) {
    togglePause();
    input.endFrame();
    return;
  }

  if (isPaused) {
    input.endFrame();
    return;
  }

  const district = DISTRICTS[currentDistrictIndex];
  const levelLen = district.length || 9200;
  background.update(dt);

  if (districtBannerTimer > 0) districtBannerTimer -= dt;

  // Respawn if player is downed
  if (player.state === 'dead' && input.wasPressed('Enter', 'Space')) {
    player.hp = player.maxHp;
    player.ammo = player.maxAmmo;
    player.reserveAmmo = player.config.startReserveAmmo || 30;
    player.secAmmo = player.maxSecAmmo;
    player.secReserveAmmo = player.config.startSecReserveAmmo || 18;
    player.state = 'idle';
    player.currentAnimator.play('idle', true);
    particles.spawnFloatingText(player.x, player.laneY - 110, 'BACKUP DEPLOYED!', '#06d6a0');
    audio.playSiren();
  }

  const bounds = {
    minX: 40,
    maxX: levelLen - 40,
    topY: district.groundTopY,
    bottomY: district.groundBottomY,
  };

  player.update(dt, input, bounds, { projectiles, enemies, particles, audio });

  // Smooth camera tracking along the long avenue
  const targetCamX = Math.max(
    0,
    Math.min(player.x - canvas.width * 0.36, levelLen - canvas.width)
  );
  cameraX += (targetCamX - cameraX) * Math.min(1, dt * 8);

  // Update Chests
  for (const chest of chests) {
    chest.update(dt, player, pickups, particles, audio);
  }

  // Update Pickups (Gold, Food & Ammo dropped by enemies)
  for (const item of pickups) {
    item.update(dt, player, (collected) => {
      if (collected.kind === 'gold') {
        score += collected.config.value * 5;
        player.addGold(collected.config.value, particles, audio, () => {
          syncToolbarUI();
        });
      } else if (collected.kind === 'food') {
        player.heal(collected.config.heal, particles, audio);
      } else if (collected.kind === 'ammo') {
        player.addAmmo(collected.config.rounds, particles, audio);
      }
    });
  }
  pickups = pickups.filter((p) => !p.collected);

  // Update Enemies
  for (const enemy of enemies) {
    const wasDead = enemy.state === 'dead';
    enemy.update(dt, player, bounds, { projectiles, particles, audio });
    if (!wasDead && enemy.state === 'dead' && !enemy.droppedLoot) {
      enemy.droppedLoot = true;
      score += enemy.score;
      spawnEnemyLoot(enemy);
    }
  }
  enemies = enemies.filter((e) => !e.removable);

  updateProjectiles(dt);
  particles.update(dt);

  // Advance to next District when player reaches the end of the street
  if (player.x >= levelLen - 85) {
    audio.playSiren();
    loadDistrictStage(currentDistrictIndex + 1);
  }

  input.endFrame();
}

function drawHUDFrame() {
  drawHUD(ctx, canvas, {
    district: DISTRICTS[currentDistrictIndex],
    levelLen: DISTRICTS[currentDistrictIndex].length || 9200,
    player,
    totalKills,
    killsTowardsChest,
    killsPerChest: KILLS_PER_CHEST,
    score,
    isPaused,
    districtBannerTimer,
  });
}

function renderGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Parallax City Layers
  background.draw(ctx, cameraX, canvas.width, canvas.height);

  // 2. Depth-sort Chests, Pickups, Player, and Enemies by laneY
  const renderables = [...chests, ...pickups, player, ...enemies];
  renderables.sort((a, b) => a.laneY - b.laneY);

  for (const entity of renderables) {
    entity.draw(ctx, cameraX);
  }

  // 3. Projectiles & Explosions/Particles
  for (const proj of projectiles) {
    proj.draw(ctx, cameraX);
  }
  particles.draw(ctx, cameraX);

  // 4. HUD
  drawHUDFrame();
}

let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (isReady) {
    updateGame(dt);
    renderGame();
  }
  requestAnimationFrame(gameLoop);
}

async function init() {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#58a6ff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Loading Police, SWAT, Soldier, Chests & Food Assets...',
    canvas.width / 2,
    canvas.height / 2
  );

  await Promise.all([
    player.preloadAllOfficers(),
    preloadAllEnemies(),
    preloadItemAssets(),
    preloadExplosionSprite(),
  ]);
  // Pre-warm every district's background layers up front so switching
  // districts never stalls the game loop mid-run.
  for (const district of DISTRICTS) {
    await background.loadDistrict(district);
  }
  await loadDistrictStage(0);

  isReady = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

init();
