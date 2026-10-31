/* ============================================================
   SAPO SALVAJE — render de actores y HUD
   ============================================================ */
(function () {
  'use strict';
  const S = window.SAPO;
  const { TILE, VW, VH, clamp, hash, lerp } = S;
  const R = S.render;
  const TAU = Math.PI * 2;
  const rr = R.rr;

  /* ---------------- MONEDA (luciérnaga dorada) ---------------- */
  R.coin = function (ctx, c, camX, t) {
    const x = c.x - camX;
    const y = c.y;
    const pulse = 0.6 + Math.sin(t * 4 + c.t) * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 1, x, y, 22);
    g.addColorStop(0, 'rgba(255,230,120,0.55)');
    g.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, TAU);
    ctx.fill();
    ctx.restore();

    const flap = Math.sin(t * 24 + c.t) * 0.75;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,255,220,0.6)';
    ctx.beginPath();
    ctx.ellipse(-4, -7, 6, 3.4, -0.6 + flap * 0.35, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -7, 6, 3.4, 0.6 - flap * 0.35, 0, TAU);
    ctx.fill();

    const og = ctx.createRadialGradient(-3, -3, 1, 0, 0, 9);
    og.addColorStop(0, '#fffbe0');
    og.addColorStop(0.45, '#ffe066');
    og.addColorStop(1, '#e9a52c');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,80,10,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-2.4, -2.4, 2.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (pulse > 0.8) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,240,160,' + (pulse - 0.8) * 2.4 + ')';
      ctx.lineWidth = 1.4;
      const s = 11 + (1 - (pulse - 0.8) / 0.2) * 4;
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      ctx.stroke();
      ctx.restore();
    }
  };

  /* ---------------- CORAZÓN ---------------- */
  R.heart = function (ctx, h, camX, t) {
    const x = h.x - camX;
    const y = h.y;
    const s = 1 + Math.sin(t * 3 + h.t) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
    g.addColorStop(0, 'rgba(255,140,180,0.4)');
    g.addColorStop(1, 'rgba(255,80,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff5c86';
    ctx.strokeStyle = '#a12a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-14, -2, -12, -12, -5, -12);
    ctx.bezierCurveTo(-1.5, -12, 0, -9, 0, -6);
    ctx.bezierCurveTo(0, -9, 1.5, -12, 5, -12);
    ctx.bezierCurveTo(12, -12, 14, -2, 0, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(-5, -6, 2.6, 3.4, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /* ---------------- CARACOL ---------------- */
  R.snail = function (ctx, e, camX, t) {
    const x = e.x - camX;
    const y = e.y;
    const dead = e.dead;
    ctx.save();
    ctx.translate(x, y);
    if (dead) {
      ctx.globalAlpha = clamp(1 - e.deadT / 0.7, 0, 1);
      ctx.scale(1.15, 0.35);
      ctx.translate(0, 12);
    }
    ctx.scale(e.dir, 1);
    const wob = Math.sin(t * 6 + e.t) * 1.5;

    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 17, 23, 5, 0, 0, TAU);
    ctx.fill();

    // pie / babilla
    ctx.fillStyle = '#3f8f8a';
    ctx.beginPath();
    ctx.ellipse(-1, 10 + wob * 0.3, 22, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5fb8ac';
    ctx.beginPath();
    ctx.ellipse(-1, 7, 18, 5, 0, 0, TAU);
    ctx.fill();

    // cabeza
    ctx.fillStyle = '#4fa59c';
    ctx.beginPath();
    ctx.ellipse(15, 2, 11, 10, 0.1, 0, TAU);
    ctx.fill();
    // ojos
    for (let i = 0; i < 2; i++) {
      const ex = 16 + i * 3;
      const ey = -13 - i * 2;
      ctx.strokeStyle = '#4fa59c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(14 + i * 2, -2);
      ctx.lineTo(ex, ey + 3);
      ctx.stroke();
      ctx.fillStyle = '#f4ffe0';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#183b32';
      ctx.beginPath();
      ctx.arc(ex + 1, ey, 1.7, 0, TAU);
      ctx.fill();
    }
    // boca
    ctx.strokeStyle = '#235a50';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(20, 6, 3.4, 0.1, Math.PI - 0.3);
    ctx.stroke();

    // concha
    const sx = -5, sy = -3;
    const sg = ctx.createRadialGradient(sx - 4, sy - 5, 2, sx, sy, 16);
    sg.addColorStop(0, '#f0b968');
    sg.addColorStop(1, '#a96a2c');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, 15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6f3f14';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // espiral
    ctx.strokeStyle = 'rgba(90,50,15,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 26; i++) {
      const a = i * 0.42;
      const r = 1 + i * 0.48;
      const px = sx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r * 0.95;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,190,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx - 5, sy - 6, 4.5, 2.6, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /* ---------------- MOSQUITO ---------------- */
  R.fly = function (ctx, e, camX, t) {
    const x = e.x - camX;
    const y = e.y;
    ctx.save();
    ctx.translate(x, y);
    if (e.dead) ctx.globalAlpha = clamp(1 - e.deadT / 0.7, 0, 1);
    ctx.scale(e.dir, 1);
    const flap = Math.sin(t * 42 + e.t) * 0.95;

    // alas
    ctx.fillStyle = 'rgba(210,230,255,0.42)';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate((i ? 1 : -1) * (0.5 + flap * 0.3) + (i ? 0.5 : -0.5));
      ctx.beginPath();
      ctx.ellipse(-4, -10 - i * 2, 13, 5.5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // patas
    ctx.strokeStyle = '#4a2c58';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-4 + i * 3, 4);
      ctx.quadraticCurveTo(-8 + i * 4, 12, -12 + i * 5, 16);
      ctx.stroke();
    }

    // cuerpo
    const bg = ctx.createLinearGradient(-14, -6, 10, 8);
    bg.addColorStop(0, '#6a3f8c');
    bg.addColorStop(1, '#3d2354');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(-4, 1, 13, 8, 0.08, 0, TAU);
    ctx.fill();
    // aguijón
    ctx.strokeStyle = '#2c173d';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-15, 2);
    ctx.lineTo(-23, 5);
    ctx.stroke();
    // cabeza
    ctx.fillStyle = '#523070';
    ctx.beginPath();
    ctx.arc(9, -2, 7.5, 0, TAU);
    ctx.fill();
    // ojos
    ctx.fillStyle = '#8ff5e0';
    ctx.beginPath();
    ctx.arc(11, -4, 3.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#123b32';
    ctx.beginPath();
    ctx.arc(12, -4, 1.7, 0, TAU);
    ctx.fill();
    // trompa
    ctx.strokeStyle = '#2c173d';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(26, 5);
    ctx.stroke();
    ctx.restore();
  };

  /* ---------------- ERIZO ---------------- */
  R.urchin = function (ctx, e, camX, t) {
    const x = e.x - camX;
    const y = e.y;
    ctx.save();
    ctx.translate(x, y);
    if (e.dead) ctx.globalAlpha = clamp(1 - e.deadT / 0.7, 0, 1);
    const rot = e.t * 0.7;
    ctx.rotate(rot);
    // púas
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = i % 2 ? '#3d2342' : '#4c2b50';
      ctx.beginPath();
      ctx.moveTo(-4, -14);
      ctx.lineTo(0, -30);
      ctx.lineTo(4, -14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,8,24,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    ctx.rotate(-rot);
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, 18);
    g.addColorStop(0, '#7a4a7e');
    g.addColorStop(1, '#3a2040');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, TAU);
    ctx.fill();
    // ojos
    ctx.fillStyle = '#ffd9c0';
    ctx.beginPath();
    ctx.arc(-5, -2, 4.4, 0, TAU);
    ctx.arc(5, -2, 4.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b0d1f';
    ctx.beginPath();
    ctx.arc(-4, -2, 2, 0, TAU);
    ctx.arc(6, -2, 2, 0, TAU);
    ctx.fill();
    // ceño
    ctx.strokeStyle = '#2a1230';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -9); ctx.lineTo(-2, -5);
    ctx.moveTo(10, -9); ctx.lineTo(2, -5);
    ctx.stroke();
    // boca
    ctx.strokeStyle = '#2a1230';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 6, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  };

  /* ---------------- EL HOMBRE SAPO ---------------- */
  R.player = function (ctx, p, camX, t) {
    const x = p.x - camX;
    const y = p.y;
    const air = !p.onGround;
    const run = p.onGround && Math.abs(p.vx) > 26;
    const spd = Math.min(1, Math.abs(p.vx) / 312);

    // sombra
    if (!p.dead) {
      ctx.save();
      ctx.globalAlpha = p.onGround ? 0.26 : 0.13;
      ctx.fillStyle = '#03150e';
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 19, 5.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (p.invuln > 0 && Math.floor(t * 22) % 2 === 0) ctx.globalAlpha = 0.34;

    ctx.translate(x, y - 23);
    ctx.rotate(p.dead ? p.rot : clamp(p.vx / 312, -1, 1) * 0.07);
    ctx.scale(p.dir * p.stretchX, p.stretchY);
    ctx.translate(0, 23);

    const swing = run ? Math.sin(p.runT * 19) * 8 : 0;
    const bob = run ? Math.abs(Math.sin(p.runT * 19)) * 2.2 : Math.sin(t * 2.6) * 1.2;
    const blink = p.blinking > 0 ? 0.12 : 1;
    ctx.translate(0, -bob);

    // ---- pies ----
    const footY = air ? -4 : -1;
    ctx.fillStyle = '#3d8f2f';
    for (let i = 0; i < 2; i++) {
      const fx = i ? 9 - swing * 0.7 : -9 + swing * 0.7;
      const fy = footY + (air ? (i ? -2 : 1) : 0);
      ctx.beginPath();
      ctx.ellipse(fx, fy, 8, 4, 0, 0, TAU);
      ctx.fill();
      // dedos
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(fx + (k - 1) * 4 + (i ? 2 : -2), fy + 1, 2.2, 0, TAU);
        ctx.fill();
      }
    }

    // ---- cuerpo ----
    const body = ctx.createLinearGradient(0, -46, 0, -4);
    body.addColorStop(0, '#a9ef6f');
    body.addColorStop(0.5, '#79d64e');
    body.addColorStop(1, '#469f39');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#2f7329';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, -24, 16.5, 21, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // barriga
    ctx.fillStyle = 'rgba(238,255,190,0.72)';
    ctx.beginPath();
    ctx.ellipse(1, -17, 10.5, 12.5, 0, 0, TAU);
    ctx.fill();

    // ---- brazos ----
    const armY = air ? -36 : -27;
    ctx.strokeStyle = '#3f9a35';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const dir = i ? 1 : -1;
      const ax = dir * 14;
      const sx = dir * (run ? 3 : 1);
      const ang = air ? 1.2 : run ? Math.sin(p.runT * 19 + (i ? Math.PI : 0)) * 0.9 : 0.35;
      ctx.beginPath();
      ctx.moveTo(ax * 0.8, armY);
      const hx = ax + dir * (air ? 5 : 2);
      const hy = armY + (air ? -6 - i * 2 : 12) + sx;
      ctx.quadraticCurveTo(ax + dir * 5, armY + 5, hx, hy + ang * 2);
      ctx.stroke();
      ctx.fillStyle = '#8fe062';
      ctx.beginPath();
      ctx.arc(hx + dir * 2, hy + ang * 2, 4.6, 0, TAU);
      ctx.fill();
    }

    // ---- morral ----
    ctx.strokeStyle = '#7c4a24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(11, -38);
    ctx.lineTo(-8, -16);
    ctx.stroke();
    ctx.fillStyle = '#8a5327';
    ctx.strokeStyle = '#5a3214';
    ctx.lineWidth = 2;
    rr(ctx, -17, -21, 13, 13, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c98a45';
    ctx.fillRect(-16, -19, 11, 3);

    // ---- cinturón ----
    ctx.fillStyle = '#6b3f1d';
    ctx.beginPath();
    ctx.ellipse(0, -12.5, 15.4, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f2c14e';
    rr(ctx, -3, -16, 7.5, 7, 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a1a';
    ctx.fillRect(-0.8, -14, 3, 3);

    // ---- ojos ----
    for (let i = 0; i < 2; i++) {
      const ex = i ? 8.6 : -8.6;
      const ey = -42;
      ctx.fillStyle = '#6bc946';
      ctx.beginPath();
      ctx.arc(ex, ey, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2f7329';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (blink < 1) {
        ctx.strokeStyle = '#1c4a1c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex - 5, ey);
        ctx.lineTo(ex + 5, ey);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fffdf0';
        ctx.beginPath();
        ctx.arc(ex, ey - 0.5, 5.6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#14281a';
        ctx.beginPath();
        ctx.arc(ex + 1.3, ey - 0.5, 2.9, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(ex + 2.6, ey - 2.2, 1.1, 0, TAU);
        ctx.fill();
      }
    }

    // ---- boca ----
    ctx.strokeStyle = '#2b6326';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (p.tongue > 0) {
      ctx.fillStyle = '#3f241f';
      ctx.beginPath();
      ctx.ellipse(4, -26.5, 6.5, 5, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.moveTo(-10, -30.5);
      ctx.quadraticCurveTo(0, -23, 10, -30.5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(238,255,190,0.5)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-7, -28.6);
      ctx.quadraticCurveTo(0, -23.6, 7, -28.6);
      ctx.stroke();
    }
    // nariz
    ctx.fillStyle = '#3c8a31';
    ctx.beginPath();
    ctx.arc(-3.2, -36, 1.3, 0, TAU);
    ctx.arc(3.2, -36, 1.3, 0, TAU);
    ctx.fill();

    // ---- brote en la cabeza ----
    ctx.strokeStyle = '#3f9a35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.quadraticCurveTo(2, -55, 5, -57);
    ctx.stroke();
    ctx.fillStyle = '#8fe062';
    ctx.beginPath();
    ctx.ellipse(8, -57, 6, 3, 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6bc946';
    ctx.beginPath();
    ctx.ellipse(0, -55, 5, 2.6, -0.5, 0, TAU);
    ctx.fill();

    // ---- lengua ----
    if (p.tongue > 0 && p.tongueLen > 2) {
      const len = p.tongueLen;
      const my = -29;
      const wob = Math.sin(t * 30) * 3;
      ctx.strokeStyle = '#e8615c';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(8, my);
      ctx.quadraticCurveTo(8 + len * 0.5, my - 4 + wob, 8 + len, my + 2);
      ctx.stroke();
      ctx.strokeStyle = '#ff8f87';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(8, my);
      ctx.quadraticCurveTo(8 + len * 0.5, my - 4 + wob, 8 + len, my + 2);
      ctx.stroke();
      ctx.fillStyle = '#ff8f87';
      ctx.beginPath();
      ctx.arc(8 + len, my + 2, 5.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#c94b48';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // ---- ojos de derrota ----
    if (p.dead) {
      ctx.strokeStyle = '#1c4a1c';
      ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        const ex = i ? 8.6 : -8.6;
        ctx.beginPath();
        ctx.moveTo(ex - 4, -46); ctx.lineTo(ex + 4, -38);
        ctx.moveTo(ex + 4, -46); ctx.lineTo(ex - 4, -38);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  /* ---------------- HUD ---------------- */
  function miniFrog(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#7fdc52';
    ctx.beginPath();
    ctx.arc(0, 1, 8, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-4.5, -6, 4.2, 0, TAU);
    ctx.arc(4.5, -6, 4.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath();
    ctx.arc(-4.5, -6, 2.6, 0, TAU);
    ctx.arc(4.5, -6, 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#12301a';
    ctx.beginPath();
    ctx.arc(-4.2, -6, 1.3, 0, TAU);
    ctx.arc(4.8, -6, 1.3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2e6d2a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();
  }

  function miniCoin(ctx, x, y) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, 'rgba(255,225,110,0.45)');
    g.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, TAU);
    ctx.fill();
    ctx.restore();
    const og = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 9);
    og.addColorStop(0, '#fffbe0');
    og.addColorStop(0.5, '#ffd95e');
    og.addColorStop(1, '#dc9a22');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(130,72,8,0.6)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x - 2.4, y - 2.4, 2, 0, TAU);
    ctx.fill();
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(4,24,19,0.55)';
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,255,150,0.2)';
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, h / 2);
    ctx.stroke();
  }

  R.hud = function (ctx, g) {
    ctx.save();
    // barra de progreso superior
    const prog = clamp((g.player.x - 40) / Math.max(1, g.stage.goal.x - 40), 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, VW, 4);
    const pg = ctx.createLinearGradient(0, 0, VW, 0);
    pg.addColorStop(0, '#8fe062');
    pg.addColorStop(1, '#ffe27a');
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, VW * prog, 4);

    // vidas
    panel(ctx, 14, 14, 112, 40);
    miniFrog(ctx, 38, 35, 1.15);
    ctx.fillStyle = '#eaffd0';
    ctx.font = '900 19px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('× ' + Math.max(0, g.lives), 56, 35);

    // monedas
    panel(ctx, 136, 14, 122, 40);
    miniCoin(ctx, 160, 34);
    ctx.fillStyle = '#ffe9a3';
    ctx.font = '900 19px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(String(g.coins), 178, 35);

    // nivel + tiempo
    const low = g.timeLeft <= 30;
    panel(ctx, VW / 2 - 92, 14, 184, 40);
    ctx.fillStyle = 'rgba(220,255,200,0.7)';
    ctx.font = '800 10px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NIVEL ' + (g.levelIndex + 1), VW / 2 - 78, 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = low ? (Math.floor(g.t * 4) % 2 ? '#ff8b78' : '#ffd0c4') : '#f2ffdc';
    ctx.font = '900 19px "Trebuchet MS", system-ui, sans-serif';
    const mm = Math.floor(Math.max(0, g.timeLeft) / 60);
    const ss = Math.floor(Math.max(0, g.timeLeft) % 60);
    ctx.fillText(mm + ':' + (ss < 10 ? '0' : '') + ss, VW / 2 + 84, 35);
    // relojito
    const clockX = VW / 2 + 14;
    ctx.strokeStyle = low ? '#ff8b78' : '#d7f5c0';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(clockX, 34, 7, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clockX, 34);
    ctx.lineTo(clockX, 29);
    ctx.moveTo(clockX, 34);
    ctx.lineTo(clockX + 4, 36);
    ctx.stroke();
    ctx.restore();
  };
})();
