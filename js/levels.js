/* ============================================================
   SAPO SALVAJE — niveles
   Construidos con un pequeño "level builder" para mantenerlos
   legibles y fáciles de retocar.
   ============================================================ */
(function () {
  'use strict';

  const T = 48;
  const ROWS = 12;

  const THEMES = [
    { // 1 · atardecer en el pantano
      name: 'luna',
      sky: ['#0a2831', '#1d5a54', '#8fc48a'],
      sun: '#ffecad',
      sunGlow: 'rgba(255,226,140,0.35)',
      hillFar: '#174a44',
      hillMid: '#103a35',
      hillNear: '#0a2a26',
      tree: '#08211e',
      treeLeaf: '#123a31',
      vine: '#1c4a3a',
      water: '#0e3b45',
      waterDeep: '#072730',
      waterHi: '#63e0c2',
      mist: 'rgba(190,255,220,0.055)',
      grassTop: '#7fd257',
      grassDark: '#3e9439',
      dirt: '#63452f',
      dirtDark: '#49301f',
      dirtLight: '#7a5639',
      brick: '#b4643c',
      brickDark: '#7a3f25',
      stone: '#5f7a6a',
      accent: '#ffd76e',
      mote: '#ffe9a3'
    },
    { // 2 · mañana entre raíces
      name: 'raices',
      sky: ['#08271f', '#1e5c3f', '#a9d693'],
      sun: '#fff5c2',
      sunGlow: 'rgba(255,246,190,0.32)',
      hillFar: '#1a5138',
      hillMid: '#12402c',
      hillNear: '#0b2d20',
      tree: '#082218',
      treeLeaf: '#14412c',
      vine: '#265b3b',
      water: '#0f3f43',
      waterDeep: '#082a2d',
      waterHi: '#74e6c0',
      mist: 'rgba(210,255,220,0.06)',
      grassTop: '#8ade5a',
      grassDark: '#469c38',
      dirt: '#5c412d',
      dirtDark: '#432c1c',
      dirtLight: '#73563a',
      brick: '#a85f3c',
      brickDark: '#734026',
      stone: '#5a7568',
      accent: '#ffdd7a',
      mote: '#f7ffc9'
    },
    { // 3 · fuego en el manglar
      name: 'manglar',
      sky: ['#241228', '#6d3547', '#e2a06e'],
      sun: '#ffd08a',
      sunGlow: 'rgba(255,180,100,0.36)',
      hillFar: '#4b2a3f',
      hillMid: '#3a2033',
      hillNear: '#261426',
      tree: '#1c0f1c',
      treeLeaf: '#38203a',
      vine: '#4a2848',
      water: '#33223d',
      waterDeep: '#1d1329',
      waterHi: '#ffb36b',
      mist: 'rgba(255,205,160,0.07)',
      grassTop: '#c6d95c',
      grassDark: '#6f8c33',
      dirt: '#5c3b36',
      dirtDark: '#40262a',
      dirtLight: '#75503f',
      brick: '#b96548',
      brickDark: '#7c3f2e',
      stone: '#6d5f6a',
      accent: '#ffca74',
      mote: '#ffd9a0'
    }
  ];

  class Builder {
    constructor(cfg) {
      this.name = cfg.name;
      this.subtitle = cfg.subtitle || '';
      this.width = cfg.width;
      this.time = cfg.time || 240;
      this.theme = cfg.theme;
      this.grid = Array.from({ length: ROWS }, () => new Array(this.width).fill('.'));
      this.coins = [];
      this.enemies = [];
      this.items = [];
      this.checkpoints = [];
      this.movers = [];
      this.spawn = { x: 3 * T + T / 2, y: 10 * T - 1 };
      this.goal = { x: (this.width - 8) * T, y: 10 * T };
    }

    set(cx, cy, ch) {
      if (cx >= 0 && cx < this.width && cy >= 0 && cy < ROWS) this.grid[cy][cx] = ch;
      return this;
    }
    fill(x0, y0, x1, y1, ch) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch);
      return this;
    }
    ground(x0, x1, top = 10) { return this.fill(x0, top, x1, ROWS - 1, '#'); }
    brick(x, y, n = 1) { for (let i = 0; i < n; i++) this.set(x + i, y, 'B'); return this; }
    q(x, y) { return this.set(x, y, '?'); }
    wood(x, y, n = 1) { for (let i = 0; i < n; i++) this.set(x + i, y, '='); return this; }
    plat(x, y, n = 1) { for (let i = 0; i < n; i++) this.set(x + i, y, '-'); return this; }
    spikes(x, y, n = 1) { for (let i = 0; i < n; i++) this.set(x + i, y, '^'); return this; }
    pipe(x, top) { return this.fill(x, top, x + 1, 9, 'P'); }

    coin(cx, cy) { this.coins.push({ cx, cy }); return this; }
    coinRow(cx, cy, n, step = 1) {
      for (let i = 0; i < n; i++) this.coin(cx + i * step, cy);
      return this;
    }
    coinArc(cx, cy, n) {
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0;
        this.coin(cx + i, cy - Math.round(Math.sin(t * Math.PI) * 1.7));
      }
      return this;
    }
    snail(cx, row = 10) { this.enemies.push({ type: 'snail', cx, row }); return this; }
    fly(cx, row = 6, range = 2) { this.enemies.push({ type: 'fly', cx, row, range }); return this; }
    urchin(cx, row = 10) { this.enemies.push({ type: 'urchin', cx, row }); return this; }
    heart(cx, row = 8) { this.items.push({ type: 'heart', cx, row }); return this; }
    checkpoint(cx, row = 10) { this.checkpoints.push({ cx, row }); return this; }
    spawnAt(cx, row = 10) { this.spawn = { x: cx * T + T / 2, y: row * T - 1 }; return this; }
    goalAt(cx, row = 10) { this.goal = { x: cx * T + T / 2, y: row * T }; return this; }
    mover(cx, row, tilesWide, axis, tilesDist, rate = 0.8) {
      this.movers.push({
        x: cx * T, y: row * T, w: tilesWide * T, h: 18,
        axis, dist: tilesDist * T, rate
      });
      return this;
    }

    build() {
      // Rellena con agua cualquier hueco en las dos filas del suelo.
      for (let x = 0; x < this.width; x++) {
        if (this.grid[10][x] === '.' && this.grid[11][x] === '.') {
          this.grid[10][x] = '~';
          this.grid[11][x] = '~';
        }
      }
      return {
        name: this.name,
        subtitle: this.subtitle,
        width: this.width,
        height: ROWS,
        time: this.time,
        theme: this.theme,
        grid: this.grid,
        coins: this.coins.map(c => ({ x: c.cx * T + T / 2, y: c.cy * T + T / 2 })),
        enemies: this.enemies.map(e => ({
          type: e.type,
          x: e.cx * T + T / 2,
          y: e.row * T + (e.type === 'fly' ? T / 2 : 0),
          row: e.row,
          range: (e.range || 2) * T
        })),
        items: this.items.map(i => ({ type: i.type, x: i.cx * T + T / 2, y: i.row * T + T / 2 })),
        checkpoints: this.checkpoints.map(c => ({ x: c.cx * T + T / 2, y: c.row * T })),
        movers: this.movers,
        spawn: this.spawn,
        goal: this.goal
      };
    }
  }

  // ============================================================
  // NIVEL 1 — Pantano de la Luna
  // ============================================================
  const L1 = (() => {
    const b = new Builder({ name: 'Pantano de la Luna', subtitle: 'Nivel 1', width: 134, time: 240, theme: THEMES[0] });
    b.spawnAt(3);
    b.ground(0, 36);
    b.ground(40, 70);
    b.ground(75, 133);

    b.coinRow(5, 8, 4);
    b.snail(11);

    b.brick(15, 7, 5); b.q(17, 7);
    b.coinRow(15, 5, 5);
    b.snail(22);

    b.pipe(26, 8);
    b.plat(31, 7, 3);
    b.coinRow(31, 6, 3);
    b.snail(33);

    b.coinArc(35, 7, 6);            // arco sobre el primer hueco

    b.fly(45, 6, 2.2);
    b.snail(48);
    b.coinRow(44, 8, 3);

    b.brick(52, 7, 4); b.q(53, 7);
    b.coinRow(52, 5, 4);
    b.snail(58);

    b.checkpoint(60);
    b.snail(65);
    b.plat(72, 9, 2);               // piedra de paso en el segundo hueco
    b.coinRow(71, 7, 4);

    b.spikes(80, 9, 2);
    b.coinRow(79, 7, 4);
    b.snail(86);
    b.fly(91, 6, 2.4);

    b.brick(94, 7, 6); b.q(96, 7);
    b.coinRow(94, 5, 6);
    b.snail(102);
    b.coinRow(104, 8, 3);

    // Escalera final hasta la flor de loto
    b.wood(106, 9, 2);
    b.wood(109, 8, 2);
    b.wood(112, 7, 2);
    b.wood(116, 6, 10);
    b.coinRow(117, 5, 6);
    b.fly(120, 3, 1.6);
    b.goalAt(122, 6);

    return b.build();
  })();

  // ============================================================
  // NIVEL 2 — Raíces Colgantes
  // ============================================================
  const L2 = (() => {
    const b = new Builder({ name: 'Raíces Colgantes', subtitle: 'Nivel 2', width: 150, time: 270, theme: THEMES[1] });
    b.spawnAt(3);
    b.ground(0, 18);
    b.ground(28, 50);
    b.ground(59, 88);
    b.ground(98, 149);

    b.snail(10);
    b.brick(13, 7, 4); b.q(15, 7);
    b.coinRow(13, 5, 4);

    // hueco 19-27: plataforma móvil
    b.mover(19, 9, 3, 'x', 6, 0.75);
    b.coinArc(19, 6, 9);
    b.fly(22, 4, 2.2);

    b.snail(32);
    b.spikes(36, 9, 3);
    b.coinRow(36, 7, 3);
    b.urchin(43);
    b.checkpoint(46);
    b.snail(48);

    // hueco 51-58: dos plataformas de madera
    b.plat(52, 8, 2);
    b.plat(56, 7, 2);
    b.coinRow(52, 7, 2);
    b.coinRow(56, 6, 2);
    b.fly(55, 5, 1.8);

    b.snail(61);
    b.brick(63, 7, 4); b.q(64, 7);
    b.coinRow(63, 5, 4);
    b.spikes(68, 9, 3);
    b.heart(73, 8);
    b.checkpoint(76);
    b.urchin(80);
    b.fly(85, 5, 2.4);

    // hueco 89-97: plataforma vertical
    b.mover(91, 9, 4, 'y', 4, 0.7);
    b.coinArc(90, 7, 8);

    b.snail(101);
    b.brick(105, 7, 5); b.q(107, 7);
    b.coinRow(105, 5, 5);
    b.checkpoint(112);
    b.urchin(117);
    b.spikes(120, 9, 2);
    b.coinRow(119, 7, 4);
    b.snail(125);
    b.fly(129, 5, 2);
    b.brick(132, 7, 4); b.q(134, 7);
    b.coinRow(132, 5, 4);

    b.wood(136, 9, 2);
    b.wood(139, 8, 8);
    b.coinRow(140, 7, 4);
    b.goalAt(143, 8);

    return b.build();
  })();

  // ============================================================
  // NIVEL 3 — Corazón del Manglar
  // ============================================================
  const L3 = (() => {
    const b = new Builder({ name: 'Corazón del Manglar', subtitle: 'Nivel 3', width: 158, time: 300, theme: THEMES[2] });
    b.spawnAt(3);
    b.ground(0, 13);
    b.ground(21, 35);
    b.ground(45, 60);
    b.ground(68, 84);
    b.ground(96, 124);
    b.ground(131, 157);

    b.snail(8);
    b.coinRow(4, 8, 3);

    // hueco 14-20
    b.mover(14, 9, 3, 'x', 4, 0.85);
    b.coinArc(14, 6, 8);
    b.fly(17, 4, 2);

    b.snail(24);
    b.brick(24, 7, 4); b.q(26, 7);
    b.spikes(27, 9, 2);
    b.coinRow(26, 5, 4);
    b.urchin(32);
    b.checkpoint(33);

    // hueco 36-44
    b.plat(37, 8, 2);
    b.plat(41, 7, 2);
    b.coinRow(37, 7, 2);
    b.coinRow(41, 6, 2);
    b.fly(40, 5, 1.8);

    b.snail(48);
    b.checkpoint(50);
    b.heart(52, 8);
    b.urchin(54);
    b.spikes(56, 9, 3);
    b.coinRow(56, 7, 3);
    b.brick(46, 7, 3);

    // hueco 61-67
    b.mover(62, 9, 3, 'y', 3, 0.8);
    b.coinArc(61, 6, 7);
    b.fly(64, 4, 1.6);

    b.snail(72);
    b.brick(73, 7, 5); b.q(75, 7);
    b.coinRow(73, 5, 5);
    b.urchin(79);
    b.checkpoint(81);

    // hueco 85-95
    b.mover(85, 9, 3, 'x', 6, 0.9);
    b.coinArc(85, 6, 10);
    b.fly(91, 4, 2.2);

    b.snail(100);
    b.brick(102, 7, 5); b.q(104, 7);
    b.coinRow(102, 5, 5);
    b.checkpoint(108);
    b.urchin(111);
    b.heart(114, 8);
    b.spikes(117, 9, 3);
    b.fly(121, 5, 2);
    b.snail(123);

    // hueco 125-130
    b.plat(126, 9, 2);
    b.plat(129, 8, 2);
    b.coinRow(126, 8, 2);
    b.coinRow(129, 7, 2);

    b.snail(135);
    b.urchin(140);
    b.spikes(144, 9, 2);
    b.coinRow(143, 7, 4);

    b.wood(147, 9, 2);
    b.wood(150, 8, 7);
    b.coinRow(151, 7, 4);
    b.goalAt(153, 8);
    b.fly(152, 4, 1.4);

    return b.build();
  })();

  window.SAPO_LEVELS = [L1, L2, L3];
  window.SAPO_THEMES = THEMES;
})();
