export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.justPressed = new Set();

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
      if (!this.keys.has(code)) {
        this.justPressed.add(code);
      }
      this.keys.add(code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.justPressed.clear();
    });

    if (canvas) {
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.justPressed.add('MouseLeft');
          this.keys.add('MouseLeft');
        } else if (e.button === 1) {
          e.preventDefault();
          this.justPressed.add('MouseMiddle');
          this.keys.add('MouseMiddle');
        } else if (e.button === 2) {
          this.justPressed.add('MouseRight');
          this.keys.add('MouseRight');
        }
      });
      canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.keys.delete('MouseLeft');
        if (e.button === 1) this.keys.delete('MouseMiddle');
        if (e.button === 2) this.keys.delete('MouseRight');
      });
      canvas.addEventListener('auxclick', (e) => {
        if (e.button === 1) e.preventDefault();
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  wasPressed(...codes) {
    return codes.some((c) => this.justPressed.has(c));
  }

  endFrame() {
    this.justPressed.clear();
  }
}
