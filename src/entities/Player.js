import { CHARACTER_TIERS, TIER_ORDER, TIER_THRESHOLDS } from '../config/assets.js';
import { Animator } from '../systems/SpriteSheet.js';
import { Projectile } from './Projectile.js';

export class Player {
  constructor(x, laneY) {
    this.x = x;
    this.laneY = laneY;
    this.jumpOffset = 0;
    this.jumpVel = 0;
    this.isGrounded = true;
    this.facingLeft = false;

    this.animators = {};

    // Progression state: Police -> SWAT -> Soldier
    this.tierKey = 'police';
    this.variantIndex = 0;
    this.veteranRank = 0;
    this.damageMult = 1.0;

    this.totalGold = 0;
    this.upgradeGold = 0;
    this.upgradeTarget = TIER_THRESHOLDS[this.tierKey]; // Gold needed to promote out of the current rank

    this.config = CHARACTER_TIERS.police.variants[0];
    this.hp = this.config.maxHp;
    this.maxHp = this.config.maxHp;

    // Primary weapon ammo
    this.ammo = this.config.maxAmmo;
    this.maxAmmo = this.config.maxAmmo;
    this.reserveAmmo = this.config.startReserveAmmo || 30;
    this.maxReserveAmmo = this.config.maxReserveAmmo || 90;

    // Secondary weapon ammo
    this.secAmmo = this.config.maxSecAmmo || 6;
    this.maxSecAmmo = this.config.maxSecAmmo || 6;
    this.secReserveAmmo = this.config.startSecReserveAmmo || 18;
    this.maxSecReserveAmmo = this.config.maxSecReserveAmmo || 48;

    this.specialEnergy = 100;

    this.state = 'idle';
    this.invulnTimer = 0;
    this.flashTimer = 0;
    this.emptyClickTimer = 0;
    this.meleeArcTimer = 0;
    this.promotionBannerTimer = 0;
    this.promotionBannerText = '';
  }

  async preloadAllOfficers() {
    const promises = [];
    for (const tier of Object.values(CHARACTER_TIERS)) {
      for (const variant of tier.variants) {
        const anim = new Animator(variant.basePath, variant.anims, variant.frameSize || 128);
        this.animators[variant.id] = anim;
        promises.push(anim.preload());
      }
    }
    await Promise.all(promises);
  }

  get currentTier() {
    return CHARACTER_TIERS[this.tierKey];
  }

  get currentAnimator() {
    return this.animators[this.config.id];
  }

  get renderY() {
    return this.laneY + this.jumpOffset;
  }

  applyTierConfig(tierKey, variantIdx = 0, fullHeal = true) {
    const tier = CHARACTER_TIERS[tierKey];
    if (!tier) return;
    this.tierKey = tierKey;
    this.variantIndex = variantIdx % tier.variants.length;
    this.config = tier.variants[this.variantIndex];

    const prevRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = this.config.maxHp + this.veteranRank * 25;
    this.hp = fullHeal ? this.maxHp : Math.max(20, Math.round(this.maxHp * prevRatio));

    this.maxAmmo = this.config.maxAmmo;
    this.maxReserveAmmo = this.config.maxReserveAmmo || 100;
    this.maxSecAmmo = this.config.maxSecAmmo || 8;
    this.maxSecReserveAmmo = this.config.maxSecReserveAmmo || 48;

    if (fullHeal) {
      this.ammo = this.maxAmmo;
      this.reserveAmmo = this.config.startReserveAmmo || 36;
      this.secAmmo = this.maxSecAmmo;
      this.secReserveAmmo = this.config.startSecReserveAmmo || 20;
    } else {
      this.ammo = Math.min(this.ammo, this.maxAmmo);
      this.reserveAmmo = Math.min(this.reserveAmmo, this.maxReserveAmmo);
      this.secAmmo = Math.min(this.secAmmo, this.maxSecAmmo);
      this.secReserveAmmo = Math.min(this.secReserveAmmo, this.maxSecReserveAmmo);
    }

    this.specialEnergy = 100;
    this.state = 'idle';
    if (this.currentAnimator) {
      this.currentAnimator.play('idle', true);
    }
  }

  cycleVariant(particles, audio) {
    if (this.state === 'dead') return;
    const tier = this.currentTier;
    const nextIdx = (this.variantIndex + 1) % tier.variants.length;
    this.applyTierConfig(this.tierKey, nextIdx, false);
    if (particles) {
      particles.spawnHitSparks(this.x, this.laneY - 55, '#58a6ff', 12);
      particles.spawnFloatingText(this.x, this.laneY - 115, this.config.name, '#58a6ff');
    }
    if (audio) audio.playReload();
  }

  setTierDirectly(tierKey, particles, audio) {
    if (!CHARACTER_TIERS[tierKey] || this.state === 'dead') return;
    this.applyTierConfig(tierKey, 0, true);
    this.upgradeGold = 0;
    this.upgradeTarget = TIER_THRESHOLDS[tierKey];
    if (particles) {
      particles.spawnHitSparks(this.x, this.laneY - 60, '#ffd166', 18);
      particles.spawnFloatingText(this.x, this.laneY - 115, this.config.name, '#ffd166');
    }
    if (audio) audio.playLevelUp();
  }

  addGold(amount, particles, audio, onTierChanged) {
    this.totalGold += amount;
    this.upgradeGold += amount;

    if (audio) audio.playCoin();
    if (particles) {
      particles.spawnFloatingText(this.x, this.renderY - 105, `+$${amount}`, '#ffd166');
    }

    if (this.upgradeGold >= this.upgradeTarget) {
      this.upgradeGold -= this.upgradeTarget;

      const nextKey = TIER_ORDER[TIER_ORDER.indexOf(this.tierKey) + 1];
      if (nextKey) {
        this.upgradeTarget = TIER_THRESHOLDS[nextKey];
        this.applyTierConfig(nextKey, 0, true);
        if (nextKey === 'swat') {
          this.promotionBannerTimer = 3.2;
          this.promotionBannerText = 'PROMOTED TO TIER 2: METRO SWAT!';
        } else if (nextKey === 'soldier') {
          this.promotionBannerTimer = 3.2;
          this.promotionBannerText = 'PROMOTED TO TIER 3: ELITE SOLDIER!';
        } else if (nextKey === 'cyber') {
          this.promotionBannerTimer = 3.2;
          this.promotionBannerText = 'PROMOTED TO TIER 4: CYBER DIVISION!';
        } else if (nextKey === 'joe') {
          this.promotionBannerTimer = 3.6;
          this.promotionBannerText = '★ PROMOTED TO TIER 5: OFFICER JOE (3X DMG + INFINITE HP/AMMO)! ★';
        } else if (nextKey === 'special') {
          this.promotionBannerTimer = 3.6;
          this.promotionBannerText = '★ PROMOTED TO TIER 6: SPECIAL CHARACTERS! ★';
        }
      } else {
        // Final rank — extra gold grants legend rank bonuses
        const lastKey = TIER_ORDER[TIER_ORDER.length - 1];
        this.veteranRank += 1;
        this.damageMult += 0.15;
        this.upgradeTarget = TIER_THRESHOLDS[lastKey];
        this.applyTierConfig(lastKey, this.variantIndex, true);
        this.promotionBannerTimer = 2.8;
        this.promotionBannerText = `LEGEND RANK +${this.veteranRank}!`;
      }

      if (audio) audio.playLevelUp();
      if (particles) {
        particles.spawnHitSparks(this.x, this.laneY - 60, '#ffd166', 24);
        particles.spawnFloatingText(this.x, this.laneY - 130, '★ UNIT UPGRADED! ★', '#06d6a0');
      }
      if (onTierChanged) onTierChanged(this.tierKey);
    }
  }

  takeDamage(amount, particles, audio) {
    if (this.state === 'dead' || this.invulnTimer > 0) return;
    if (this.config.infiniteHealth) {
      this.hp = this.maxHp;
      this.invulnTimer = 0.35;
      if (particles) {
        particles.spawnHitSparks(this.x, this.renderY - 55, '#ffd166', 8);
        particles.spawnFloatingText(this.x, this.renderY - 95, 'INVINCIBLE!', '#ffd166');
      }
      return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = 0.65;
    this.flashTimer = 0.16;

    if (particles) {
      particles.spawnHitSparks(this.x, this.renderY - 55, '#ef476f', 10);
      particles.spawnFloatingText(this.x, this.renderY - 95, `-${amount}`, '#ef476f');
    }
    if (audio) audio.playHit();

    if (this.hp <= 0) {
      this.state = 'dead';
      this.currentAnimator.play('dead', true);
    } else {
      this.state = 'hurt';
      this.currentAnimator.play('hurt', true);
    }
  }

  heal(amount, particles, audio) {
    if (this.state === 'dead') return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const gained = this.hp - before;
    if (audio) audio.playHeal();
    if (particles) {
      particles.spawnHitSparks(this.x, this.renderY - 50, '#06d6a0', 10);
      particles.spawnFloatingText(
        this.x,
        this.renderY - 105,
        gained > 0 ? `+${gained} HP` : 'MAX HP!',
        '#06d6a0'
      );
    }
  }

  addAmmo(rounds, particles, audio) {
    if (this.state === 'dead') return;
    // Refill Primary Magazine + Reserve
    const magNeeded = this.maxAmmo - this.ammo;
    const toMag = Math.min(magNeeded, rounds);
    this.ammo += toMag;
    this.reserveAmmo = Math.min(this.maxReserveAmmo, this.reserveAmmo + (rounds - toMag));

    // Also add Secondary Ammo rounds (~50% of pack value)
    const secGain = Math.max(3, Math.ceil(rounds * 0.5));
    const secMagNeeded = this.maxSecAmmo - this.secAmmo;
    const toSecMag = Math.min(secMagNeeded, secGain);
    this.secAmmo += toSecMag;
    this.secReserveAmmo = Math.min(
      this.maxSecReserveAmmo,
      this.secReserveAmmo + (secGain - toSecMag)
    );

    if (audio) audio.playReload();
    if (particles) {
      particles.spawnHitSparks(this.x, this.renderY - 52, '#38bdf8', 10);
      particles.spawnFloatingText(
        this.x,
        this.renderY - 105,
        `+${rounds} PRI / +${secGain} SEC AMMO`,
        '#38bdf8'
      );
    }
  }

  finishReload(particles) {
    const priNeeded = this.maxAmmo - this.ammo;
    const priTransfer = Math.min(priNeeded, this.reserveAmmo);
    this.ammo += priTransfer;
    this.reserveAmmo -= priTransfer;

    const secNeeded = this.maxSecAmmo - this.secAmmo;
    const secTransfer = Math.min(secNeeded, this.secReserveAmmo);
    this.secAmmo += secTransfer;
    this.secReserveAmmo -= secTransfer;

    if (particles && (priTransfer > 0 || secTransfer > 0)) {
      particles.spawnFloatingText(this.x, this.renderY - 105, 'WEAPONS RELOADED', '#58a6ff');
    }
  }

  update(dt, input, bounds, worldContext) {
    const { projectiles, enemies, particles, audio } = worldContext;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.emptyClickTimer > 0) this.emptyClickTimer -= dt;
    if (this.meleeArcTimer > 0) this.meleeArcTimer -= dt;
    if (this.promotionBannerTimer > 0) this.promotionBannerTimer -= dt;
    this.specialEnergy = Math.min(100, this.specialEnergy + dt * 18);

    if (this.config.infiniteHealth) {
      this.hp = this.maxHp;
    }
    if (this.config.infiniteAmmo) {
      this.ammo = this.maxAmmo;
      this.secAmmo = this.maxSecAmmo;
      this.specialEnergy = 100;
    }

    const anim = this.currentAnimator;
    if (!anim) return;

    // Cycle skin variant within current tier with V
    if (input.wasPressed('KeyV')) {
      this.cycleVariant(particles, audio);
    }

    if (this.state === 'dead') {
      anim.update(dt);
      return;
    }

    // Apply jump physics
    if (!this.isGrounded) {
      this.jumpVel += 1250 * dt;
      this.jumpOffset += this.jumpVel * dt;
      if (this.jumpOffset >= 0) {
        this.jumpOffset = 0;
        this.jumpVel = 0;
        this.isGrounded = true;
        if (this.state === 'jump') {
          this.state = 'idle';
          anim.play('idle');
        }
      }
    }

    const lockedStates = ['primary', 'secondary', 'melee', 'grenade', 'recharge', 'hurt'];
    if (lockedStates.includes(this.state)) {
      if (this.state === 'primary' || this.state === 'secondary') {
        if (input.isDown('KeyA', 'ArrowLeft')) this.facingLeft = true;
        if (input.isDown('KeyD', 'ArrowRight')) this.facingLeft = false;
      }

      anim.update(dt, (cfg) => {
        this.executeAttackTrigger(cfg, projectiles, enemies, particles, audio, bounds);
      });

      if (anim.finished) {
        if (this.state === 'recharge') {
          this.finishReload(particles);
        }
        // Continuous rapid fire for Primary (Hold J / Left-Click)
        if (this.state === 'primary' && input.isDown('KeyJ', 'MouseLeft')) {
          if (this.ammo > 0) {
            anim.play('primary', true);
            return;
          } else if (this.reserveAmmo > 0) {
            this.state = 'recharge';
            anim.play('recharge', true);
            audio.playReload();
            return;
          }
        }
        // Continuous fire for Secondary (Hold K / Right-Click)
        if (this.state === 'secondary' && input.isDown('KeyK', 'MouseRight')) {
          if (this.secAmmo > 0) {
            anim.play('secondary', true);
            return;
          } else if (this.secReserveAmmo > 0) {
            this.state = 'recharge';
            anim.play('recharge', true);
            audio.playReload();
            return;
          }
        }
        this.state = this.isGrounded ? 'idle' : 'jump';
        anim.play(this.state, true);
      }
      return;
    }

    // Reload both weapons (R)
    const needsPriReload = this.ammo < this.maxAmmo && this.reserveAmmo > 0;
    const needsSecReload = this.secAmmo < this.maxSecAmmo && this.secReserveAmmo > 0;
    if (input.wasPressed('KeyR') && this.isGrounded) {
      if (needsPriReload || needsSecReload) {
        this.state = 'recharge';
        anim.play('recharge', true);
        audio.playReload();
        return;
      } else if (this.ammo < this.maxAmmo || this.secAmmo < this.maxSecAmmo) {
        particles.spawnFloatingText(this.x, this.renderY - 105, 'NO RESERVE AMMO!', '#ff6b6b');
      }
    }

    // Punch / Kick / Melee Strike (F, E, or L key — costs 0 ammo!)
    if (input.wasPressed('KeyF', 'KeyE', 'KeyL')) {
      this.state = 'melee';
      anim.play('melee', true);
      return;
    }

    // Throw Grenade (Middle Mouse Click or G key)
    if (input.wasPressed('MouseMiddle', 'KeyG')) {
      if (this.specialEnergy >= 30) {
        this.specialEnergy -= 30;
        this.state = 'grenade';
        anim.play('grenade', true);
        return;
      } else {
        particles.spawnFloatingText(this.x, this.renderY - 100, 'GRENADE RECHARGING', '#ffd166');
      }
    }

    // Fire Secondary Weapon (Right-Click or K) — uses Secondary Ammo Meter!
    if (input.isDown('KeyK', 'MouseRight')) {
      if (this.secAmmo <= 0) {
        if (this.secReserveAmmo > 0) {
          this.state = 'recharge';
          anim.play('recharge', true);
          audio.playReload();
        } else if (this.emptyClickTimer <= 0) {
          this.emptyClickTimer = 0.55;
          particles.spawnFloatingText(
            this.x,
            this.renderY - 105,
            'SECONDARY OUT OF AMMO! USE [F] MELEE OR [L-CLICK]',
            '#ff9f1c'
          );
        }
        return;
      }
      this.state = 'secondary';
      anim.play('secondary', true);
      return;
    }

    // Fire Primary Weapon (Left-Click or J) — uses Primary Ammo Meter!
    if (input.isDown('KeyJ', 'MouseLeft')) {
      if (this.ammo <= 0) {
        if (this.reserveAmmo > 0) {
          this.state = 'recharge';
          anim.play('recharge', true);
          audio.playReload();
        } else if (this.emptyClickTimer <= 0) {
          this.emptyClickTimer = 0.55;
          particles.spawnFloatingText(
            this.x,
            this.renderY - 105,
            'PRIMARY OUT OF AMMO! USE [F] MELEE OR [R-CLICK]',
            '#ff6b6b'
          );
        }
        return;
      }
      this.state = 'primary';
      anim.play('primary', true);
      return;
    }

    // Jump (Space)
    if (input.wasPressed('Space') && this.isGrounded) {
      this.isGrounded = false;
      this.jumpVel = -470;
      this.state = 'jump';
      anim.play('jump', true);
    }

    // Movement
    let dx = 0;
    let dy = 0;
    if (input.isDown('KeyA', 'ArrowLeft')) dx -= 1;
    if (input.isDown('KeyD', 'ArrowRight')) dx += 1;
    if (input.isDown('KeyW', 'ArrowUp')) dy -= 1;
    if (input.isDown('KeyS', 'ArrowDown')) dy += 1;

    if (dx < 0) this.facingLeft = true;
    if (dx > 0) this.facingLeft = false;

    const isRunning = input.isDown('ShiftLeft', 'ShiftRight') && dx !== 0;
    const moveSpeed = isRunning ? this.config.runSpeed : this.config.speed;

    this.x += dx * moveSpeed * dt;
    this.laneY += dy * (moveSpeed * 0.58) * dt;

    this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x));
    this.laneY = Math.max(bounds.topY, Math.min(bounds.bottomY, this.laneY));

    if (this.isGrounded) {
      if (dx !== 0 || dy !== 0) {
        this.state = isRunning ? 'run' : 'walk';
        anim.play(this.state);
      } else {
        this.state = 'idle';
        anim.play('idle');
      }
    }

    anim.update(dt);
  }

  executeAttackTrigger(cfg, projectiles, enemies, particles, audio, bounds) {
    const dir = this.facingLeft ? -1 : 1;
    const muzzleX = this.x + dir * 48;
    const muzzleY = this.renderY - 62;
    const scaledDamage = Math.round(cfg.damage * this.damageMult);
    const isSecondaryState = this.state === 'secondary';

    const consumeActiveAmmo = () => {
      if (this.config.infiniteAmmo) {
        this.ammo = this.maxAmmo;
        this.secAmmo = this.maxSecAmmo;
        return;
      }
      if (isSecondaryState) {
        this.secAmmo = Math.max(0, this.secAmmo - 1);
      } else {
        this.ammo = Math.max(0, this.ammo - 1);
      }
    };

    if (cfg.type === 'pistol' || cfg.type === 'magnum') {
      consumeActiveAmmo();
      audio.playShot(cfg.type);
      particles.spawnShellCasing(this.x, muzzleY, this.facingLeft);
      particles.spawnHitSparks(muzzleX, muzzleY, '#ffd166', 5);
      projectiles.push(
        new Projectile({
          x: muzzleX,
          y: muzzleY,
          laneY: this.laneY,
          vx: dir * 780,
          damage: scaledDamage,
          fromPlayer: true,
          color: cfg.type === 'magnum' ? '#ff9f1c' : '#ffd166',
        })
      );
    } else if (cfg.type === 'carbine' || cfg.type === 'assault') {
      consumeActiveAmmo();
      audio.playShot('assault');
      particles.spawnShellCasing(this.x, muzzleY, this.facingLeft);
      particles.spawnHitSparks(muzzleX, muzzleY, '#00f5d4', 7);
      const offsets = cfg.type === 'assault' ? [-8, 0, 8] : [-5, 5];
      for (const off of offsets) {
        projectiles.push(
          new Projectile({
            x: muzzleX - Math.abs(off) * 2,
            y: muzzleY + off * 0.4,
            laneY: this.laneY,
            vx: dir * 860,
            vy: off * 3,
            damage: Math.round(scaledDamage / offsets.length),
            fromPlayer: true,
            color: cfg.type === 'assault' ? '#00f5d4' : '#58a6ff',
            maxDist: 740,
          })
        );
      }
    } else if (cfg.type === 'shotgun') {
      consumeActiveAmmo();
      audio.playShot('shotgun');
      particles.spawnShellCasing(this.x, muzzleY, this.facingLeft);
      particles.spawnHitSparks(muzzleX, muzzleY, '#ff9f1c', 12);
      const spreads = [-55, -25, 0, 25, 55];
      for (const vy of spreads) {
        projectiles.push(
          new Projectile({
            x: muzzleX,
            y: muzzleY,
            laneY: this.laneY,
            vx: dir * 700,
            vy,
            damage: Math.round(scaledDamage / 2.1),
            fromPlayer: true,
            color: '#ff9f1c',
            maxDist: 380,
          })
        );
      }
    } else if (cfg.type === 'taser') {
      consumeActiveAmmo();
      audio.playTaser();
      particles.spawnHitSparks(muzzleX + dir * 45, muzzleY, '#00f5d4', 14);
      const range = cfg.range || 185;
      for (const enemy of enemies) {
        if (enemy.state === 'dead') continue;
        const distX = (enemy.x - this.x) * dir;
        const distLane = Math.abs(enemy.laneY - this.laneY);
        if (distX >= -18 && distX <= range && distLane <= 42) {
          enemy.takeDamage(scaledDamage, dir * 20, particles, audio);
          particles.spawnHitSparks(enemy.x, enemy.laneY - 58, '#00f5d4', 12);
        }
      }
    } else if (cfg.type === 'grenade') {
      audio.playMelee();
      projectiles.push(
        new Projectile({
          x: muzzleX,
          y: muzzleY - 12,
          laneY: this.laneY,
          vx: dir * 380,
          vy: -240,
          damage: scaledDamage,
          fromPlayer: true,
          isGrenade: true,
          maxDist: 500,
        })
      );
    } else if (cfg.type === 'melee') {
      // Punch / Kick / Baton Close-Quarters Strike (uses 0 ammo!)
      audio.playMelee();
      this.meleeArcTimer = 0.16;
      if (bounds) {
        this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x + dir * 14));
      }
      particles.spawnHitSparks(this.x + dir * 46, this.renderY - 56, '#ffffff', 7);
      const range = cfg.range || 96;
      for (const enemy of enemies) {
        if (enemy.state === 'dead') continue;
        const distX = (enemy.x - this.x) * dir;
        const distLane = Math.abs(enemy.laneY - this.laneY);
        if (distX >= -20 && distX <= range && distLane <= 44) {
          enemy.takeDamage(scaledDamage, dir * 32, particles, audio);
        }
      }
    }
  }

  draw(ctx, cameraX) {
    if (this.config.infiniteHealth) {
      this.hp = this.maxHp;
    }
    if (this.config.infiniteAmmo) {
      this.ammo = this.maxAmmo;
      this.secAmmo = this.maxSecAmmo;
      this.specialEnergy = 100;
    }

    const anim = this.currentAnimator;
    if (!anim) return;

    const sx = this.x - cameraX;

    // Ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    const shadowScale = Math.max(0.5, 1 + this.jumpOffset / 220);
    ctx.ellipse(sx, this.laneY, 26 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    anim.draw(ctx, sx, this.renderY, this.facingLeft, this.config.renderScale || 1.65, this.flashTimer > 0);

    // Draw crisp Punch / Kick shockwave arc during melee strike!
    if (this.meleeArcTimer > 0) {
      const dir = this.facingLeft ? -1 : 1;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const arcX = sx + dir * 32;
      const arcY = this.renderY - 56;
      const startAngle = this.facingLeft ? Math.PI * 0.65 : -Math.PI * 0.35;
      const endAngle = this.facingLeft ? Math.PI * 1.35 : Math.PI * 0.35;
      ctx.arc(arcX, arcY, 34, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
    }
  }
}
