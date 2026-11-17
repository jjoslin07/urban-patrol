import { ITEM_ASSETS } from '../config/assets.js';
import { loadImage } from '../systems/SpriteSheet.js';

export async function preloadItemAssets() {
  const promises = [];
  for (const c of ITEM_ASSETS.chests) {
    promises.push(loadImage(c.full), loadImage(c.empty));
  }
  for (const t of ITEM_ASSETS.treasures) {
    promises.push(loadImage(t.src));
  }
  for (const f of ITEM_ASSETS.foods) {
    promises.push(loadImage(f.src));
  }
  for (const a of ITEM_ASSETS.ammos) {
    promises.push(loadImage(a.src));
  }
  await Promise.all(promises);
}

export class Chest {
  constructor(x, laneY, chestIndex = 0, district = null) {
    this.x = x;
    this.laneY = laneY;
    const cfg = ITEM_ASSETS.chests[chestIndex % ITEM_ASSETS.chests.length];
    this.config = cfg;
    this.opened = false;
    this.fullImg = null;
    this.emptyImg = null;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.openPopScale = 1;

    // Keep chest loot on the street: clamp to this district's ground band
    // (falls back to the original hardcoded band when no district is passed)
    this.groundTopY = district ? district.groundTopY + 4 : 428;
    this.groundBottomY = district ? district.groundBottomY - 4 : 518;

    loadImage(cfg.full).then((img) => { this.fullImg = img; });
    loadImage(cfg.empty).then((img) => { this.emptyImg = img; });
  }

  clampToStreet(y) {
    return Math.max(this.groundTopY, Math.min(this.groundBottomY, y));
  }

  update(dt, player, pickups, particles, audio) {
    this.bobTimer += dt * 3;
    if (this.openPopScale > 1) {
      this.openPopScale = Math.max(1, this.openPopScale - dt * 2.5);
    }

    if (!this.opened && player.state !== 'dead') {
      const distX = Math.abs(player.x - this.x);
      const distLane = Math.abs(player.laneY - this.laneY);
      if (distX < 48 && distLane < 34) {
        this.open(pickups, particles, audio);
      }
    }
  }

  open(pickups, particles, audio) {
    if (this.opened) return;
    this.opened = true;
    this.openPopScale = 1.35;

    if (audio && audio.playChestOpen) {
      audio.playChestOpen();
    }
    if (particles) {
      particles.spawnHitSparks(this.x, this.laneY - 28, '#ffd166', 16);
      particles.spawnFloatingText(this.x, this.laneY - 68, 'CHEST OPENED!', '#ffd166');
    }

    // Burst out 2 items from the Supply Chest: 1 high-value Gold cache + 1 Ammo or Food item
    const baseCfg = ITEM_ASSETS.treasures[Math.floor(Math.random() * ITEM_ASSETS.treasures.length)];
    pickups.push(
      new Pickup({
        kind: 'gold',
        x: this.x - 22,
        laneY: this.clampToStreet(this.laneY),
        config: { ...baseCfg, value: this.config.value * 4 },
        popVy: -195,
      })
    );

    if (Math.random() < 0.65) {
      const aCfg = ITEM_ASSETS.ammos[Math.floor(Math.random() * ITEM_ASSETS.ammos.length)];
      pickups.push(
        new Pickup({
          kind: 'ammo',
          x: this.x + 22,
          laneY: this.clampToStreet(this.laneY + 8),
          config: aCfg,
          popVy: -205,
        })
      );
    } else {
      const fCfg = ITEM_ASSETS.foods[Math.floor(Math.random() * ITEM_ASSETS.foods.length)];
      pickups.push(
        new Pickup({
          kind: 'food',
          x: this.x + 22,
          laneY: this.clampToStreet(this.laneY + 8),
          config: fCfg,
          popVy: -205,
        })
      );
    }
  }

  draw(ctx, cameraX) {
    const sx = this.x - cameraX;
    if (sx < -120 || sx > ctx.canvas.width + 120) return;

    const img = this.opened ? this.emptyImg : this.fullImg;
    if (!img) return;

    ctx.save();
    // Glow ring under unopened chest
    ctx.fillStyle = this.opened ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 209, 102, 0.32)';
    ctx.beginPath();
    ctx.ellipse(sx, this.laneY, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const size = 68 * this.openPopScale;
    ctx.drawImage(img, Math.round(sx - size / 2), Math.round(this.laneY - size + 6), size, size);

    if (!this.opened) {
      const pulse = Math.sin(this.bobTimer) * 3;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('★ LOOT CHEST', Math.round(sx), Math.round(this.laneY - size - 2 + pulse));
    }
    ctx.restore();
  }
}

export class Pickup {
  constructor({ kind, x, laneY, config, popVy = -140 }) {
    this.kind = kind; // 'gold' | 'food'
    this.x = x;
    this.laneY = laneY;
    this.config = config;
    this.img = null;
    this.collected = false;

    this.offsetY = -8;
    this.vy = popVy;
    this.bobTimer = Math.random() * Math.PI * 2;

    loadImage(config.src).then((img) => { this.img = img; });
  }

  update(dt, player, onCollect) {
    if (this.collected) return;

    this.bobTimer += dt * 4.2;

    // Pop bounce physics
    if (this.offsetY < 0 || this.vy < 0) {
      this.vy += 650 * dt;
      this.offsetY += this.vy * dt;
      if (this.offsetY >= 0) {
        this.offsetY = 0;
        this.vy = 0;
      }
    }

    if (player.state === 'dead') return;

    const dx = player.x - this.x;
    const dy = player.laneY - this.laneY;
    const dist = Math.hypot(dx, dy);

    // Slight magnetic pull when player is close (guard dist === 0 to avoid NaN)
    if (dist > 0.001 && dist < 85 && this.offsetY === 0) {
      this.x += (dx / dist) * 180 * dt;
      this.laneY += (dy / dist) * 120 * dt;
    }

    if (Math.abs(dx) < 38 && Math.abs(dy) < 30) {
      this.collected = true;
      onCollect(this);
    }
  }

  draw(ctx, cameraX) {
    if (this.collected || !this.img) return;
    const sx = this.x - cameraX;
    if (sx < -80 || sx > ctx.canvas.width + 80) return;

    const bob = this.offsetY === 0 ? Math.sin(this.bobTimer) * 4 : this.offsetY;
    const isGold = this.kind === 'gold';
    const isAmmo = this.kind === 'ammo';

    ctx.save();
    // Ground aura + shadow
    ctx.fillStyle = isGold
      ? 'rgba(255, 209, 102, 0.35)'
      : isAmmo
      ? 'rgba(56, 189, 248, 0.38)'
      : 'rgba(6, 214, 160, 0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, this.laneY, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawSize = this.config.size || (isGold ? 36 : isAmmo ? 36 : 42);
    ctx.drawImage(
      this.img,
      Math.round(sx - drawSize / 2),
      Math.round(this.laneY - drawSize - 4 + bob),
      drawSize,
      drawSize
    );

    // Small label tag so player knows what's HP vs Gold vs Ammo
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isGold ? '#ffd166' : isAmmo ? '#38bdf8' : '#06d6a0';
    const label = isGold
      ? `+$${this.config.value}`
      : isAmmo
      ? `+${this.config.rounds} AMMO`
      : `+${this.config.heal} HP`;
    ctx.fillText(label, Math.round(sx), Math.round(this.laneY - drawSize - 8 + bob));
    ctx.restore();
  }
}
