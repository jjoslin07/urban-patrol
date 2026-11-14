import { ENEMY_ARCHETYPES } from '../config/assets.js';
import { Animator } from '../systems/SpriteSheet.js';
import { Projectile } from './Projectile.js';

export async function preloadAllEnemies() {
  const promises = Object.values(ENEMY_ARCHETYPES).map(async (cfg) => {
    const anim = new Animator(cfg.basePath, cfg.anims);
    await anim.preload();
  });
  await Promise.all(promises);
}

export class Enemy {
  constructor(archetypeKey, x, laneY, difficultyMult = 1) {
    this.archetypeKey = archetypeKey;
    const cfg = ENEMY_ARCHETYPES[archetypeKey] || ENEMY_ARCHETYPES.bandit_1;
    this.config = cfg;

    this.x = x;
    this.homeX = x;
    this.laneY = laneY;
    this.facingLeft = true;

    this.maxHp = Math.round(cfg.hp * difficultyMult);
    this.hp = this.maxHp;
    this.speed = cfg.speed * (0.92 + Math.random() * 0.14);
    this.damage = Math.round(cfg.damage * difficultyMult);
    this.score = cfg.score;
    this.isBoss = Boolean(cfg.isBoss);

    this.animator = new Animator(cfg.basePath, cfg.anims);
    this.animator.preload();

    this.state = 'idle';
    this.aggro = false;
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.patrolTimer = 1.5 + Math.random() * 2;
    this.attackCooldown = 0.55 + Math.random() * 0.65;
    this.flashTimer = 0;
    this.deadTimer = 0;
    this.removable = false;
    this.droppedLoot = false;
    this.laneOffsetTarget = (Math.random() - 0.5) * 18;
  }

  get renderY() {
    return this.laneY;
  }

  takeDamage(amount, knockbackX, particles, audio) {
    if (this.state === 'dead') return false;

    this.aggro = true;
    this.hp = Math.max(0, this.hp - amount);
    this.x += knockbackX;
    this.flashTimer = 0.14;

    if (particles) {
      particles.spawnHitSparks(this.x, this.laneY - 58, '#ef476f', 9);
      particles.spawnFloatingText(this.x, this.laneY - 98, `-${amount}`, '#ffd166');
    }
    if (audio) audio.playHit();

    if (this.hp <= 0) {
      this.state = 'dead';
      this.animator.play('dead', true);
      return true;
    } else {
      if (!this.isBoss || this.state !== 'attack') {
        this.state = 'hurt';
        this.animator.play('hurt', true);
      }
      return false;
    }
  }

  update(dt, player, bounds, worldContext) {
    const { projectiles, particles, audio } = worldContext;

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.state === 'dead') {
      this.animator.update(dt);
      this.deadTimer += dt;
      if (this.deadTimer > 2.2) {
        this.removable = true;
      }
      return;
    }

    if (this.state === 'hurt') {
      this.animator.update(dt);
      if (this.animator.finished) {
        this.state = 'walk';
        this.animator.play('walk', true);
      }
      return;
    }

    if (this.state === 'attack') {
      this.animator.update(dt, () => {
        this.executeAttackHit(player, projectiles, particles, audio);
      });
      if (this.animator.finished) {
        this.attackCooldown = this.config.ranged ? 1.5 + Math.random() * 0.8 : 0.85 + Math.random() * 0.5;
        this.state = 'idle';
        this.animator.play('idle', true);
      }
      return;
    }

    if (player.state === 'dead') {
      this.state = 'idle';
      this.animator.play('idle');
      this.animator.update(dt);
      return;
    }

    const dx = player.x - this.x;
    const absDx = Math.abs(dx);

    // Only engage when player approaches within 540px (keeps enemies spread out!)
    if (!this.aggro && absDx < 540) {
      this.aggro = true;
    }

    if (!this.aggro) {
      // Casual street patrol near homeX
      this.patrolTimer -= dt;
      if (this.patrolTimer <= 0) {
        this.patrolTimer = 1.6 + Math.random() * 2.2;
        this.patrolDir = Math.random() < 0.45 ? 0 : -Math.sign(this.x - this.homeX || 1);
      }
      if (this.patrolDir !== 0) {
        this.facingLeft = this.patrolDir < 0;
        this.x += this.patrolDir * (this.speed * 0.45) * dt;
        this.state = 'walk';
        this.animator.play('walk');
      } else {
        this.state = 'idle';
        this.animator.play('idle');
      }
      this.animator.update(dt);
      return;
    }

    const targetLaneY = Math.max(
      bounds.topY,
      Math.min(bounds.bottomY, player.laneY + this.laneOffsetTarget)
    );
    const dy = targetLaneY - this.laneY;
    const absDy = Math.abs(player.laneY - this.laneY);

    this.facingLeft = dx < 0;

    const desiredRange = this.config.attackRange;
    const inRange = absDx <= desiredRange && absDy <= 32;

    if (inRange && this.attackCooldown <= 0) {
      this.state = 'attack';
      this.animator.play('attack', true);
      return;
    }

    let moveX = 0;
    let moveY = 0;

    if (this.config.ranged) {
      if (absDx > desiredRange * 0.85) {
        moveX = Math.sign(dx);
      } else if (absDx < 130) {
        moveX = -Math.sign(dx) * 0.6;
      }
    } else if (absDx > desiredRange - 12) {
      moveX = Math.sign(dx);
    }

    if (Math.abs(dy) > 6) {
      moveY = Math.sign(dy);
    }

    const isChasingFast = absDx > 260 && !this.config.ranged;
    const curSpeed = isChasingFast ? this.speed * 1.2 : this.speed;

    this.x += moveX * curSpeed * dt;
    this.laneY += moveY * (this.speed * 0.62) * dt;
    this.laneY = Math.max(bounds.topY, Math.min(bounds.bottomY, this.laneY));

    if (moveX !== 0 || moveY !== 0) {
      this.state = isChasingFast ? 'run' : 'walk';
      this.animator.play(this.state);
    } else {
      this.state = 'idle';
      this.animator.play('idle');
    }

    this.animator.update(dt);
  }

  executeAttackHit(player, projectiles, particles, audio) {
    if (player.state === 'dead') return;
    const dir = this.facingLeft ? -1 : 1;

    if (this.config.ranged) {
      const muzzleX = this.x + dir * 44;
      const muzzleY = this.laneY - 60;
      audio.playShot('pistol');
      particles.spawnHitSparks(muzzleX, muzzleY, '#ff6b6b', 5);
      projectiles.push(
        new Projectile({
          x: muzzleX,
          y: muzzleY,
          laneY: this.laneY,
          vx: dir * 440,
          damage: this.damage,
          fromPlayer: false,
          color: '#ff595e',
          maxDist: 520,
        })
      );
    } else {
      const distX = (player.x - this.x) * dir;
      const distLane = Math.abs(player.laneY - this.laneY);
      const isPlayerHighJumping = player.jumpOffset < -48;
      if (
        distX >= -15 &&
        distX <= this.config.attackRange + 14 &&
        distLane <= 36 &&
        !isPlayerHighJumping
      ) {
        player.takeDamage(this.damage, particles, audio);
      } else {
        audio.playMelee();
      }
    }
  }

  draw(ctx, cameraX) {
    const sx = this.x - cameraX;
    if (sx < -180 || sx > ctx.canvas.width + 180) return;

    const alpha = this.state === 'dead' ? Math.max(0, 1 - this.deadTimer / 2.2) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    const radiusX = this.isBoss ? 34 : 24;
    ctx.ellipse(sx, this.laneY, radiusX, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const scale = this.isBoss ? 1.95 : 1.65;
    this.animator.draw(ctx, sx, this.laneY, this.facingLeft, scale, this.flashTimer > 0);

    if (this.state !== 'dead') {
      const barW = this.isBoss ? 76 : 44;
      const barH = this.isBoss ? 7 : 5;
      const barX = Math.round(sx - barW / 2);
      const barY = Math.round(this.laneY - (this.isBoss ? 138 : 112));

      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = this.isBoss ? '#f72585' : '#ef476f';
      ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);

      if (this.isBoss) {
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffccd5';
        ctx.fillText(this.config.name, Math.round(sx), barY - 5);
      }
    }

    ctx.restore();
  }
}
