/* ============================================================
   SAPO SALVAJE — render del mundo (fondo, agua, tiles, meta)
   ============================================================ */
(function () {
  'use strict';
  const S = window.SAPO;
  const { TILE, VW, VH, clamp, hash } = S;
  const R = (S.render = S.render || {});
  const TAU = Math.PI * 2;

  const mod = (n, m) => ((n % m) + m) % m;

  /* sprites cacheados: los degradados radiales son caros en CPU */
  const spriteCache = new Map();
  function cachedSprite(key, w, h, draw) {
    let c = spriteCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      spriteCache.set(key, c);
    }
    return c;
  }
  function sunSprite(theme) {
    return cachedSprite('sun:' + theme.name, 560, 560, (g) => {
      const rg = g.createRadialGradient(280, 280, 8, 280, 280, 280);
      rg.addColorStop(0, theme.sunGlow);
      rg.addColorStop(0.35, theme.sunGlow.replace(/[\d.]+\)$/, '0.12)'));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 560, 560);
    });
  }
  function mistSprite(theme) {
    return cachedSprite('mist:' + theme.name, 600, 360, (g) => {
      const rg = g.createRadialGradient(300, 180, 10, 300, 180, 300);
      rg.addColorStop(0, theme.mist);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 600, 360);
    });
  }
  function moteSprite() {
    return cachedSprite('mote', 64, 64, (g) => {
      const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(255,252,226,0.95)');
      rg.addColorStop(0.18, 'rgba(255,238,170,0.65)');
      rg.addColorStop(0.55, 'rgba(255,220,120,0.16)');
      rg.addColorStop(1, 'rgba(255,200,60,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 64, 64);
    });
  }

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  R.rr = rr;
  R.mod = mod;

  /* ---------------- FONDO ---------------- */
  function hillLayer(ctx, camX, factor, baseY, amp, color, freq, phase) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VH);
    for (let x = 0; x <= VW + 24; x += 18) {
      const wx = (x + camX * factor) * 0.001;
      const y = baseY + Math.sin(wx * freq + phase) * amp + Math.sin(wx * freq * 2.7 + phase * 2.1) * amp * 0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VW + 24, VH);
    ctx.closePath();
    ctx.fill();
  }

  function tree(ctx, x, baseY, h, w, theme, sway, seed) {
    ctx.fillStyle = theme.tree;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.09, baseY);
    ctx.quadraticCurveTo(x - w * 0.15 + sway, baseY - h * 0.52, x - w * 0.035, baseY - h);
    ctx.lineTo(x + w * 0.07, baseY - h);
    ctx.quadraticCurveTo(x + w * 0.1 + sway * 0.6, baseY - h * 0.5, x + w * 0.13, baseY);
    ctx.closePath();
    ctx.fill();
    // raíces
    ctx.beginPath();
    ctx.moveTo(x - w * 0.09, baseY);
    ctx.quadraticCurveTo(x - w * 0.4, baseY + 14, x - w * 0.55, baseY + 22);
    ctx.lineTo(x - w * 0.5, baseY + 26);
    ctx.quadraticCurveTo(x - w * 0.2, baseY + 8, x + w * 0.13, baseY);
    ctx.closePath();
    ctx.fill();
    // copa
    const cy = baseY - h;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + seed * 2;
      const ex = x + Math.cos(a) * w * 0.72 + sway * 0.8;
      const ey = cy - 6 + Math.sin(a) * h * 0.11;
      ctx.beginPath();
      ctx.ellipse(ex, ey, w * 0.56, h * 0.13, Math.sin(a) * 0.35, 0, TAU);
      ctx.fill();
    }
  }

  R.background = function (ctx, theme, t, camX) {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(0.55, theme.sky[1]);
    g.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    // sol
    const sx = VW * 0.73 - camX * 0.012;
    const sy = VH * 0.27;
    ctx.drawImage(sunSprite(theme), sx - 280, sy - 280);
    ctx.fillStyle = theme.sun;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(sx, sy, 46, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    hillLayer(ctx, camX, 0.1, VH * 0.62, 34, theme.hillFar, 2.1, 1.3);
    hillLayer(ctx, camX, 0.18, VH * 0.7, 40, theme.hillMid, 3.1, 4.1);

    // niebla baja
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const mist = mistSprite(theme);
    for (let i = 0; i < 3; i++) {
      const mx = mod(i * 420 - camX * 0.18 + t * 8, VW + 500) - 250;
      const my = VH * (0.66 + i * 0.045);
      ctx.drawImage(mist, mx - 300, my - 180);
    }
    ctx.restore();

    // árboles lejanos
    const span = VW + 420;
    for (let i = 0; i < 8; i++) {
      const x = mod(i * 230 - camX * 0.24, span) - 210;
      const seed = hash(i, 17);
      tree(ctx, x, VH * 0.78, 170 + seed * 170, 90 + seed * 60, theme, Math.sin(t * 0.5 + i) * 5, seed);
    }

    hillLayer(ctx, camX, 0.34, VH * 0.84, 26, theme.hillNear, 4.2, 2.2);

    // árboles cercanos
    for (let i = 0; i < 5; i++) {
      const x = mod(i * 380 + 60 - camX * 0.42, VW + 640) - 320;
      const seed = hash(i, 41);
      tree(ctx, x, VH + 10, 230 + seed * 160, 120 + seed * 80, theme, Math.sin(t * 0.7 + i * 2) * 8, seed);
    }

    // lianas colgantes
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = mod(i * 168 + 40 - camX * 0.56, VW + 260) - 130;
      const len = 70 + hash(i, 7) * 190;
      const sway = Math.sin(t * 0.8 + i) * 7;
      ctx.strokeStyle = theme.vine;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x, -6);
      ctx.bezierCurveTo(x + sway, len * 0.3, x - sway, len * 0.65, x + sway * 0.6, len);
      ctx.stroke();
      for (let k = 1; k <= 4; k++) {
        const yy = (k / 4.6) * len;
        const lx = x + Math.sin(k * 1.7) * 10 + sway * (yy / len);
        ctx.fillStyle = theme.treeLeaf;
        ctx.beginPath();
        ctx.ellipse(lx + (k % 2 ? 7 : -7), yy, 9, 4, k % 2 ? 0.5 : -0.5, 0, TAU);
        ctx.fill();
      }
    }

    // luciérnagas
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mote = moteSprite();
    for (let i = 0; i < 20; i++) {
      const seed = hash(i, 91);
      const x = mod(i * 173 + Math.sin(t * 0.32 + i) * 26 - camX * 0.2, VW + 80) - 40;
      const y = 60 + seed * (VH - 180) + Math.sin(t * 0.8 + i * 1.7) * 18;
      const pulse = 0.35 + Math.abs(Math.sin(t * 1.3 + i)) * 0.65;
      const rad = 2 + seed * 2.4;
      const gsize = rad * 15;
      ctx.globalAlpha = pulse * 0.7;
      ctx.drawImage(mote, x - gsize / 2, y - gsize / 2, gsize, gsize);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = theme.mote;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ---------------- AGUA ---------------- */
  R.water = function (ctx, world, theme, t, camX) {
    const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const c1 = Math.min(world.cols - 1, c0 + 23);
    let runStart = null;

    for (let c = c0; c <= c1 + 1; c++) {
      const water = c <= c1 && world.at(c, 10) === '~';
      if (water && runStart === null) runStart = c;
      if (!water && runStart !== null) {
        const x0 = runStart * TILE - camX;
        const x1 = c * TILE - camX;
        const y = 10 * TILE;

        // cuerpo del agua
        const wg = ctx.createLinearGradient(0, y, 0, VH);
        wg.addColorStop(0, theme.water);
        wg.addColorStop(1, theme.waterDeep);
        ctx.fillStyle = wg;
        ctx.fillRect(x0, y, x1 - x0, VH - y);

        // reflejos
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = theme.waterHi;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const yy = y + 22 + i * 19;
          ctx.beginPath();
          for (let x = x0 + 8; x < x1; x += 14) {
            const off = Math.sin((x + camX) * 0.03 + t * 1.7 + i) * 4;
            ctx.lineTo(x, yy + off);
          }
          ctx.stroke();
        }
        ctx.restore();

        // nenúfares
        for (let c2 = runStart; c2 < c; c2++) {
          const h = hash(c2, 31);
          if (h > 0.62) {
            const lx = c2 * TILE - camX + 20 + h * 12;
            const ly = y + 14 + hash(c2, 8) * 12;
            ctx.fillStyle = '#2f7d3e';
            ctx.beginPath();
            ctx.ellipse(lx, ly, 15, 6, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#3f9a4b';
            ctx.beginPath();
            ctx.ellipse(lx - 1, ly - 1.5, 11, 4.2, 0, 0, TAU);
            ctx.fill();
            if (h > 0.8) {
              ctx.fillStyle = '#ffb7d5';
              ctx.beginPath();
              ctx.arc(lx + 4, ly - 5, 3.6, 0, TAU);
              ctx.fill();
            }
          }
        }

        // superficie ondulada
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 6) {
          const wy = y + Math.sin((x + camX) * 0.028 + t * 2.1) * 3.4 + Math.sin((x + camX) * 0.009 - t * 1.4) * 2.4;
          if (x === x0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.lineTo(x1, y + 16);
        ctx.lineTo(x0, y + 16);
        ctx.closePath();
        ctx.fillStyle = theme.water;
        ctx.globalAlpha = 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.waterHi;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 6) {
          const wy = y + Math.sin((x + camX) * 0.028 + t * 2.1) * 3.4 + Math.sin((x + camX) * 0.009 - t * 1.4) * 2.4;
          if (x === x0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.stroke();

        // juncos en los bordes
        drawReed(ctx, x0 + 7, y, t, theme, -1);
        drawReed(ctx, x1 - 7, y, t + 1.4, theme, 1);

        runStart = null;
      }
    }
  };

  function drawReed(ctx, x, y, t, theme, dir) {
    ctx.strokeStyle = '#3f7d40';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const sway = Math.sin(t * 1.3 + i + dir) * 5;
      const h = 26 + i * 13;
      ctx.beginPath();
      ctx.moveTo(x + i * 4 - 4, y + 5);
      ctx.quadraticCurveTo(x + i * 4 + sway, y - h * 0.6, x + i * 4 + sway * 1.2, y - h);
      ctx.stroke();
      ctx.fillStyle = '#6b4a2c';
      ctx.beginPath();
      ctx.ellipse(x + i * 4 + sway * 1.2, y - h - 3, 3.2, 7, 0.1 * dir, 0, TAU);
      ctx.fill();
    }
  }

  /* ---------------- TILES ---------------- */
  const SOLID_TOP = new Set(['#', 'B', '?', '!', '=', 'P']);

  R.tiles = function (ctx, world, theme, t, camX) {
    const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const c1 = Math.min(world.cols - 1, c0 + 23);

    for (let r = 0; r < world.rows; r++) {
      for (let c = c0; c <= c1; c++) {
        const ch = world.at(c, r);
        if (ch === '.' || ch === '~') continue;
        const x = c * TILE - camX;
        const y = r * TILE;
        switch (ch) {
          case '#': drawGround(ctx, world, theme, x, y, c, r); break;
          case 'B': drawBrick(ctx, theme, x, y); break;
          case '?': drawQuestion(ctx, theme, x, y, t, c); break;
          case '!': drawUsed(ctx, theme, x, y); break;
          case '=': drawWood(ctx, theme, x, y, world, c, r); break;
          case '-': drawOneWay(ctx, theme, x, y, t, c); break;
          case '^': drawSpikes(ctx, theme, x, y); break;
          case 'P': drawPipe(ctx, world, theme, x, y, c, r); break;
        }
      }
    }
  };

  function drawGround(ctx, world, theme, x, y, c, r) {
    const above = world.at(c, r - 1);
    ctx.fillStyle = theme.dirt;
    ctx.fillRect(x, y, TILE + 1, TILE + 1);

    // sombra inferior
    ctx.fillStyle = theme.dirtDark;
    ctx.fillRect(x, y + TILE - 7, TILE + 1, 7);

    // piedritas
    for (let i = 0; i < 3; i++) {
      const h1 = hash(c * 3 + i, r * 5 + 1);
      const h2 = hash(c * 3 + i, r * 5 + 2);
      if (h1 > 0.45) {
        ctx.fillStyle = h2 > 0.5 ? theme.dirtLight : theme.dirtDark;
        ctx.beginPath();
        ctx.ellipse(x + 6 + h1 * 36, y + 16 + h2 * 24, 2 + h1 * 3, 1.6 + h2 * 2, 0, 0, TAU);
        ctx.fill();
      }
    }

    if (!SOLID_TOP.has(above) && above !== '-') {
      const gg = ctx.createLinearGradient(0, y, 0, y + 17);
      gg.addColorStop(0, theme.grassTop);
      gg.addColorStop(1, theme.grassDark);
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(x, y + 15);
      ctx.lineTo(x, y + 3);
      for (let i = 0; i <= 4; i++) {
        const bx = x + (i / 4) * TILE;
        const by = y + 3 + (i % 2 ? 4 : 0) + hash(c * 7 + i, r) * 2;
        ctx.lineTo(bx, by);
      }
      ctx.lineTo(x + TILE + 1, y + 15);
      ctx.closePath();
      ctx.fill();

      // brillo y briznas
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x, y, TILE + 1, 3);
      ctx.strokeStyle = theme.grassTop;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        const h = hash(c * 11 + i, r * 3);
        const bx = x + 6 + h * 36;
        ctx.beginPath();
        ctx.moveTo(bx, y + 4);
        ctx.quadraticCurveTo(bx + 2, y - 4 - h * 4, bx + (h > 0.5 ? 5 : -5), y - 8 - h * 5);
        ctx.stroke();
      }
      if (hash(c, 77) > 0.86) {
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(x + 14 + hash(c, 3) * 22, y + 6, 2.4, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawBrick(ctx, theme, x, y) {
    ctx.fillStyle = theme.brick;
    ctx.fillRect(x, y, TILE + 1, TILE + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x, y, TILE + 1, 4);
    ctx.strokeStyle = theme.brickDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 16); ctx.lineTo(x + TILE, y + 16);
    ctx.moveTo(x, y + 32); ctx.lineTo(x + TILE, y + 32);
    ctx.moveTo(x + 24, y); ctx.lineTo(x + 24, y + 16);
    ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 12, y + 32);
    ctx.moveTo(x + 36, y + 16); ctx.lineTo(x + 36, y + 32);
    ctx.moveTo(x + 24, y + 32); ctx.lineTo(x + 24, y + TILE);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
  }

  function drawQuestion(ctx, theme, x, y, t, c) {
    const pulse = 0.5 + Math.sin(t * 4 + c) * 0.5;
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,90,' + (0.35 + pulse * 0.35) + ')';
    ctx.shadowBlur = 14 + pulse * 8;
    const g = ctx.createLinearGradient(0, y, 0, y + TILE);
    g.addColorStop(0, '#ffe38a');
    g.addColorStop(1, '#e8a52e');
    ctx.fillStyle = g;
    rr(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 10);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#8a5a12';
    ctx.lineWidth = 2.5;
    rr(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 10);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(x + 11, y + 11, 2, 0, TAU);
    ctx.arc(x + TILE - 11, y + 11, 2, 0, TAU);
    ctx.arc(x + 11, y + TILE - 11, 2, 0, TAU);
    ctx.arc(x + TILE - 11, y + TILE - 11, 2, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#6b4308';
    ctx.font = '900 26px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + TILE / 2, y + TILE / 2 + 1);
  }

  function drawUsed(ctx, theme, x, y) {
    ctx.fillStyle = '#6a6152';
    rr(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 10);
    ctx.fill();
    ctx.strokeStyle = '#463f34';
    ctx.lineWidth = 2.5;
    rr(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 10);
    ctx.stroke();
    ctx.fillStyle = '#463f34';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x + 14 + (i % 2) * 20, y + 15 + Math.floor(i / 2) * 18, 2.4, 0, TAU);
      ctx.fill();
    }
  }

  function drawWood(ctx, theme, x, y, world, c, r) {
    const g = ctx.createLinearGradient(0, y, 0, y + TILE);
    g.addColorStop(0, '#b57a43');
    g.addColorStop(0.5, '#98612f');
    g.addColorStop(1, '#74471f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, TILE + 1, TILE + 1);
    ctx.fillStyle = 'rgba(255,240,190,0.18)';
    ctx.fillRect(x, y, TILE + 1, 4);
    ctx.strokeStyle = 'rgba(70,40,14,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 22); ctx.lineTo(x + TILE, y + 22);
    ctx.moveTo(x, y + 42); ctx.lineTo(x + TILE, y + 42);
    ctx.stroke();
    ctx.fillStyle = 'rgba(50,28,8,0.6)';
    const h = hash(c, r);
    ctx.beginPath();
    ctx.arc(x + 10 + h * 26, y + 12, 2, 0, TAU);
    ctx.arc(x + 30 - h * 12, y + 34, 2, 0, TAU);
    ctx.fill();
    // musgo
    if (hash(c, r + 9) > 0.55) {
      ctx.fillStyle = theme.grassDark;
      ctx.beginPath();
      ctx.ellipse(x + 8 + h * 30, y + 2, 9, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = theme.grassTop;
      ctx.beginPath();
      ctx.ellipse(x + 6 + h * 30, y + 1, 5, 2.5, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawOneWay(ctx, theme, x, y, t, c) {
    ctx.fillStyle = '#8a5a2e';
    rr(ctx, x + 1, y, TILE - 2, 15, 5);
    ctx.fill();
    ctx.fillStyle = '#c08a4d';
    rr(ctx, x + 3, y + 1, TILE - 6, 7, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 5, y + 2, TILE - 10, 2);
    // lianas
    ctx.strokeStyle = '#2f7a3c';
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const lx = x + 12 + i * 22;
      const sway = Math.sin(t * 1.6 + c + i) * 3;
      ctx.beginPath();
      ctx.moveTo(lx, y + 14);
      ctx.quadraticCurveTo(lx + sway, y + 24, lx + sway * 1.6, y + 30 + i * 4);
      ctx.stroke();
    }
  }

  function drawSpikes(ctx, theme, x, y) {
    ctx.fillStyle = '#3d4348';
    ctx.fillRect(x, y + 40, TILE + 1, 8);
    for (let i = 0; i < 3; i++) {
      const sx = x + 4 + i * 15;
      const g = ctx.createLinearGradient(sx, y + 18, sx + 10, y + 42);
      g.addColorStop(0, '#dfe8ea');
      g.addColorStop(0.5, '#98a6ab');
      g.addColorStop(1, '#5a686e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx, y + 42);
      ctx.lineTo(sx + 7, y + 16);
      ctx.lineTo(sx + 14, y + 42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,40,44,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function drawPipe(ctx, world, theme, x, y, c, r) {
    const top = world.at(c, r - 1) !== 'P';
    const g = ctx.createLinearGradient(x, 0, x + TILE, 0);
    g.addColorStop(0, '#3f8737');
    g.addColorStop(0.3, '#7ec95b');
    g.addColorStop(0.6, '#5aab45');
    g.addColorStop(1, '#33702f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, TILE + 1, TILE + 1);
    ctx.strokeStyle = 'rgba(20,60,25,0.5)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * 16);
      ctx.lineTo(x + TILE, y + i * 16);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 7, y, 5, TILE);
    if (top) {
      ctx.fillStyle = '#8fdc63';
      rr(ctx, x - 2, y, TILE + 4, 12, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,60,25,0.55)';
      ctx.lineWidth = 2;
      rr(ctx, x - 2, y, TILE + 4, 12, 5);
      ctx.stroke();
      if (hash(c, 4) > 0.45) {
        ctx.strokeStyle = '#4c9a3e';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x + 34, y + 2);
        ctx.quadraticCurveTo(x + 46, y - 12, x + 58, y - 6);
        ctx.stroke();
        ctx.fillStyle = '#69bd4c';
        ctx.beginPath();
        ctx.ellipse(x + 60, y - 8, 8, 4, 0.4, 0, TAU);
        ctx.fill();
      }
    }
  }

  /* ---------------- META ---------------- */
  R.goal = function (ctx, goal, camX, t, theme) {
    const x = goal.x - camX;
    const y = goal.y;
    ctx.save();

    // haz de luz
    const beam = ctx.createLinearGradient(0, y - 250, 0, y);
    beam.addColorStop(0, 'rgba(255,235,160,0)');
    beam.addColorStop(0.65, 'rgba(255,235,160,0.12)');
    beam.addColorStop(1, 'rgba(255,235,160,0.05)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 70, y);
    ctx.lineTo(x - 26, y - 250);
    ctx.lineTo(x + 26, y - 250);
    ctx.lineTo(x + 70, y);
    ctx.closePath();
    ctx.fill();

    // tallo
    ctx.strokeStyle = '#3f9440';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 14, y - 70, x + Math.sin(t * 1.2) * 6, y - 140);
    ctx.stroke();
    ctx.strokeStyle = '#6fc95a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.quadraticCurveTo(x - 16, y - 70, x + Math.sin(t * 1.2) * 5, y - 138);
    ctx.stroke();

    // hojas
    for (let i = 0; i < 2; i++) {
      const ly = y - 50 - i * 34;
      const dir = i % 2 ? 1 : -1;
      ctx.fillStyle = '#4fa63f';
      ctx.beginPath();
      ctx.ellipse(x + dir * 22, ly, 24, 9, dir * 0.45, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7ed45f';
      ctx.beginPath();
      ctx.ellipse(x + dir * 22, ly - 2, 17, 5, dir * 0.45, 0, TAU);
      ctx.fill();
    }

    // flor
    const fy = y - 158 + Math.sin(t * 1.5) * 4;
    ctx.save();
    ctx.translate(x, fy);
    ctx.shadowColor = 'rgba(255,190,220,0.8)';
    ctx.shadowBlur = 30;
    const petals = 8;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * TAU + t * 0.25;
      const rad = 34;
      ctx.save();
      ctx.rotate(a);
      const pg = ctx.createLinearGradient(0, 0, 0, -40);
      pg.addColorStop(0, '#ff9fc8');
      pg.addColorStop(1, '#fff1dc');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.ellipse(0, -30, 12, 24, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,70,120,0.22)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    const cg = ctx.createRadialGradient(0, -3, 2, 0, 0, 20);
    cg.addColorStop(0, '#fff8cf');
    cg.addColorStop(1, '#ffc94f');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-4, -4, 4, 0, TAU);
    ctx.fill();
    ctx.restore();

    // chispas
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = t * 0.9 + i * 0.9;
      const px = x + Math.cos(a) * (46 + i * 3);
      const py = fy + Math.sin(a * 1.3) * (40 + i * 2);
      const alpha = 0.3 + Math.abs(Math.sin(t * 2 + i)) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffe9a3';
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // cartel
    ctx.save();
    ctx.translate(x + 44, y - 20);
    ctx.rotate(0.05);
    ctx.fillStyle = '#8a5a2e';
    rr(ctx, -28, -12, 62, 26, 5);
    ctx.fill();
    ctx.strokeStyle = '#5a3a18';
    ctx.lineWidth = 2;
    rr(ctx, -28, -12, 62, 26, 5);
    ctx.stroke();
    ctx.fillStyle = '#2f1a08';
    ctx.font = '900 13px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('META', 3, 2);
    ctx.restore();

    ctx.restore();
  };

  /* ---------------- CHECKPOINT ---------------- */
  R.checkpoint = function (ctx, cp, camX, t) {
    const x = cp.x - camX;
    const y = cp.y;
    const active = cp.active;
    const glow = active ? 0.55 + Math.sin(t * 3) * 0.2 : 0.08;
    ctx.save();
    if (active) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y - 44, 2, x, y - 44, 60);
      g.addColorStop(0, 'rgba(190,255,130,' + glow + ')');
      g.addColorStop(1, 'rgba(190,255,130,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 60, y - 110, 120, 130);
      ctx.globalCompositeOperation = 'source-over';
    }
    // tallo
    ctx.strokeStyle = active ? '#6fc95a' : '#4a6a50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, y - 26, x, y - 48);
    ctx.stroke();
    // capullo / flor
    ctx.save();
    ctx.translate(x, y - 50 + Math.sin(t * 2 + cp.x) * 2);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i / 4) * TAU + t * (active ? 0.5 : 0.1));
      ctx.fillStyle = active ? (i % 2 ? '#d7ff8a' : '#a4ef68') : '#6b7d6a';
      ctx.beginPath();
      ctx.ellipse(0, -10, 5.5, 13, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = active ? '#ffe27a' : '#87947f';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
    // base
    ctx.fillStyle = active ? '#8fd15c' : '#5f7a5a';
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /* ---------------- PLATAFORMA MÓVIL ---------------- */
  R.mover = function (ctx, m, camX, t, theme) {
    const x = m.x - camX;
    const y = m.y;
    ctx.save();
    // lianas colgando
    ctx.strokeStyle = '#2f7a3c';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) {
      const lx = x + 14 + i * (m.w - 28) / 3;
      const sway = Math.sin(t * 1.5 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(lx, y + m.h);
      ctx.quadraticCurveTo(lx + sway, y + m.h + 14, lx + sway * 1.5, y + m.h + 22 + (i % 2) * 6);
      ctx.stroke();
    }
    // tablón
    const g = ctx.createLinearGradient(0, y, 0, y + m.h);
    g.addColorStop(0, '#c58a4f');
    g.addColorStop(0.4, '#a06a34');
    g.addColorStop(1, '#6f4620');
    ctx.fillStyle = g;
    rr(ctx, x, y, m.w, m.h + 4, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,10,0.65)';
    ctx.lineWidth = 2;
    rr(ctx, x, y, m.w, m.h + 4, 7);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,200,0.28)';
    ctx.fillRect(x + 6, y + 2, m.w - 12, 3);
    // musgo
    ctx.fillStyle = theme.grassDark;
    for (let i = 0; i < 5; i++) {
      const h = hash(i, Math.round(m.x / 40));
      if (h > 0.4) {
        ctx.beginPath();
        ctx.ellipse(x + 10 + i * (m.w - 20) / 4, y + 1, 7, 3.4, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = theme.grassTop;
    ctx.beginPath();
    ctx.ellipse(x + m.w * 0.3, y, 10, 3, 0, 0, TAU);
    ctx.fill();
    // runas
    ctx.fillStyle = 'rgba(190,255,140,' + (0.35 + Math.sin(t * 2.4) * 0.2) + ')';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(x + m.w / 2 + (i ? -10 : 10), y + 10, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };
})();
