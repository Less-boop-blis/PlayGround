/* ============================================================
   SAPO SALVAJE — bucle de juego, controles e interfaz
   ============================================================ */
(function () {
  'use strict';
  const S = window.SAPO;
  const audio = window.SapoAudio;
  const { TILE, VW, VH, clamp, lerp, rand } = S;
  const R = S.render;
  const LEVELS = window.SAPO_LEVELS;
  const THEMES = window.SAPO_THEMES;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const card = document.getElementById('overlay-card');
  const toastEl = document.getElementById('toast');
  const btnMute = document.getElementById('btn-mute');
  const btnPause = document.getElementById('btn-pause');

  const STORE_KEY = 'sapo-salvaje-v1';
  let dpr = 1;

  /* ---------------- progreso guardado ---------------- */
  let progress = { best: 0, unlocked: 1 };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) progress = Object.assign(progress, JSON.parse(raw));
  } catch (e) { /* sin almacenamiento */ }
  progress.unlocked = clamp(progress.unlocked | 0, 1, LEVELS.length);
  progress.best = Math.max(0, progress.best | 0);
  const saveProgress = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* nada */ }
  };

  const isTouch = matchMedia('(pointer:coarse)').matches ||
    (('ontouchstart' in window) && Math.min(window.innerWidth, window.innerHeight) < 900) ||
    new URLSearchParams(location.search).has('touch');
  if (isTouch) document.body.classList.add('touch-mode');

  /* ---------------- estado ---------------- */
  const input = { left: false, right: false, jump: false };
  const game = {
    state: 'title',
    levelIndex: 0,
    selectedLevel: 0,
    lives: 3,
    coins: 0,
    score: 0,
    runKills: 0,
    levelCoins: 0,
    levelKills: 0,
    levelStartScore: 0,
    timeLeft: 240,
    stage: null,
    player: null,
    checkpoint: null,
    cam: { x: 0 },
    shake: 0,
    t: 0,
    deathT: 0,
    clearT: 0,
    clearShown: false,
    bonus: 0,
    fx: new S.FX(),
    hitBlock(cx, cy) { hitBlock(cx, cy); },
    bumpBlock(cx, cy) { bumpBlock(cx, cy); },
    onPlayerDeath(cause) { onPlayerDeath(cause); }
  };

  /* ---------------- utilidades ---------------- */
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function createStage(def) {
    const world = new S.World(def);
    const stage = {
      def, world,
      coins: def.coins.map(c => new S.Coin(c.x, c.y)),
      hearts: def.items.map(i => new S.Heart(i.x, i.y)),
      enemies: def.enemies.map(e => {
        let obj;
        if (e.type === 'snail') obj = new S.Snail(e.x, e.y);
        else if (e.type === 'fly') obj = new S.Fly(e.x, e.y, e.range);
        else obj = new S.Urchin(e.x, e.y);
        obj.ox = obj.x; obj.oy = obj.y; obj.odir = obj.dir || 1;
        return obj;
      }),
      checkpoints: def.checkpoints.map(c => new S.Checkpoint(c.x, c.y)),
      movers: def.movers.map(m => new S.Mover(m)),
      goal: def.goal,
      spawn: def.spawn
    };
    return stage;
  }

  /* ---------------- pantallas ---------------- */
  function levelChips() {
    return LEVELS.map((lvl, i) => {
      const locked = i >= progress.unlocked;
      const active = i === game.selectedLevel;
      return `<button type="button" class="chip ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''}"
        data-action="${locked ? 'locked' : 'select'}" data-level="${i}" ${locked ? 'disabled' : ''}
        title="${locked ? 'Completa el nivel anterior' : lvl.name}">${locked
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="10.5" rx="2.4" fill="currentColor"/><path d="M8 10V7.2a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>'
          : i + 1}</button>`;
    }).join('');
  }

  function showOverlay(html) {
    card.innerHTML = html;
    overlay.classList.remove('is-hidden');
    document.body.classList.add('in-menu');
    input.left = input.right = input.jump = false;
    const primary = card.querySelector('[data-primary]');
    if (primary && !isTouch) setTimeout(() => { try { primary.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 30);
  }
  function hideOverlay() {
    overlay.classList.add('is-hidden');
    document.body.classList.remove('in-menu');
  }

  function showTitle() {
    game.state = 'title';
    game.levelIndex = 0;
    game.selectedLevel = clamp(game.selectedLevel, 0, progress.unlocked - 1);
    game.lives = 3;
    game.coins = 0;
    game.score = 0;
    game.runKills = 0;
    game.checkpoint = null;
    game.player = null;
    game.stage = createStage(LEVELS[0]);
    game.cam.x = 90;
    game.shake = 0;
    game.fx.clear();
    audio.stopMusic();
    showOverlay(`
      <p class="eyebrow">La aventura del hombre sapo</p>
      <h1 class="logo">SAPO<span>SALVAJE</span></h1>
      <p class="lead">Tres pantanos, una flor de loto y un sapo con muy mala idea:
        saltar, pisar bichos y atrapar moscas con la lengua.</p>
      <div class="row">
        <button type="button" class="btn" data-action="play" data-primary>▶ Jugar</button>
      </div>
      <div class="levels">
        <span>Elige pantano</span>
        <div class="level-chips">${levelChips()}</div>
      </div>
      <div class="keys${isTouch ? ' touch-keys' : ''}">
        ${isTouch
          ? '<span>◀ ▶ moverte</span><span>Saltar</span><span>Lengua</span><span>Pausa</span>'
          : '<span><kbd>←</kbd><kbd>→</kbd> mover</span><span><kbd>Espacio</kbd> saltar (×2)</span><span><kbd>X</kbd> lengua</span><span><kbd>P</kbd> pausa</span>'}
      </div>
      <p class="tip">Salta otra vez en el aire para el doble salto. La lengua se come bichos y atrae luciérnagas.<br>
        ${isTouch ? 'Gira el móvil en horizontal para jugar más cómodo.' : 'Junta 50 luciérnagas para ganar una vida extra.'}</p>
      <p class="best">Récord · <b>${progress.best}</b> puntos</p>
    `);
  }

  function showPause() {
    showOverlay(`
      <p class="eyebrow">en pausa</p>
      <h2>Respira, sapo</h2>
      <p class="lead">El pantano puede esperar. Aprovecha para estirar las patas.</p>
      <div class="row">
        <button type="button" class="btn" data-action="resume" data-primary>Continuar</button>
        <button type="button" class="btn secondary" data-action="restart">Reiniciar nivel</button>
        <button type="button" class="btn ghost" data-action="menu">Menú</button>
      </div>
    `);
  }

  function showLevelComplete() {
    const last = game.levelIndex >= LEVELS.length - 1;
    showOverlay(`
      <p class="eyebrow">${last ? 'último pantano superado' : 'pantano ' + (game.levelIndex + 1) + ' superado'}</p>
      <h2>¡Croac! ¡Bien hecho!</h2>
      <div class="stats">
        <div><b>${game.levelCoins}</b><span>luciérnagas</span></div>
        <div><b>${game.levelKills}</b><span>bichos</span></div>
        <div><b>${Math.max(0, Math.floor(game.timeLeft))}</b><span>segundos</span></div>
        <div><b>+${game.bonus}</b><span>bonus</span></div>
      </div>
      <p class="lead">Puntuación total: <b>${game.score}</b></p>
      <div class="row">
        <button type="button" class="btn" data-action="next" data-primary>${last ? 'Ver final' : 'Siguiente pantano'} →</button>
        <button type="button" class="btn ghost" data-action="menu">Menú</button>
      </div>
    `);
  }

  function showGameOver() {
    saveBest();
    audio.stopMusic();
    audio.gameover();
    game.state = 'gameover';
    showOverlay(`
      <p class="eyebrow">se acabaron las vidas</p>
      <h2>¡Sapo aplastado!</h2>
      <div class="stats">
        <div><b>${game.levelIndex + 1}</b><span>pantano</span></div>
        <div><b>${game.coins}</b><span>luciérnagas</span></div>
        <div><b>${game.runKills}</b><span>bichos</span></div>
        <div><b>${game.score}</b><span>puntos</span></div>
      </div>
      <p class="lead">El pantano es duro, pero tú eres más. ¿Otra vuelta?</p>
      <div class="row">
        <button type="button" class="btn" data-action="retry" data-primary>Reintentar nivel</button>
        <button type="button" class="btn ghost" data-action="menu">Menú</button>
      </div>
    `);
  }

  function showWin() {
    game.state = 'win';
    saveBest();
    audio.stopMusic();
    showOverlay(`
      <p class="eyebrow">los tres pantanos</p>
      <h2>¡Leyenda del manglar!</h2>
      <div class="stats">
        <div><b>${game.score}</b><span>puntos</span></div>
        <div><b>${game.coins}</b><span>luciérnagas</span></div>
        <div><b>${game.runKills}</b><span>bichos</span></div>
        <div><b>${progress.best}</b><span>récord</span></div>
      </div>
      <p class="lead">Has cruzado el pantano, las raíces y el manglar. La flor de loto ya tiene dueño.</p>
      <div class="row">
        <button type="button" class="btn" data-action="again" data-primary>Jugar otra vez</button>
        <button type="button" class="btn ghost" data-action="menu">Menú</button>
      </div>
    `);
  }

  /* ---------------- flujo de partida ---------------- */
  function resetEnemies() {
    for (const e of game.stage.enemies) {
      e.x = e.ox;
      e.y = e.oy;
      e.dead = false;
      e.deadT = 0;
      if (e.dir !== undefined) e.dir = e.odir;
      if (e.type === 'fly') e.t = Math.random() * 6.28;
    }
  }

  function respawnPlayer() {
    const stage = game.stage;
    const sp = game.checkpoint ? { x: game.checkpoint.x, y: game.checkpoint.y - 1 } : stage.spawn;
    game.player = new S.Player(sp.x, sp.y);
    game.player.invuln = 1.8;
    resetEnemies();
    game.cam.x = clamp(sp.x - VW * 0.42, 0, stage.world.pixelW - VW);
  }

  function startLevel(index) {
    const def = LEVELS[index];
    game.levelIndex = index;
    game.selectedLevel = index;
    game.stage = createStage(def);
    game.timeLeft = def.time;
    game.levelStartScore = game.score;
    game.levelCoins = 0;
    game.levelKills = 0;
    game.checkpoint = null;
    game.player = null;
    game.shake = 0;
    game.deathT = 0;
    game.clearT = 0;
    game.clearShown = false;
    game.bonus = 0;
    game.fx.clear();
    respawnPlayer();
    game.state = 'playing';
    hideOverlay();
    showToast('Nivel ' + (index + 1) + ' · ' + def.name, 2.1);
    audio.unlock();
    audio.startMusic();
  }

  function startRun(index) {
    audio.unlock();
    game.lives = 3;
    game.coins = 0;
    game.score = 0;
    game.runKills = 0;
    startLevel(clamp(index, 0, LEVELS.length - 1));
  }

  function retryLevel() {
    game.lives = 3;
    game.coins = 0;
    game.score = game.levelStartScore;
    startLevel(game.levelIndex);
  }

  function onPlayerDeath(cause) {
    if (game.state !== 'playing') return;
    game.state = 'dying';
    game.deathT = 0;
    game.shake = 14;
    game.lives = Math.max(0, game.lives - 1);
    const p = game.player;
    if (cause === 'water') {
      audio.splash();
      game.fx.splash(p.x, 10 * TILE);
    } else if (cause === 'spikes') {
      audio.hurt();
      game.fx.burst(p.x, p.y - 20, '#ffd0c4', 14, 260, { up: 120 });
    } else if (cause === 'time') {
      audio.hurt();
    } else {
      audio.hurt();
      game.fx.burst(p.x, p.y - 22, '#ffd0c4', 14, 260, { up: 120 });
    }
  }

  function gameOver() {
    game.state = 'gameover';
    showGameOver();
  }

  function completeLevel() {
    if (game.state !== 'playing') return;
    game.state = 'levelclear';
    game.clearT = 0;
    game.clearShown = false;
    game.bonus = Math.floor(game.timeLeft) * 10 + 100;
    game.score += game.bonus;
    game.fx.confetti(game.stage.goal.x, game.stage.goal.y - 170, 44);
    game.shake = 6;
    audio.stopMusic();
    audio.win();
    progress.unlocked = clamp(Math.max(progress.unlocked, game.levelIndex + 2), 1, LEVELS.length);
    saveProgress();
    saveBest();
  }

  function saveBest() {
    if (game.score > progress.best) progress.best = game.score;
    saveProgress();
  }

  /* ---------------- interacciones ---------------- */
  function addLife() {
    game.lives = Math.min(9, game.lives + 1);
    audio.life();
    showToast('¡Vida extra! +1', 1.7);
    game.fx.burst(game.player.x, game.player.y - 40, '#ff8fb0', 16, 280);
  }

  function collectCoin(c) {
    if (c.gone) return;
    c.gone = true;
    game.coins++;
    game.levelCoins++;
    game.score += 10;
    audio.coin();
    game.fx.burst(c.x, c.y, '#ffe27a', 7, 150, { grav: 120 });
    game.fx.text(c.x, c.y - 16, '+10', '#ffe9a3');
    if (game.coins % 50 === 0) addLife();
  }

  function killEnemy(e, source) {
    if (e.dead) return;
    e.dead = true;
    e.deadT = 0;
    const pts = source === 'stomp' ? 100 : 150;
    game.score += pts;
    game.levelKills++;
    game.runKills++;
    audio.stomp();
    const col = e.type === 'snail' ? '#f0b968' : e.type === 'fly' ? '#c79bea' : '#9a6aa6';
    game.fx.burst(e.x, e.y, col, 12, 230);
    game.fx.text(e.x, e.y - 20, '+' + pts, '#ffd76e');
    game.shake = Math.max(game.shake, 4);
    if (source === 'stomp') {
      const p = game.player;
      p.vy = -610;
      p.onGround = false;
      p.airJumps = 1;
      p.stretchX = 0.85;
      p.stretchY = 1.2;
    }
  }

  function hitBlock(cx, cy) {
    const w = game.stage.world;
    if (w.at(cx, cy) !== '?') return;
    w.grid[cy][cx] = '!';
    audio.block();
    game.coins++;
    game.levelCoins++;
    game.score += 10;
    audio.coin();
    const px = cx * TILE + TILE / 2;
    const py = cy * TILE;
    game.fx.burst(px, py, '#ffd85e', 13, 230, { up: 140 });
    game.fx.text(px, py - 20, '+10', '#ffe9a3');
    game.shake = Math.max(game.shake, 3);
    if (game.coins % 50 === 0) addLife();
  }

  function bumpBlock(cx, cy) {
    audio.block();
    game.fx.burst(cx * TILE + TILE / 2, cy * TILE + 4, 'rgba(220,240,190,0.8)', 4, 90, { grav: 400 });
  }

  function handleTongue() {
    const p = game.player;
    const tb = p.tongueBox();
    if (!tb || tb.len < 10) return;
    for (const e of game.stage.enemies) {
      if (e.dead) continue;
      if (overlap(tb, e.box)) killEnemy(e, 'tongue');
    }
  }

  function handleCoins(dt) {
    const p = game.player;
    const pb = p.getBox();
    const mouth = { x: p.x + p.dir * 12, y: p.y - p.h * 0.62 };
    for (const c of game.stage.coins) {
      if (c.gone) continue;
      if (p.tongue > 0) {
        const dx = mouth.x - c.x;
        const dy = mouth.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 175) c.pulled = true;
        if (c.pulled) {
          const spd = Math.min(1200, 480 + dist * 5);
          c.x += (dx / Math.max(dist, 1)) * spd * dt;
          c.y += (dy / Math.max(dist, 1)) * spd * dt;
          if (Math.hypot(mouth.x - c.x, mouth.y - c.y) < 27) { collectCoin(c); continue; }
        }
      } else {
        c.pulled = false;
      }
      if (overlap(pb, { x: c.x - 13, y: c.y - 13, w: 26, h: 26 })) collectCoin(c);
    }
  }

  function handleEnemies() {
    const p = game.player;
    const pb = p.getBox();
    for (const e of game.stage.enemies) {
      if (e.dead) continue;
      const box = e.box;
      if (!overlap(pb, box)) continue;
      if (p.invuln > 0) continue;
      const stomping = e.stompable && p.vy > 40 && p.prevFeet <= box.y + 14;
      if (stomping) {
        killEnemy(e, 'stomp');
      } else {
        p.die(game, 'enemy');
        break;
      }
    }
  }

  function handleItems() {
    const p = game.player;
    const pb = p.getBox();
    for (const h of game.stage.hearts) {
      if (h.gone) continue;
      if (overlap(pb, { x: h.x - 16, y: h.y - 16, w: 32, h: 32 })) {
        h.gone = true;
        addLife();
        game.fx.burst(h.x, h.y, '#ff8fb0', 16, 250);
      }
    }
    for (const cp of game.stage.checkpoints) {
      if (cp.active) continue;
      if (overlap(pb, { x: cp.x - 30, y: cp.y - 90, w: 60, h: 90 })) {
        cp.active = true;
        game.checkpoint = cp;
        audio.checkpoint();
        game.fx.burst(cp.x, cp.y - 50, '#d7ff8a', 18, 230);
        game.fx.text(cp.x, cp.y - 76, '¡Control!', '#d7ff8a');
        showToast('Punto de control guardado', 1.8);
      }
    }
  }

  function checkGoal() {
    const g = game.stage.goal;
    const pb = game.player.getBox();
    if (overlap(pb, { x: g.x - 46, y: g.y - 215, w: 92, h: 215 })) completeLevel();
  }

  /* ---------------- actualización ---------------- */
  function updateCamera(dt) {
    const stage = game.stage;
    const target = clamp(game.player.x - VW * 0.42 + game.player.dir * 46, 0, stage.world.pixelW - VW);
    game.cam.x = lerp(game.cam.x, target, 1 - Math.pow(0.0005, dt));
    game.shake = Math.max(0, game.shake - 46 * dt);
  }

  function updateTitle(dt) {
    const stage = game.stage;
    game.cam.x = 120 + Math.sin(game.t * 0.11) * 80;
    if (stage) {
      for (const c of stage.coins) c.update(dt);
      for (const h of stage.hearts) h.update(dt);
      for (const cp of stage.checkpoints) cp.update(dt);
      for (const e of stage.enemies) if (!e.dead) e.update(dt, stage.world);
      for (const m of stage.movers) m.update(dt);
    }
    game.fx.update(dt);
  }

  function update(dt) {
    game.t += dt;
    game.shake = Math.max(0, game.shake - 46 * dt);

    if (game.state === 'title') { updateTitle(dt); return; }
    if (!game.stage) return;
    if (game.state === 'paused' || game.state === 'gameover' || game.state === 'win') {
      game.fx.update(dt * 0.25);
      return;
    }

    const stage = game.stage;
    for (const m of stage.movers) m.update(dt);
    for (const c of stage.coins) c.update(dt);
    for (const h of stage.hearts) h.update(dt);
    for (const cp of stage.checkpoints) cp.update(dt);
    game.fx.update(dt);

    if (game.state === 'playing') {
      game.timeLeft -= dt;
      if (game.timeLeft <= 0) {
        game.timeLeft = 0;
        game.player.die(game, 'time');
      }
      if (game.state === 'playing') {
        const p = game.player;
        p.update(dt, input, stage.world, stage.movers, game);
        for (const e of stage.enemies) e.update(dt, stage.world);
        if (!p.dead) {
          if (p.tongue > 0) handleTongue();
          handleCoins(dt);
          handleEnemies();
          if (!p.dead) {
            handleItems();
            checkGoal();
          }
        }
        updateCamera(dt);
      }
    } else if (game.state === 'dying') {
      game.player.animateDeath(dt);
      for (const e of stage.enemies) e.update(dt, stage.world);
      game.deathT += dt;
      updateCamera(dt);
      if (game.deathT > 1.35) {
        if (game.lives > 0) {
          if (game.timeLeft < 40) game.timeLeft = Math.max(60, stage.def.time * 0.5);
          respawnPlayer();
          game.state = 'playing';
          game.deathT = 0;
        } else {
          gameOver();
        }
      }
    } else if (game.state === 'levelclear') {
      game.clearT += dt;
      game.player.vx = 0;
      if (!game.clearShown && game.clearT > 1.6) {
        game.clearShown = true;
        showLevelComplete();
      }
      if (game.clearT < 1.4 && Math.random() < dt * 14) {
        game.fx.confetti(stage.goal.x + rand(-70, 70), stage.goal.y - rand(120, 240), 8);
      }
      for (const e of stage.enemies) e.update(dt, stage.world);
      updateCamera(dt);
    }
  }

  /* ---------------- dibujo ---------------- */
  function drawStage(camX) {
    const stage = game.stage;
    const theme = stage.world.theme;
    R.background(ctx, theme, game.t, camX);
    R.water(ctx, stage.world, theme, game.t, camX);
    R.tiles(ctx, stage.world, theme, game.t, camX);
    for (const cp of stage.checkpoints) R.checkpoint(ctx, cp, camX, game.t);
    R.goal(ctx, stage.goal, camX, game.t, theme);
    for (const m of stage.movers) R.mover(ctx, m, camX, game.t, theme);
    for (const c of stage.coins) if (!c.gone) R.coin(ctx, c, camX, game.t);
    for (const h of stage.hearts) if (!h.gone) R.heart(ctx, h, camX, game.t);
    for (const e of stage.enemies) {
      if (e.dead && e.deadT > 0.7) continue;
      if (e.type === 'snail') R.snail(ctx, e, camX, game.t);
      else if (e.type === 'fly') R.fly(ctx, e, camX, game.t);
      else R.urchin(ctx, e, camX, game.t);
    }
  }

  function render() {
    const dprNow = 1;
    if (dprNow !== dpr) {
      dpr = dprNow;
      canvas.width = Math.round(VW * dpr);
      canvas.height = Math.round(VH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VW, VH);

    const stage = game.stage;
    const camX = stage ? game.cam.x : 0;
    const sx = game.shake ? rand(-game.shake, game.shake) : 0;
    const sy = game.shake ? rand(-game.shake, game.shake) : 0;

    ctx.save();
    ctx.translate(sx, sy);
    if (stage) {
      drawStage(camX);
      if (game.player) {
        R.player(ctx, game.player, camX, game.t);
      }
      game.fx.draw(ctx, camX);
    } else {
      R.background(ctx, THEMES[0], game.t, 0);
    }
    ctx.restore();

    if (stage && game.player && (game.state === 'playing' || game.state === 'dying' ||
        game.state === 'paused' || game.state === 'levelclear')) {
      R.hud(ctx, game);
    }
  }

  /* ---------------- avisos ---------------- */
  let toastTimer = 0;
  function showToast(text, dur = 1.8) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur * 1000);
  }

  /* ---------------- pausa / sonido ---------------- */
  function pause() {
    if (game.state !== 'playing') return;
    game.state = 'paused';
    showPause();
  }
  function resume() {
    if (game.state !== 'paused') return;
    game.state = 'playing';
    hideOverlay();
    audio.unlock();
  }
  function togglePause() {
    if (game.state === 'playing') pause();
    else if (game.state === 'paused') resume();
  }
  const portraitQuery = matchMedia('(orientation: portrait)');
  portraitQuery.addEventListener('change', (e) => {
    if (isTouch && e.matches) pause();
  });
  if (isTouch && portraitQuery.matches) {
    setTimeout(() => pause(), 0);
  }
  function toggleMute() {
    audio.unlock();
    audio.setMuted(!audio.muted);
    document.body.classList.toggle('muted', audio.muted);
    showToast(audio.muted ? 'Sonido silenciado' : 'Sonido activado', 1.2);
  }
  btnMute.addEventListener('click', toggleMute);
  btnPause.addEventListener('click', togglePause);

  /* ---------------- acciones de la interfaz ---------------- */
  overlay.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    audio.unlock();
    if (action === 'play') {
      audio.select();
      startRun(game.selectedLevel);
    } else if (action === 'select') {
      const i = parseInt(btn.dataset.level, 10);
      if (!isNaN(i) && i < progress.unlocked) {
        game.selectedLevel = i;
        audio.select();
        showTitle();
      }
    } else if (action === 'next') {
      audio.select();
      if (game.levelIndex + 1 < LEVELS.length) startLevel(game.levelIndex + 1);
      else showWin();
    } else if (action === 'retry') {
      audio.select();
      retryLevel();
    } else if (action === 'restart') {
      audio.select();
      startLevel(game.levelIndex);
    } else if (action === 'resume') {
      resume();
    } else if (action === 'menu') {
      audio.select();
      showTitle();
    } else if (action === 'again') {
      audio.select();
      startRun(0);
    }
  });

  /* ---------------- teclado ---------------- */
  const JUMP_KEYS = ['arrowup', 'w', ' ', 'spacebar', 'z'];
  const LEFT_KEYS = ['arrowleft', 'a'];
  const RIGHT_KEYS = ['arrowright', 'd'];
  const TONGUE_KEYS = ['x', 'j', 'shift'];

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'spacebar'].includes(k)) ev.preventDefault();
    audio.unlock();

    if (k === 'enter') {
      if (!overlay.classList.contains('is-hidden')) {
        const primary = card.querySelector('[data-primary]');
        if (primary) { ev.preventDefault(); primary.click(); }
      }
      return;
    }
    if (k === 'm') { toggleMute(); return; }
    if (k === 'p' || k === 'escape') { ev.preventDefault(); togglePause(); return; }

    if (LEFT_KEYS.includes(k)) input.left = true;
    if (RIGHT_KEYS.includes(k)) input.right = true;
    if (JUMP_KEYS.includes(k)) {
      if (ev.repeat) return;
      input.jump = true;
      if (game.state === 'playing') game.player.queueJump();
    }
    if (TONGUE_KEYS.includes(k)) {
      if (ev.repeat) return;
      if (game.state === 'playing') game.player.attack(game);
    }
  });

  window.addEventListener('keyup', (ev) => {
    const k = ev.key.toLowerCase();
    if (LEFT_KEYS.includes(k)) input.left = false;
    if (RIGHT_KEYS.includes(k)) input.right = false;
    if (JUMP_KEYS.includes(k)) input.jump = false;
  });

  window.addEventListener('blur', () => {
    input.left = input.right = input.jump = false;
    if (game.state === 'playing') pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') pause();
  });

  /* ---------------- táctil ---------------- */
  const padEls = document.querySelectorAll('[data-touch]');
  padEls.forEach((btn) => {
    const action = btn.dataset.touch;
    const release = () => {
      btn.classList.remove('pressed');
      if (action === 'left') input.left = false;
      else if (action === 'right') input.right = false;
      else if (action === 'jump') input.jump = false;
    };
    btn.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      audio.unlock();
      btn.classList.add('pressed');
      try { btn.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      if (action === 'left') input.left = true;
      else if (action === 'right') input.right = true;
      else if (action === 'jump') {
        input.jump = true;
        if (game.state === 'playing') game.player.queueJump();
      } else if (action === 'tongue') {
        if (game.state === 'playing') game.player.attack(game);
      }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => {
      btn.addEventListener(name, release);
    });
    btn.addEventListener('contextmenu', (ev) => ev.preventDefault());
  });

  document.addEventListener('gesturestart', (ev) => ev.preventDefault());
  document.addEventListener('dblclick', (ev) => ev.preventDefault());

  /* ---------------- bucle ---------------- */
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 1 / 30);
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    // el CSS escala el lienzo; resolvemos siempre a 960×576 para mantener 60 fps
    if (canvas.width !== VW || canvas.height !== VH) {
      canvas.width = VW;
      canvas.height = VH;
      dpr = 1;
    }
  });

  showTitle();
  requestAnimationFrame(loop);

  // gancho de depuración: /?debug=1
  if (new URLSearchParams(location.search).has('debug')) {
    window.__sapo = { game, startLevel, startRun, completeLevel, respawnPlayer, input, progress };
  }
})();
