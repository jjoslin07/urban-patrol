import { EXPLOSION_SPRITE, FRAME_SIZE } from '../config/assets.js';
import { loadImage } from '../systems/SpriteSheet.js';

let explosionImg = null;
export async function preloadExplosionSprite() {
  explosionImg = await loadImage(EXPLOSION_SPRITE.src);
}

export class Projectile {
  constructor({
    x,
    y,
    laneY,
    vx,
    vy = 0,
    damage,
    fromPlayer = true,
    color = '#ffd166',
    maxDist = 680,
    isGrenade = false,
  }) {
    this.x = x;
    this.y = y;
    this.laneY = laneY;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.fromPlayer = fromPlayer;
    this.color = color;
    this.traveled = 0;
    this.maxDist = maxDist;
    this.isGrenade = isGrenade;
    this.active = true;
  }

  update(dt) {
    const dx = this.vx * dt;
    if (this.isGrenade) {
      this.vy += 680 * dt;
    }
    const dy = this.vy * dt;
    this.x += dx;
    this.y += dy;
    this.traveled += Math.hypot(dx, dy);

    if (this.isGrenade && this.y >= this.laneY - 6) {
      this.y = this.laneY - 6;
      this.active = false;
      this.detonated = true;
      return;
    }

    if (this.traveled >= this.maxDist) {
      this.active = false;
      if (this.isGrenade) this.detonated = true;
    }
  }

  draw(ctx, cameraX) {
    const sx = this.x - cameraX;
    ctx.save();
    if (this.isGrenade) {
      ctx.fillStyle = '#4a5759';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(Math.round(sx), Math.round(this.y), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      const len = this.fromPlayer ? 14 : 11;
      ctx.fillRect(Math.round(sx - len / 2), Math.round(this.y - 2), len, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(sx - 3), Math.round(this.y - 1), 6, 2);
    }
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.explosions = [];
  }

  spawnExplosion(x, laneY) {
    this.explosions.push({
      x,
      laneY,
      frame: 0,
      timer: 0,
      done: false,
    });
    this.spawnHitSparks(x, laneY - 40, '#ff9f1c', 18);
  }

  spawnHitSparks(x, y, color = '#ff9f1c', count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 190;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        gravity: 380,
        life: 0.22 + Math.random() * 0.2,
        maxLife: 0.42,
        size: 3 + Math.floor(Math.random() * 3),
        color,
      });
    }
  }

  spawnShellCasing(x, y, facingLeft) {
    const dir = facingLeft ? 1 : -1;
    this.particles.push({
      x,
      y,
      vx: dir * (55 + Math.random() * 45),
      vy: -130 - Math.random() * 50,
      gravity: 520,
      life: 0.48,
      maxLife: 0.48,
      size: 4,
      color: '#f4d35e',
    });
  }

  spawnFloatingText(x, y, text, color = '#ffd166') {
    this.texts.push({
      x,
      y,
      text,
      color,
      vy: -48,
      life: 0.85,
      maxLife: 0.85,
    });
  }

  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) {
      t.y += t.vy * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);

    const frameDur = 1 / EXPLOSION_SPRITE.fps;
    for (const ex of this.explosions) {
      ex.timer += dt;
      while (ex.timer >= frameDur) {
        ex.timer -= frameDur;
        ex.frame += 1;
        if (ex.frame >= EXPLOSION_SPRITE.frames) {
          ex.done = true;
          break;
        }
      }
    }
    this.explosions = this.explosions.filter((ex) => !ex.done);
  }

  draw(ctx, cameraX) {
    if (explosionImg) {
      for (const ex of this.explosions) {
        const sx = ex.x - cameraX;
        const size = FRAME_SIZE * 1.9;
        ctx.drawImage(
          explosionImg,
          ex.frame * FRAME_SIZE,
          0,
          FRAME_SIZE,
          FRAME_SIZE,
          Math.round(sx - size / 2),
          Math.round(ex.laneY - size + 12),
          size,
          size
        );
      }
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cameraX), Math.round(p.y), p.size, p.size);
      ctx.restore();
    }

    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText(t.text, Math.round(t.x - cameraX) + 1, Math.round(t.y) + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, Math.round(t.x - cameraX), Math.round(t.y));
      ctx.restore();
    }
  }
}
