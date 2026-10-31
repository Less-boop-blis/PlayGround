/* ============================================================
   SAPO SALVAJE — núcleo: mundo, física, entidades y partículas
   ============================================================ */
(function () {
  'use strict';

  const TILE = 48;
  const VW = 960;
  const VH = 576;
  const ROWS = 12;
  const GRAV = 2350;
  const SOLIDS = new Set(['#', 'B', '?', '!', '=', 'P']);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (v, target, delta) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));
  const rand = (a, b) => a + Math.random() * (b - a);

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  /* ============================================================
     MUNDO
     ============================================================ */
  class World {
    constructor(def) {
      this.def = def;
      this.cols = def.width;
      this.rows = def.height || ROWS;
      this.grid = def.grid;
      this.pixelW = def.width * TILE;
      this.pixelH = this.rows * TILE;
      this.theme = def.theme;
    }
    at(cx, cy) {
      if (cy < 0 || cy >= this.rows) return '.';
      if (cx < 0 || cx >= this.cols) return '#';
      return this.grid[cy][cx];
    }
    isSolid(cx, cy) { return SOLIDS.has(this.at(cx, cy)); }
    isStandable(cx, cy) {
      const ch = this.at(cx, cy);
      return SOLIDS.has(ch) || ch === '-';
    }
    isWater(cx, cy) { return this.at(cx, cy) === '~'; }
    solidAtPx(px, py) { return this.isSolid(Math.floor(px / TILE), Math.floor(py / TILE)); }
    standableAtPx(px, py) { return this.isStandable(Math.floor(px / TILE), Math.floor(py / TILE)); }
  }

  /* ============================================================
     PLATAFORMAS MÓVILES
     ============================================================ */
  class Mover {
    constructor(def) {
      this.x0 = def.x;
      this.y0 = def.y;
      this.w = def.w;
      this.h = def.h || 18;
      this.axis = def.axis;
      this.dist = def.dist;
      this.rate = def.rate || 0.8;
      this.t = Math.random() * 0.9;
      this.x = this.x0;
      this.y = this.y0;
      this.dx = 0;
      this.dy = 0;
    }
    update(dt) {
      const px = this.x, py = this.y;
      this.t += dt * this.rate;
      const off = (Math.sin(this.t) + 1) * 0.5 * this.dist;
      if (this.axis === 'x') { this.x = this.x0 + off; this.y = this.y0; }
      else { this.x = this.x0; this.y = this.y0 - off; }
      this.dx = this.x - px;
      this.dy = this.y - py;
    }
  }

  /* ============================================================
     ENTIDADES
     ============================================================ */
  class Coin {
    constructor(x, y) {
      this.x = x; this.y = y; this.baseY = y;
      this.t = Math.random() * Math.PI * 2;
      this.pulled = false;
      this.gone = false;
    }
    update(dt) {
      this.t += dt;
      if (!this.pulled) this.y = this.baseY + Math.sin(this.t * 2.4) * 4;
    }
  }

  class Heart {
    constructor(x, y) {
      this.x = x; this.y = y; this.baseY = y;
      this.t = Math.random() * 6.28;
      this.gone = false;
    }
    update(dt) {
      this.t += dt;
      this.y = this.baseY + Math.sin(this.t * 2) * 5;
    }
  }

  class Checkpoint {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.active = false;
      this.t = 0;
    }
    update(dt) { this.t += dt; }
  }

  class Snail {
    constructor(x, y) {
      this.type = 'snail';
      this.w = 44; this.h = 32;
      this.x = x; this.y = y - this.h / 2;
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.speed = 54;
      this.t = Math.random() * 6;
      this.dead = false;
      this.deadT = 0;
      this.stompable = true;
      this.baseY = this.y;
    }
    update(dt, world) {
      this.t += dt;
      if (this.dead) { this.deadT += dt; return; }
      const probeX = this.x + this.dir * (this.w / 2 + 3);
      const groundY = this.y + this.h / 2 + 6;
      const wallY = this.y;
      const floor = world.standableAtPx(probeX, groundY);
      const wall = world.solidAtPx(probeX, wallY);
      if (!floor || wall) {
        this.dir *= -1;
      } else {
        this.x += this.dir * this.speed * dt;
      }
      this.y = this.baseY;
    }
    get box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  }

  class Fly {
    constructor(x, y, range) {
      this.type = 'fly';
      this.w = 34; this.h = 28;
      this.x = x; this.y = y;
      this.ox = x; this.oy = y;
      this.range = range || 96;
      this.t = Math.random() * 6.28;
      this.speed = 0.9;
      this.dir = 1;
      this.dead = false;
      this.deadT = 0;
      this.stompable = true;
    }
    update(dt) {
      this.t += dt;
      if (this.dead) { this.deadT += dt; this.y += 520 * dt; return; }
      const s = Math.sin(this.t * this.speed);
      this.x = this.ox + s * this.range;
      this.y = this.oy + Math.sin(this.t * this.speed * 2.3 + 1) * 22;
      this.dir = Math.cos(this.t * this.speed) >= 0 ? 1 : -1;
    }
    get box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  }

  class Urchin {
    constructor(x, y) {
      this.type = 'urchin';
      this.w = 40; this.h = 40;
      this.x = x; this.y = y - this.h / 2;
      this.t = Math.random() * 6.28;
      this.dead = false;
      this.deadT = 0;
      this.stompable = false;
      this.baseY = this.y;
    }
    update(dt) {
      this.t += dt;
      if (this.dead) { this.deadT += dt; return; }
      this.y = this.baseY + Math.sin(this.t * 2) * 4;
    }
    get box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  }

  /* ============================================================
     JUGADOR (el hombre sapo)
     ============================================================ */
  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.w = 34;
      this.h = 46;
      this.vx = 0;
      this.vy = 0;
      this.dir = 1;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuf = 0;
      this.airJumps = 1;
      this.tongue = 0;
      this.tongueCd = 0;
      this.tongueLen = 0;
      this.invuln = 0;
      this.dead = false;
      this.riding = null;
      this.t = 0;
      this.runT = 0;
      this.stretchX = 1;
      this.stretchY = 1;
      this.rot = 0;
      this.blinkT = 2 + Math.random() * 2;
      this.blinking = 0;
    }

    queueJump() { this.jumpBuf = 0.14; }

    attack(game) {
      if (this.dead || this.tongueCd > 0) return;
      this.tongue = 0.27;
      this.tongueCd = 0.45;
      this.tongueLen = 0;
      window.SapoAudio.tongue();
      game.fx.burst(this.x + this.dir * 22, this.y - this.h * 0.62, '#ff9b8a', 4, 90, { grav: 60 });
    }

    jump(power, double) {
      this.vy = -power;
      this.onGround = false;
      this.coyote = 0;
      this.riding = null;
      this.stretchX = 0.85;
      this.stretchY = 1.2;
      if (double) {
        window.SapoAudio.doubleJump();
        this.airJumps = 0;
      } else {
        window.SapoAudio.jump();
      }
    }

    update(dt, input, world, movers, game) {
      this.t += dt;
      this.tongueCd = Math.max(0, this.tongueCd - dt);
      if (this.tongue > 0) {
        this.tongue -= dt;
        const p = 1 - Math.max(0, this.tongue) / 0.27;
        this.tongueLen = Math.sin(clamp(p, 0, 1) * Math.PI) * 118;
        if (this.tongue <= 0) { this.tongue = 0; this.tongueLen = 0; }
      }
      if (this.invuln > 0) this.invuln -= dt;
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blinking = 0.12; this.blinkT = 2.2 + Math.random() * 3; }
      if (this.blinking > 0) this.blinking -= dt;

      this.stretchX = approach(this.stretchX, 1, 4.5 * dt);
      this.stretchY = approach(this.stretchY, 1, 4.5 * dt);
      this.rot = approach(this.rot, 0, 10 * dt);

      const wasGround = this.onGround;
      const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const accel = this.onGround ? 3000 : 2100;
      const maxSpd = 312;
      if (move !== 0) {
        this.vx = approach(this.vx, move * maxSpd, accel * dt);
        this.dir = move;
      } else {
        this.vx = approach(this.vx, 0, (this.onGround ? 3600 : 1500) * dt);
      }
      if (this.onGround) this.runT += dt * Math.min(1, Math.abs(this.vx) / maxSpd);

      this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
      this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      if (this.jumpBuf > 0) {
        if (this.onGround || this.coyote > 0) {
          this.jumpBuf = 0;
          this.airJumps = 1;
          this.jump(840, false);
          game.fx.dust(this.x, this.y, this.dir, 6);
        } else if (this.airJumps > 0) {
          this.jumpBuf = 0;
          this.airJumps--;
          this.jump(760, true);
          game.fx.ring(this.x, this.y - this.h * 0.4, '#caff9a', 30);
        }
      }

      let g = GRAV;
      if (this.vy < 0 && !input.jump) g *= 1.85;
      if (this.vy > 0) g *= 1.06;
      this.vy = Math.min(this.vy + g * dt, 1150);

      // arrastre de plataformas móviles
      if (this.riding) {
        this.x += this.riding.dx;
        this.y += this.riding.dy;
        this.riding = null;
      }

      const half = this.w / 2;

      // ---- horizontal ----
      this.x += this.vx * dt;
      const top = this.y - this.h;
      const bottom = this.y - 1;
      if (this.vx > 0) {
        const c = Math.floor((this.x + half) / TILE);
        for (let r = Math.floor(top / TILE); r <= Math.floor(bottom / TILE); r++) {
          if (world.isSolid(c, r)) { this.x = c * TILE - half - 0.01; this.vx = 0; break; }
        }
      } else if (this.vx < 0) {
        const c = Math.floor((this.x - half) / TILE);
        for (let r = Math.floor(top / TILE); r <= Math.floor(bottom / TILE); r++) {
          if (world.isSolid(c, r)) { this.x = c * TILE + TILE + half + 0.01; this.vx = 0; break; }
        }
      }
      this.x = clamp(this.x, half + 2, world.pixelW - half - 2);

      // ---- vertical ----
      const prevFeet = this.y;
      this.prevFeet = prevFeet;
      this.y += this.vy * dt;
      this.onGround = false;

      if (this.vy >= 0) {
        const r = Math.floor(this.y / TILE);
        const c0 = Math.floor((this.x - half + 3) / TILE);
        const c1 = Math.floor((this.x + half - 3) / TILE);
        for (let c = c0; c <= c1; c++) {
          const ch = world.at(c, r);
          const oneWay = ch === '-';
          if (SOLIDS.has(ch) || (oneWay && prevFeet <= r * TILE + 6)) {
            this.y = r * TILE;
            this.vy = 0;
            this.onGround = true;
            break;
          }
        }
        if (!this.onGround) {
          for (const m of movers) {
            if (this.x + half - 4 > m.x && this.x - half + 4 < m.x + m.w &&
                prevFeet <= m.y + 8 && this.y >= m.y) {
              this.y = m.y;
              this.vy = 0;
              this.onGround = true;
              this.riding = m;
              break;
            }
          }
        }
      } else {
        const r = Math.floor((this.y - this.h) / TILE);
        const c0 = Math.floor((this.x - half + 3) / TILE);
        const c1 = Math.floor((this.x + half - 3) / TILE);
        for (let c = c0; c <= c1; c++) {
          const ch = world.at(c, r);
          if (SOLIDS.has(ch)) {
            this.y = (r + 1) * TILE + this.h;
            this.vy = 0;
            if (ch === '?') game.hitBlock(c, r);
            else if (ch === 'B' || ch === '=' || ch === 'P' || ch === '#') game.bumpBlock(c, r);
            break;
          }
        }
      }

      if (!wasGround && this.onGround && this.vy === 0) {
        this.stretchX = 1.18;
        this.stretchY = 0.82;
        game.fx.dust(this.x, this.y, 0, 5);
      }

      // ---- peligros ----
      if (this.y > 10 * TILE + 8) {
        this.die(game, 'water');
        return;
      }
      const hb = this.getBox();
      const sc0 = Math.floor((hb.x + 4) / TILE), sc1 = Math.floor((hb.x + hb.w - 4) / TILE);
      const sr0 = Math.floor((hb.y + 6) / TILE), sr1 = Math.floor((hb.y + hb.h - 2) / TILE);
      for (let r = sr0; r <= sr1; r++) {
        for (let c = sc0; c <= sc1; c++) {
          if (world.at(c, r) === '^') {
            this.die(game, 'spikes');
            return;
          }
        }
      }
    }

    die(game, cause) {
      if (this.dead || this.invuln > 0) return;
      this.dead = true;
      this.vy = -680;
      this.vx = 0;
      this.rot = 0;
      game.onPlayerDeath(cause);
    }

    getBox() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

    tongueBox() {
      if (this.tongue <= 0) return null;
      const len = this.tongueLen;
      const my = this.y - this.h * 0.62;
      return {
        x: this.dir > 0 ? this.x + 8 : this.x - 8 - len,
        y: my - 14,
        w: len,
        h: 28,
        mouthY: my,
        len
      };
    }

    animateDeath(dt) {
      this.rot += dt * 7.5;
      this.vy += 1900 * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
    }
  }

  /* ============================================================
     PARTÍCULAS Y TEXTO FLOTANTE
     ============================================================ */
  class FX {
    constructor() { this.items = []; }

    add(p) {
      if (this.items.length > 520) this.items.shift();
      this.items.push(p);
    }

    dust(x, y, dir = 0, n = 4) {
      for (let i = 0; i < n; i++) {
        this.add({
          kind: 'dot', x: x + rand(-12, 12), y: y - rand(0, 6),
          vx: rand(-40, 40) + dir * 60, vy: rand(-120, -30),
          life: rand(0.25, 0.5), max: 0.5, size: rand(2.5, 6),
          color: 'rgba(220,240,190,0.75)', grav: 320, add: false
        });
      }
    }

    burst(x, y, color, n = 10, speed = 220, opts = {}) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = speed * rand(0.3, 1);
        this.add({
          kind: 'dot', x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0),
          life: rand(0.3, 0.7), max: 0.7, size: rand(2, 5.5),
          color, grav: opts.grav == null ? 500 : opts.grav, add: true
        });
      }
    }

    splash(x, y) {
      for (let i = 0; i < 16; i++) {
        this.add({
          kind: 'dot', x: x + rand(-18, 18), y,
          vx: rand(-130, 130), vy: rand(-420, -160),
          life: rand(0.4, 0.8), max: 0.8, size: rand(2.5, 6),
          color: i % 3 === 0 ? '#d8fff2' : 'rgba(120,235,210,0.9)',
          grav: 900, add: true
        });
      }
      this.ring(x, y, '#8ff5dd', 22);
    }

    ring(x, y, color, size = 26) {
      this.add({ kind: 'ring', x, y, life: 0.4, max: 0.4, size, color });
    }

    text(x, y, str, color = '#ffe27a') {
      this.add({ kind: 'text', x, y, str, life: 0.9, max: 0.9, color });
    }

    confetti(x, y, n = 26) {
      const colors = ['#ffe27a', '#a4ef68', '#ff8c78', '#7fe5ff', '#ff9edb'];
      for (let i = 0; i < n; i++) {
        this.add({
          kind: 'confetti', x: x + rand(-20, 20), y: y + rand(-10, 10),
          vx: rand(-260, 260), vy: rand(-620, -220),
          life: rand(0.9, 1.6), max: 1.6, size: rand(4, 8),
          color: colors[i % colors.length], rot: rand(0, 6.28), vr: rand(-9, 9), grav: 780
        });
      }
    }

    update(dt) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.life -= dt;
        if (p.life <= 0) { this.items.splice(i, 1); continue; }
        if (p.kind === 'ring') { p.size += 190 * dt; }
        else if (p.kind === 'text') { p.y -= 42 * dt; }
        else {
          p.vy += (p.grav || 0) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.kind === 'confetti') p.rot += p.vr * dt;
        }
      }
    }

    draw(ctx, camX) {
      for (const p of this.items) {
        const a = clamp(p.life / p.max, 0, 1);
        ctx.save();
        if (p.kind === 'dot') {
          ctx.globalAlpha = a;
          if (p.add) ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x - camX, p.y, p.size * (0.4 + a * 0.6), 0, 6.2832);
          ctx.fill();
        } else if (p.kind === 'ring') {
          ctx.globalAlpha = a * 0.85;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x - camX, p.y, p.size, 0, 6.2832);
          ctx.stroke();
        } else if (p.kind === 'text') {
          ctx.globalAlpha = Math.min(1, a * 1.6);
          ctx.font = '900 18px "Trebuchet MS", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(6,30,20,0.8)';
          ctx.strokeText(p.str, p.x - camX, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.str, p.x - camX, p.y);
        } else if (p.kind === 'confetti') {
          ctx.globalAlpha = a;
          ctx.translate(p.x - camX, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        }
        ctx.restore();
      }
    }

    clear() { this.items.length = 0; }
  }

  window.SAPO = window.SAPO || {};
  Object.assign(window.SAPO, {
    TILE, VW, VH, ROWS, SOLIDS, clamp, lerp, approach, rand, hash,
    World, Mover, Coin, Heart, Checkpoint, Snail, Fly, Urchin, Player, FX
  });
})();
