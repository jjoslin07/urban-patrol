import { FRAME_SIZE } from '../config/assets.js';

const imageCache = new Map();

export function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to load image:', src);
      resolve(null);
    };
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

export class Animator {
  constructor(basePath, animsConfig, frameSize = 128) {
    this.basePath = basePath;
    this.animsConfig = animsConfig;
    this.frameSize = frameSize;
    this.images = {};
    this.currentKey = 'idle';
    this.frameIndex = 0;
    this.timer = 0;
    this.finished = false;
    this.triggeredThisCycle = false;
  }

  async preload() {
    const promises = Object.entries(this.animsConfig).map(async ([key, cfg]) => {
      const fullPath = `${this.basePath}/${cfg.file}`;
      this.images[key] = await loadImage(fullPath);
    });
    await Promise.all(promises);
  }

  play(key, forceRestart = false) {
    if (!this.animsConfig[key]) return;
    if (this.currentKey !== key || forceRestart) {
      this.currentKey = key;
      this.frameIndex = 0;
      this.timer = 0;
      this.finished = false;
      this.triggeredThisCycle = false;
    }
  }

  update(dt, onTrigger) {
    const cfg = this.animsConfig[this.currentKey];
    if (!cfg || this.finished) return;

    const frameDuration = 1 / (cfg.fps || 10);
    this.timer += dt;

    while (this.timer >= frameDuration) {
      this.timer -= frameDuration;
      const nextFrame = this.frameIndex + 1;

      if (nextFrame >= cfg.frames) {
        if (cfg.loop) {
          this.frameIndex = 0;
          this.triggeredThisCycle = false;
        } else {
          this.frameIndex = cfg.frames - 1;
          this.finished = true;
          break;
        }
      } else {
        this.frameIndex = nextFrame;
      }
    }

    if (
      onTrigger &&
      cfg.triggerFrame !== undefined &&
      !this.triggeredThisCycle &&
      this.frameIndex >= cfg.triggerFrame
    ) {
      this.triggeredThisCycle = true;
      onTrigger(cfg);
    }
  }

  draw(ctx, x, y, facingLeft = false, scale = 1.65, flashWhite = false, yScale = 1) {
    const img = this.images[this.currentKey];
    if (!img) {
      // Fallback placeholder: a missing sprite must never render as an
      // invisible (but still active) entity.
      const drawW = this.frameSize * scale;
      const drawH = this.frameSize * scale * yScale;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      if (facingLeft) ctx.scale(-1, 1);
      ctx.fillStyle = 'rgba(255, 89, 94, 0.22)';
      ctx.strokeStyle = '#ff595e';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
      ctx.strokeRect(-drawW / 2, -drawH, drawW, drawH);
      ctx.setLineDash([]);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = '#ff595e';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MISSING SPRITE', Math.round(x), Math.round(y - drawH / 2));
      ctx.restore();
      return;
    }

    const drawW = this.frameSize * scale;
    const drawH = this.frameSize * scale * yScale; // yScale < 1 = crouch squash (feet stay planted)
    const sx = this.frameIndex * this.frameSize;
    const sy = 0;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (facingLeft) {
      ctx.scale(-1, 1);
    }
    if (flashWhite) {
      ctx.filter = 'brightness(2.6) contrast(1.2)';
    }

    // Character feet sit at the bottom of the 128x128 frame (y=0 in local space)
    ctx.drawImage(
      img,
      sx,
      sy,
      this.frameSize,
      this.frameSize,
      -drawW / 2,
      -drawH,
      drawW,
      drawH
    );
    ctx.restore();
  }
}
