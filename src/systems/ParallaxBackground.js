import { loadImage } from './SpriteSheet.js';

export class ParallaxBackground {
  constructor() {
    this.layers = [];
    this.time = 0;
  }

  async loadDistrict(districtConfig) {
    const loadedLayers = await Promise.all(
      districtConfig.layers.map(async (layerCfg) => {
        const img = await loadImage(layerCfg.src);
        return {
          ...layerCfg,
          img,
        };
      })
    );
    this.layers = loadedLayers.filter((l) => l.img !== null);
  }

  update(dt) {
    this.time += dt;
  }

  draw(ctx, cameraX, canvasWidth, canvasHeight) {
    // 1920x1080 native layers scaled to canvasHeight (540 -> 960x540 tile width)
    const tileW = canvasWidth;
    const tileH = canvasHeight;

    for (const layer of this.layers) {
      const autoOffset = layer.autoScroll ? this.time * layer.autoScroll : 0;
      const rawOffset = -(cameraX * layer.speed + autoOffset);
      let startX = rawOffset % tileW;
      if (startX > 0) startX -= tileW;

      for (let x = startX; x < canvasWidth; x += tileW) {
        ctx.drawImage(layer.img, Math.floor(x), 0, tileW + 1, tileH);
      }
    }
  }
}
