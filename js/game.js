import { createLevel, T, TILE, SOLID, GROUND_ROW, COLS, ROWS } from './level.js'
import { createArt } from './art.js'

const VIEW_W = 480
const VIEW_H = 272
const STEP = 1 / 60
const GRAVITY = 1500
const MAX_FALL = 560

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const approach = (v, target, delta) => {
  if (v < target) return Math.min(v + delta, target)
  if (v > target) return Math.max(v - delta, target)
  return v
}

function hash(x, y) {
  let h = x * 374761393 + y * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967296
}

class Player {
  constructor(x, y) {
    this.w = 10
    this.h = 20
    this.reset(x, y)
  }

  reset(x, y) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.onGround = false
    this.coyote = 0
    this.jumpBuffer = 0
    this.prevJump = false
    this.facing = 1
    this.runAnim = 0
    this.landSquash = 0
    this.invuln = 0
    this.shield = false
    this.dead = false
    this.deadTimer = 0
    this.standingOn = null
    this.prevBottom = y + this.h
    this.stepOffset = 0
  }

  update(dt, game) {
    if (this.dead) {
      this.deadTimer += dt
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL)
      this.y += this.vy * dt
      return
    }

    const input = game.input
    this.invuln = Math.max(0, this.invuln - dt)
    this.landSquash = Math.max(0, this.landSquash - dt * 5)
    this.prevBottom = this.y + this.h

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    const maxSpeed = input.run ? 246 : 156
    const accel = this.onGround ? 1500 : 950

    if (dir !== 0) {
      this.vx = approach(this.vx, dir * maxSpeed, accel * dt)
      this.facing = dir
    } else {
      this.vx = approach(this.vx, 0, (this.onGround ? 2000 : 420) * dt)
    }

    if (Math.abs(this.vx) > 12) this.runAnim += dt * (3 + Math.abs(this.vx) * 0.055)

    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt)
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt)
    const jumpPressed = input.jump && !this.prevJump
    this.prevJump = input.jump
    if (jumpPressed) this.jumpBuffer = 0.12

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -465
      this.onGround = false
      this.standingOn = null
      this.coyote = 0
      this.jumpBuffer = 0
      this.landSquash = 0
      game.audio.jump()
      game.spawnDust(this.x + this.w / 2, this.y + this.h, 4)
    }

    if (!input.jump && this.vy < -150) this.vy = -150
    this.vy = Math.min(this.vy + (this.vy < 0 ? 1280 : 1580) * dt, MAX_FALL)

    // Movimiento y colisiones
    const wasGround = this.onGround
    const fallSpeed = this.vy
    this.onGround = false

    if (this.vx !== 0) {
      const hitWall = game.moveEntityX(this, this.vx * dt)
      if (hitWall) this.vx = 0
    }

    const landed = game.moveEntityY(this, this.vy * dt, true)
    if (landed) {
      if (fallSpeed > 220) {
        this.landSquash = Math.min(1, fallSpeed / 700)
        game.spawnDust(this.x + this.w / 2, this.y + this.h, 6)
        game.shake = Math.max(game.shake, 1.2)
      }
      this.vy = 0
      this.onGround = true
    }

    if (!this.onGround && wasGround) this.coyote = Math.max(this.coyote, 0.1)

    if (this.y > VIEW_H + 40) game.killPlayer('pit')
  }

  hit(game) {
    if (this.dead || this.invuln > 0) return
    if (this.shield) {
      this.shield = false
      this.invuln = 1.4
      this.vy = -220
      this.vx = -this.facing * 130
      game.audio.shieldPop()
      game.shake = Math.max(game.shake, 4)
      game.burst(this.x + this.w / 2, this.y + 10, '#9fe8ff', 14)
      game.addText(this.x + this.w / 2, this.y - 6, '¡BURBUJA!', '#9fe8ff')
      return
    }
    game.killPlayer('enemy')
  }
}

const ENEMY_DEFS = {
  grumo: { w: 13, h: 12, score: 200, stompable: true },
  salto: { w: 13, h: 12, score: 300, stompable: true },
  mosca: { w: 12, h: 10, score: 250, stompable: true },
}

class Enemy {
  constructor(type, spawn) {
    const def = ENEMY_DEFS[type]
    this.type = type
    this.w = def.w
    this.h = def.h
    this.score = def.score
    this.stompable = def.stompable
    this.x = spawn.x
    this.y = spawn.y - this.h
    this.spawnX = this.x
    this.spawnY = this.y
    this.vx = 0
    this.vy = 0
    this.dir = Math.random() > 0.5 ? 1 : -1
    this.t = Math.random() * 3
    this.hopTimer = 0.6 + Math.random() * 0.8
    this.onGround = false
    this.dying = false
    this.dyingT = 0
    this.dead = false
    this.squashed = false
    this.wings = Math.random() * 6
    if (type === 'mosca') {
      this.dir = Math.random() > 0.5 ? 1 : -1
      this.range = 54
    }
  }

  update(dt, game) {
    this.t += dt
    this.wings += dt * 22

    if (this.dying) {
      this.dyingT += dt
      if (this.type === 'mosca') {
        this.vy += GRAVITY * 0.7 * dt
        this.y += this.vy * dt
        this.x += this.vx * dt
      }
      if (this.dyingT > 0.5 || this.y > VIEW_H + 40) this.dead = true
      return
    }

    if (this.type === 'grumo') {
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL)
      if (game.moveEntityX(this, this.dir * 38 * dt)) this.dir *= -1
      if (Math.abs(this.x - this.spawnX) > 86) this.dir = this.x > this.spawnX ? -1 : 1
      if (this.onGround) {
        const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2
        const footY = this.y + this.h + 2
        const aheadTX = Math.floor(aheadX / TILE)
        const aheadTY = Math.floor(footY / TILE)
        if (
          (!game.isSolidAt(aheadX, footY) && !game.isPlatformAt(aheadX, footY)) ||
          game.getTile(aheadTX, aheadTY) === T.SPIKE
        ) this.dir *= -1
      }
      const landed = game.moveEntityY(this, this.vy * dt, true)
      if (landed) {
        this.vy = 0
        this.onGround = true
      } else {
        this.onGround = false
      }
    } else if (this.type === 'salto') {
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL)
      if (game.moveEntityX(this, this.vx * dt)) {
        this.vx *= -0.6
        this.dir *= -1
      }
      const landed = game.moveEntityY(this, this.vy * dt, true)
      if (landed) {
        this.vy = 0
        this.onGround = true
      } else {
        this.onGround = false
      }
      if (this.onGround) {
        this.vx = approach(this.vx, 0, 500 * dt)
        this.hopTimer -= dt
        if (this.hopTimer <= 0) {
          const dx = game.player.x - this.x
          if (Math.abs(dx) < 220) this.dir = dx > 0 ? 1 : -1
          this.vy = -310
          this.vx = this.dir * 92
          this.onGround = false
          this.hopTimer = 1.25 + Math.random() * 0.6
          game.spawnDust(this.x + this.w / 2, this.y + this.h, 3)
        }
      }
    } else if (this.type === 'mosca') {
      this.x = this.spawnX + Math.sin(this.t * 0.9 + this.wings * 0.1) * this.range
      this.y = this.spawnY + Math.sin(this.t * 2.4) * 13
    }

    if (this.y > VIEW_H + 60) this.dead = true
  }

  stomp(game) {
    if (!this.stompable || this.dying) return
    this.dying = true
    this.dyingT = 0
    this.squashed = this.type !== 'mosca'
    this.vx = 0
    this.vy = this.type === 'mosca' ? -80 : 0
    game.score += this.score
    game.addText(this.x + this.w / 2, this.y - 4, `+${this.score}`, '#ffe58a')
    game.burst(this.x + this.w / 2, this.y + this.h / 2, this.type === 'mosca' ? '#d9b3ff' : '#e59a5c', 10)
    game.audio.stomp()
    game.freeze = Math.max(game.freeze, 0.045)
    game.shake = Math.max(game.shake, 2.5)
  }
}

export class Game {
  constructor(canvas, ui, audio) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.ctx.imageSmoothingEnabled = false
    this.art = createArt()
    this.ui = ui
    this.audio = audio
    this.state = 'title'
    this.input = { left: false, right: false, jump: false, run: false }
    this.time = 0
    this.acc = 0
    try {
      this.best = Number(localStorage.getItem('sapobros.best') || 0) || 0
    } catch {
      this.best = 0
    }
    this.resetWorld()
    this.state = 'title'
    this.ui.setBest(this.best)
  }

  resetWorld() {
    const level = createLevel()
    this.level = level
    this.player = new Player(level.spawn.x, level.spawn.y)
    this.coins = level.coins.map((c, i) => ({ ...c, phase: i * 0.7, taken: false }))
    this.enemies = level.enemies.map((s) => new Enemy(s.type, s))
    this.platforms = level.platforms.map((p) => ({ ...p, x: p.ox, y: p.oy, dx: 0, dy: 0 }))
    this.checkpoints = level.checkpoints.map((c) => ({ ...c }))
    this.particles = []
    this.texts = []
    this.powerups = []
    this.bumps = new Map()
    this.camera = { x: 0 }
    this.checkpoint = { x: level.spawn.x, y: level.spawn.y, time: 300 }
    this.score = 0
    this.coinsCount = 0
    this.lives = 3
    this.timeLeft = 300
    this.shake = 0
    this.freeze = 0
    this.deathT = 0
    this.victoryTimer = 0
    this.confettiTimer = 0
    this.won = false
    this.lastHud = ''
    this.clouds = Array.from({ length: 18 }, (_, i) => ({
      x: i * 176 + ((i * 137) % 150),
      y: 14 + ((i * 61) % 88),
      s: i % 3,
      p: 0.06 + (i % 3) * 0.05,
      a: 0.5 + (i % 2) * 0.25,
    }))
    this._vignette = null
  }

  startRun() {
    this.resetWorld()
    this.state = 'playing'
    this.acc = 0
    this.ui.showScreen(null)
    this.ui.setPlaying(true)
    this.ui.setHud(this.hudData())
    this.audio.unlock()
    this.audio.startMusic()
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused'
      this.ui.setPlaying(false)
      this.ui.showScreen('pause')
      this.audio.stopMusic()
    } else if (this.state === 'paused') {
      this.state = 'playing'
      this.ui.setPlaying(true)
      this.ui.showScreen(null)
      this.audio.startMusic()
    }
  }

  backToTitle() {
    this.resetWorld()
    this.state = 'title'
    this.ui.showScreen('title')
    this.ui.setPlaying(false)
    this.audio.stopMusic()
  }

  frame(dt) {
    this.time += dt
    if (this.state === 'paused') {
      this.render()
      return
    }
    if (this.state === 'title') {
      this.updateTitle(dt)
      this.render()
      return
    }
    this.acc += Math.min(dt, 0.1)
    let guard = 0
    while (this.acc >= STEP && guard < 6) {
      this.update(STEP)
      this.acc -= STEP
      guard++
    }
    this.render()
  }

  updateTitle(dt) {
    this.camera.x = 40 + Math.sin(this.time * 0.12) * 40
    this.updatePlatforms(dt)
    this.updateParticles(dt)
    for (const coin of this.coins) coin.phase += dt
  }

  update(dt) {
    const playing = this.state === 'playing'

    if (this.freeze > 0) {
      this.freeze -= dt
    } else {
      if (playing && !this.player.dead) {
        this.timeLeft = Math.max(0, this.timeLeft - dt)
        if (this.timeLeft <= 0) this.killPlayer('time')
      }

      this.updatePlatforms(dt)
      this.player.update(dt, this)
      if (!this.player.onGround) this.player.standingOn = null

      if (!this.player.dead) {
        this.updateEnemies(dt)
        this.updateCoins(dt)
        this.updatePowerups(dt)
        this.checkHazards()
      }
      this.updateBumps(dt)
      this.updateParticles(dt)
      this.updateTexts(dt)
      this.checkCheckpoints()
      this.checkGoal()
    }

    this.updateCamera(dt)

    if (this.state === 'victory') {
      this.victoryTimer += dt
      this.confettiTimer -= dt
      if (this.confettiTimer <= 0 && this.victoryTimer < 3.2) {
        this.confettiTimer = 0.12
        this.spawnConfetti()
      }
      if (this.victoryTimer > 1.25 && !this.ui.screenShown('victory')) {
        this.ui.showVictory({
          score: this.score,
          coins: this.coinsCount,
          bonus: this.timeBonus || 0,
        })
      }
    }

    if (this.player.dead && playing) {
      this.deathT += dt
      if (this.deathT > 1.45) {
        if (this.lives > 0) this.respawn()
        else this.gameOver()
      }
    }

    this.updateHud()
  }

  hudData() {
    return {
      lives: Math.max(0, this.lives),
      coins: this.coinsCount,
      score: this.score,
      time: Math.ceil(this.timeLeft),
      warn: this.timeLeft < 30 && this.state === 'playing',
    }
  }

  updateHud() {
    const data = this.hudData()
    const key = `${data.lives}|${data.coins}|${data.score}|${data.time}|${data.warn}`
    if (key === this.lastHud) return
    this.lastHud = key
    this.ui.setHud(data)
  }

  updatePlatforms(dt) {
    for (const p of this.platforms) {
      p.dx = 0
      p.dy = 0
      const offset = Math.sin(this.time * (p.speed / Math.max(1, p.range)) + p.phase) * p.range
      const nx = p.axis === 'x' ? p.ox + offset : p.ox
      const ny = p.axis === 'y' ? p.oy + offset : p.oy
      p.dx = nx - p.x
      p.dy = ny - p.y
      p.x = nx
      p.y = ny
    }
    if (this.player.standingOn && this.player.standingOn.type === 'platform') {
      const plat = this.player.standingOn.ref
      if (this.platforms.includes(plat) && !this.player.dead) {
        this.player.x += plat.dx
        this.player.y += plat.dy
      }
    }
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return T.EMPTY
    return this.level.tiles[ty * COLS + tx]
  }

  setTile(tx, ty, value) {
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return
    this.level.tiles[ty * COLS + tx] = value
  }

  isSolidAt(px, py) {
    return SOLID.has(this.getTile(Math.floor(px / TILE), Math.floor(py / TILE)))
  }

  isPlatformAt(px, py) {
    return this.getTile(Math.floor(px / TILE), Math.floor(py / TILE)) === T.PLATFORM
  }

  moveEntityX(ent, dx) {
    ent.x += dx
    if (dx === 0) return false
    const y0 = Math.floor(ent.y / TILE)
    const y1 = Math.floor((ent.y + ent.h - 0.01) / TILE)
    if (dx > 0) {
      const tx = Math.floor((ent.x + ent.w - 0.01) / TILE)
      for (let ty = y0; ty <= y1; ty++) {
        if (SOLID.has(this.getTile(tx, ty))) {
          ent.x = tx * TILE - ent.w
          return true
        }
      }
    } else {
      const tx = Math.floor(ent.x / TILE)
      for (let ty = y0; ty <= y1; ty++) {
        if (SOLID.has(this.getTile(tx, ty))) {
          ent.x = (tx + 1) * TILE
          return true
        }
      }
    }
    return false
  }

  moveEntityY(ent, dy, oneWay = true) {
    const prevBottom = ent.y + ent.h
    ent.y += dy
    if (dy > 0) {
      const ty = Math.floor((ent.y + ent.h - 0.01) / TILE)
      const x0 = Math.floor(ent.x / TILE)
      const x1 = Math.floor((ent.x + ent.w - 0.01) / TILE)
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.getTile(tx, ty)
        if (SOLID.has(t) || (oneWay && t === T.PLATFORM && prevBottom <= ty * TILE + 2)) {
          ent.y = ty * TILE - ent.h
          if (ent === this.player) ent.standingOn = { type: 'tile' }
          return true
        }
      }
      if (oneWay) {
        for (const p of this.platforms) {
          if (ent.x + ent.w > p.x + 1 && ent.x < p.x + p.w - 1) {
            if (prevBottom <= p.y + 2 && ent.y + ent.h >= p.y) {
              ent.y = p.y - ent.h
              if (ent === this.player) ent.standingOn = { type: 'platform', ref: p }
              return true
            }
          }
        }
      }
    } else if (dy < 0) {
      const ty = Math.floor(ent.y / TILE)
      const x0 = Math.floor(ent.x / TILE)
      const x1 = Math.floor((ent.x + ent.w - 0.01) / TILE)
      for (let tx = x0; tx <= x1; tx++) {
        if (SOLID.has(this.getTile(tx, ty))) {
          ent.y = (ty + 1) * TILE
          if (ent === this.player) this.hitBlock(tx, ty)
          return true
        }
      }
    }
    return false
  }

  hitBlock(tx, ty) {
    const t = this.getTile(tx, ty)
    if (t !== T.QUESTION && t !== T.BRICK) return
    const key = `${tx},${ty}`
    this.bumps.set(key, { t: 0 })
    if (t === T.QUESTION) {
      this.setTile(tx, ty, T.USED)
      const power = this.level.powerBlocks.has(ty * COLS + tx)
      if (power) {
        this.spawnPowerup(tx, ty)
        this.audio.power()
      } else {
        this.addCoin(1)
        this.burst(tx * TILE + 8, ty * TILE - 2, '#ffe58a', 7)
        this.addText(tx * TILE + 8, ty * TILE - 6, '+1', '#ffe58a')
        this.audio.coin()
      }
      this.score += 50
    } else if (t === T.BRICK) {
      if (this.player.shield) {
        this.setTile(tx, ty, T.EMPTY)
        this.burst(tx * TILE + 8, ty * TILE + 8, '#e08a5e', 12)
        this.burst(tx * TILE + 8, ty * TILE + 8, '#c65f3d', 8)
        this.audio.brick()
        this.score += 50
        this.shake = Math.max(this.shake, 3)
      } else {
        this.audio.bump()
      }
    }
  }

  spawnPowerup(tx, ty) {
    this.powerups.push({
      x: tx * TILE + 8,
      y: ty * TILE - 2,
      baseY: ty * TILE - 2,
      vy: -55,
      t: 0,
      taken: false,
    })
  }

  updatePowerups(dt) {
    for (const p of this.powerups) {
      if (p.taken) continue
      p.t += dt
      p.y += p.vy * dt
      p.vy = approach(p.vy, -14, 120 * dt)
      if (p.y < p.baseY - 18) {
        p.y = p.baseY - 18
        p.vy = 0
      }
      const r = 13
      if (
        this.player.x + this.player.w > p.x - r &&
        this.player.x < p.x + r &&
        this.player.y + this.player.h > p.y - r - 6 &&
        this.player.y < p.y + r
      ) {
        p.taken = true
        if (!this.player.shield) {
          this.player.shield = true
          this.addText(p.x, p.y - 14, '¡BURBUJA!', '#9fe8ff')
        } else {
          this.addText(p.x, p.y - 14, '+500', '#ffe58a')
        }
        this.score += 500
        this.audio.power()
        this.burst(p.x, p.y, '#9fe8ff', 14)
      }
    }
    this.powerups = this.powerups.filter((p) => !p.taken || p.t < 0.4)
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      e.update(dt, this)
      if (e.dead || e.dying || this.won || this.player.dead) continue
      const overlap =
        this.player.x + this.player.w > e.x + 1 &&
        this.player.x < e.x + e.w - 1 &&
        this.player.y + this.player.h > e.y + 1 &&
        this.player.y < e.y + e.h - 1
      if (!overlap) continue

      const stomp =
        this.player.vy > 40 &&
        this.player.prevBottom <= e.y + 8 &&
        this.player.y + this.player.h < e.y + e.h
      if (stomp) {
        e.stomp(this)
        this.player.y = e.y - this.player.h
        this.player.vy = this.input.jump ? -410 : -300
        this.player.onGround = false
        this.player.standingOn = null
        this.player.jumpBuffer = 0
      } else {
        this.player.hit(this)
      }
      break
    }
    this.enemies = this.enemies.filter((e) => !e.dead)
  }

  updateCoins(dt) {
    for (const coin of this.coins) {
      if (coin.taken) continue
      coin.phase += dt
      if (
        this.player.x + this.player.w > coin.x - 7 &&
        this.player.x < coin.x + 7 &&
        this.player.y + this.player.h > coin.y - 8 &&
        this.player.y < coin.y + 8
      ) {
        coin.taken = true
        this.addCoin(1)
        this.score += 100
        this.audio.coin()
        this.burst(coin.x, coin.y, '#ffe58a', 5)
      }
    }
  }

  addCoin(n) {
    const before = this.coinsCount
    this.coinsCount += n
    if (Math.floor(this.coinsCount / 50) > Math.floor(before / 50)) {
      this.lives++
      this.addText(this.player.x + this.player.w / 2, this.player.y - 18, '¡VIDA EXTRA!', '#8fe76b')
      this.burst(this.player.x + 5, this.player.y + 8, '#8fe76b', 16)
      this.audio.power()
    }
  }

  checkHazards() {
    const x0 = Math.floor(this.player.x / TILE)
    const x1 = Math.floor((this.player.x + this.player.w - 0.01) / TILE)
    const y0 = Math.floor(this.player.y / TILE)
    const y1 = Math.floor((this.player.y + this.player.h - 0.01) / TILE)
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.getTile(tx, ty) === T.SPIKE) {
          this.player.hit(this)
          return
        }
      }
    }
  }

  checkCheckpoints() {
    for (const cp of this.checkpoints) {
      if (cp.active) continue
      if (Math.abs(this.player.x + this.player.w / 2 - cp.x) < 12) {
        cp.active = true
        this.checkpoint = {
          x: clamp(cp.x - 5, 20, this.level.width - 40),
          y: GROUND_ROW * TILE - this.player.h,
          time: this.timeLeft,
        }
        this.audio.checkpoint()
        this.burst(cp.x, GROUND_ROW * TILE - 34, '#ffe58a', 12)
        this.addText(cp.x, GROUND_ROW * TILE - 52, '¡PUNTO DE CONTROL!', '#ffe58a')
      }
    }
  }

  checkGoal() {
    if (this.won || this.player.dead) return
    if (this.player.x + this.player.w >= this.level.goalX - 4) this.win()
  }

  win() {
    if (this.won) return
    this.won = true
    this.state = 'victory'
    this.victoryTimer = 0
    this.confettiTimer = 0
    this.timeBonus = Math.ceil(this.timeLeft) * 10
    this.score += 1000 + this.timeBonus
    this.player.vx = 0
    this.player.vy = -330
    this.player.invuln = 999
    this.saveBest()
    this.audio.stopMusic()
    this.audio.win()
    this.burst(this.level.goalX, GROUND_ROW * TILE - 60, '#ffe58a', 24)
    this.ui.setHud(this.hudData())
  }

  killPlayer(reason) {
    if (this.player.dead || this.state === 'victory') return
    this.player.dead = true
    this.player.deadTimer = 0
    this.player.vy = -380
    this.player.vx = 0
    this.player.shield = false
    this.player.invuln = 0
    this.player.standingOn = null
    this.lives--
    this.deathT = 0
    this.deathReason = reason
    this.shake = Math.max(this.shake, 5)
    this.audio.stopMusic()
    this.audio.death()
    this.burst(this.player.x + 5, this.player.y + 8, '#8fe76b', 12)
    this.ui.setHud(this.hudData())
  }

  respawn() {
    const cp = this.checkpoint
    this.player.reset(cp.x, cp.y)
    this.player.invuln = 1.8
    this.timeLeft = Math.max(this.timeLeft, Math.min(300, cp.time || 300))
    this.enemies = this.level.enemies.map((s) => new Enemy(s.type, s))
    this.powerups = []
    this.camera.x = clamp(cp.x - VIEW_W * 0.42, 0, this.level.width - VIEW_W)
    this.shake = 0
    this.freeze = 0
    this.audio.startMusic()
    this.ui.setHud(this.hudData())
  }

  gameOver() {
    this.state = 'gameover'
    this.saveBest()
    this.audio.stopMusic()
    this.ui.setPlaying(false)
    this.ui.showGameOver({ score: this.score, coins: this.coinsCount, best: this.best })
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score
      try {
        localStorage.setItem('sapobros.best', String(this.best))
      } catch {
        // Almacenamiento bloqueado: el récord solo dura la sesión.
      }
      this.ui.setBest(this.best)
    }
  }

  updateBumps(dt) {
    for (const [key, bump] of this.bumps) {
      bump.t += dt
      if (bump.t > 0.22) this.bumps.delete(key)
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.type === 'confetti') p.rot += p.spin * dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  updateTexts(dt) {
    for (const t of this.texts) {
      t.life -= dt
      t.y -= 26 * dt
    }
    this.texts = this.texts.filter((t) => t.life > 0)
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 30 + Math.random() * 90
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: 1 + Math.random() * 2,
        color,
        gravity: 320,
        type: 'spark',
        rot: 0,
        spin: 0,
      })
    }
  }

  spawnDust(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y - 1,
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 30,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
        size: 1 + Math.random() * 2,
        color: '#e8d8b0',
        gravity: 90,
        type: 'dust',
        rot: 0,
        spin: 0,
      })
    }
  }

  spawnConfetti() {
    const colors = ['#8fe76b', '#ffd873', '#9fe8ff', '#ff8a3d', '#ff6b9d']
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: this.camera.x + Math.random() * VIEW_W,
        y: -6,
        vx: (Math.random() - 0.5) * 40,
        vy: 30 + Math.random() * 40,
        life: 2.4,
        maxLife: 2.4,
        size: 2 + Math.random() * 2,
        color: colors[(Math.random() * colors.length) | 0],
        gravity: 40,
        type: 'confetti',
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 12,
      })
    }
  }

  addText(x, y, text, color = '#fff4d6') {
    this.texts.push({ x, y, text, color, life: 0.9 })
  }

  updateCamera(dt) {
    const target = clamp(
      this.player.x + this.player.w / 2 - VIEW_W * 0.42 + clamp(this.player.vx * 0.15, -26, 26),
      0,
      this.level.width - VIEW_W
    )
    this.camera.x += (target - this.camera.x) * (1 - Math.exp(-7 * dt))
    this.shake = Math.max(0, this.shake - dt * 14)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  render() {
    const ctx = this.ctx
    const sx = this.shake > 0.2 ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0
    const sy = this.shake > 0.2 ? Math.round((Math.random() - 0.5) * this.shake * 1.4) : 0

    this.drawBackground(ctx)

    ctx.save()
    ctx.translate(Math.round(-this.camera.x) + sx, sy)

    this.drawCastle(ctx)
    this.drawTiles(ctx)
    this.drawPlatforms(ctx)
    this.drawCheckpoints(ctx)
    this.drawGoal(ctx)
    this.drawCoins(ctx)
    this.drawPowerups(ctx)
    for (const e of this.enemies) this.drawEnemy(ctx, e)
    this.drawPlayer(ctx, this.player)
    this.drawParticles(ctx)
    this.drawTexts(ctx)

    ctx.restore()

    this.drawVignette(ctx)
  }

  drawBackground(ctx) {
    const cam = this.camera.x
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H)
    sky.addColorStop(0, '#5cbfe2')
    sky.addColorStop(0.55, '#9adcef')
    sky.addColorStop(1, '#d6f4e6')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)

    // Sol
    const sunX = 392 - cam * 0.02
    const sunY = 46
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 46)
    glow.addColorStop(0, 'rgba(255,246,196,.95)')
    glow.addColorStop(0.35, 'rgba(255,240,170,.35)')
    glow.addColorStop(1, 'rgba(255,240,170,0)')
    ctx.fillStyle = glow
    ctx.fillRect(sunX - 46, sunY - 46, 92, 92)
    ctx.fillStyle = '#fff3b0'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 14, 0, Math.PI * 2)
    ctx.fill()

    // Nubes
    for (const c of this.clouds) {
      const art = this.art.cloud[c.s]
      const span = 1500
      let x = (c.x - cam * c.p) % span
      if (x < -120) x += span
      ctx.globalAlpha = c.a
      ctx.drawImage(art, Math.round(x), Math.round(c.y))
    }
    ctx.globalAlpha = 1

    // Colinas lejanas
    this.drawHills(ctx, cam * 0.16, 246, 150, 60, '#9fdcb8')
    this.drawHills(ctx, cam * 0.34, 248, 190, 74, '#77cc98')
    this.drawHills(ctx, cam * 0.58, 250, 240, 88, '#59b87c')

    // Arbustos cercanos
    const bushSpan = 260
    for (let i = -1; i < 4; i++) {
      const bx = i * bushSpan - ((cam * 0.78) % bushSpan) + 30
      const size = i % 2 === 0 ? 0 : 1
      ctx.drawImage(this.art.bush[size], Math.round(bx), 240 - this.art.bush[size].height + 3)
    }

    // Franja de suelo lejana para dar profundidad
    ctx.fillStyle = 'rgba(34,92,57,.22)'
    ctx.fillRect(0, 240, VIEW_W, VIEW_H - 240)

    // Agua del pantano al fondo de los precipicios
    const water = ctx.createLinearGradient(0, 242, 0, VIEW_H)
    water.addColorStop(0, '#4a9c93')
    water.addColorStop(0.35, '#2f7a7c')
    water.addColorStop(1, '#194f5c')
    ctx.fillStyle = water
    ctx.fillRect(0, 242, VIEW_W, VIEW_H - 242)
    ctx.strokeStyle = 'rgba(210,255,246,.22)'
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const wy = 248 + i * 8
      ctx.beginPath()
      for (let x = -10; x <= VIEW_W + 10; x += 8) {
        const yy = wy + Math.sin((x + this.time * 22 + i * 30) * 0.06) * 1.4
        if (x === -10) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
  }

  drawHills(ctx, offset, baseY, width, height, color) {
    const span = width * 0.9
    const start = -((offset % span) + span) % span
    ctx.fillStyle = color
    for (let i = -1; i < 5; i++) {
      const x = start + i * span
      ctx.beginPath()
      ctx.ellipse(x + width / 2, baseY, width / 2, height, 0, Math.PI, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillRect(0, baseY - 1, VIEW_W, 3)
    ctx.fillStyle = 'rgba(255,255,255,.12)'
    for (let i = -1; i < 5; i++) {
      const x = start + i * span
      ctx.beginPath()
      ctx.ellipse(x + width / 2 - 18, baseY - 8, width / 3, height * 0.7, 0, Math.PI * 1.05, Math.PI * 1.55)
      ctx.fill()
    }
  }

  drawTiles(ctx) {
    const startX = Math.max(0, Math.floor(this.camera.x / TILE) - 1)
    const endX = Math.min(239, startX + 32)
    for (let tx = startX; tx <= endX; tx++) {
      for (let ty = 0; ty < 17; ty++) {
        const t = this.getTile(tx, ty)
        if (t === T.EMPTY || t === T.PIPE_BODY) continue
        const x = tx * TILE
        const y = ty * TILE
        if (t === T.GROUND) {
          const grass = ty === GROUND_ROW
          const set = grass ? this.art.groundTop : this.art.dirt
          ctx.drawImage(set[(hash(tx, ty) * set.length) | 0], x, y)
          if (grass && hash(tx, 7) > 0.82) this.drawFlower(ctx, x, y, tx)
          continue
        }
        if (t === T.PIPE_TOP) {
          if (this.getTile(tx - 1, ty) === T.PIPE_TOP || this.getTile(tx - 1, ty) === T.PIPE_BODY) continue
          let h = 1
          while (this.getTile(tx, ty + h) === T.PIPE_BODY) h++
          ctx.drawImage(this.art.pipe(h), x - 2, y)
          continue
        }
        if (t === T.BRICK) {
          this.drawBumped(ctx, tx, ty, this.art.brick)
          continue
        }
        if (t === T.QUESTION) {
          this.drawBumped(ctx, tx, ty, this.art.question)
          const shine = (Math.sin(this.time * 4 + tx) + 1) / 2
          if (shine > 0.72) {
            ctx.fillStyle = `rgba(255,255,255,${(shine - 0.72) * 1.6})`
            ctx.fillRect(x + 3, y + 3, 2, 2)
          }
          continue
        }
        if (t === T.USED) {
          this.drawBumped(ctx, tx, ty, this.art.used)
          continue
        }
        if (t === T.PLATFORM) {
          ctx.drawImage(this.art.platform, x, y)
          continue
        }
        if (t === T.SPIKE) {
          ctx.drawImage(this.art.spike, x, y)
        }
      }
    }
  }

  drawBumped(ctx, tx, ty, image) {
    const bump = this.bumps.get(`${tx},${ty}`)
    const offset = bump ? -Math.sin(Math.min(1, bump.t / 0.18) * Math.PI) * 5 : 0
    ctx.drawImage(image, tx * TILE, Math.round(ty * TILE + offset))
  }

  drawFlower(ctx, x, y, tx) {
    const variant = (hash(tx, 3) * 3) | 0
    const colors = ['#ffd873', '#ff8a8a', '#c9b6ff']
    ctx.fillStyle = '#3f8f3c'
    ctx.fillRect(x + 7, y - 2, 1, 3)
    ctx.fillStyle = colors[variant]
    ctx.fillRect(x + 6, y - 4, 3, 2)
    if (variant === 0) {
      ctx.fillStyle = '#fff4d6'
      ctx.fillRect(x + 7, y - 3, 1, 1)
    }
  }

  drawPlatforms(ctx) {
    for (const p of this.platforms) {
      const x = Math.round(p.x)
      const y = Math.round(p.y)
      ctx.fillStyle = 'rgba(0,0,0,.16)'
      ctx.fillRect(x + 2, y + 8, p.w - 4, 2)
      ctx.fillStyle = '#6b4423'
      ctx.fillRect(x, y, p.w, 8)
      ctx.fillStyle = '#c28447'
      ctx.fillRect(x, y, p.w, 4)
      ctx.fillStyle = '#e8b06c'
      ctx.fillRect(x, y, p.w, 1)
      ctx.fillStyle = '#4fae45'
      for (let i = 3; i < p.w - 2; i += 9) {
        ctx.fillRect(x + i, y - 2 + ((i / 9) % 2), 3, 2)
      }
      ctx.fillStyle = '#3a2410'
      ctx.fillRect(x + 3, y + 4, 2, 2)
      ctx.fillRect(x + p.w - 5, y + 4, 2, 2)
    }
  }

  drawCoins(ctx) {
    for (const coin of this.coins) {
      if (coin.taken) continue
      const frame = Math.floor(this.time * 10 + coin.phase) % 4
      const bob = Math.sin(this.time * 3 + coin.phase) * 1.5
      ctx.drawImage(this.art.coin[frame], Math.round(coin.x - 5), Math.round(coin.y - 6 + bob))
    }
  }

  drawPowerups(ctx) {
    for (const p of this.powerups) {
      if (p.taken) continue
      const wobble = Math.sin(p.t * 7) * 1.5
      const x = p.x + wobble
      const y = p.y
      const grad = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, 11)
      grad.addColorStop(0, 'rgba(255,255,255,.95)')
      grad.addColorStop(0.4, 'rgba(159,232,255,.55)')
      grad.addColorStop(1, 'rgba(90,165,214,.12)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, 10.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(220,250,255,.85)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 10.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,.9)'
      ctx.beginPath()
      ctx.arc(x - 3.5, y - 4, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawPlayer(ctx, p) {
    if (p.dead && p.deadTimer > 1.2) return
    const blink = p.invuln > 0 && p.invuln < 900 && Math.floor(this.time * 18) % 2 === 0
    ctx.save()
    if (blink) ctx.globalAlpha = 0.45

    // Sombra
    if (!p.dead) {
      ctx.fillStyle = 'rgba(20,50,30,.2)'
      ctx.beginPath()
      ctx.ellipse(Math.round(p.x + p.w / 2), p.y + p.h + 1, 7, 2.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    let frame = this.art.frog.idle
    if (p.dead || !p.onGround) frame = this.art.frog.jump
    else if (Math.abs(p.vx) > 14) frame = Math.floor(p.runAnim) % 2 === 0 ? this.art.frog.walkA : this.art.frog.walkB

    const squash = p.dead ? 1 : p.landSquash
    let sx = 1 + squash * 0.32
    let sy = 1 - squash * 0.28
    if (!p.onGround && !p.dead) {
      if (p.vy < 0) { sx *= 0.96; sy *= 1.05 } else { sx *= 1.02; sy *= 0.99 }
    }
    const bob = !p.dead && p.onGround && Math.abs(p.vx) < 14 ? Math.sin(this.time * 3.2) * 0.7 : 0

    ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h + bob))
    if (p.dead) {
      ctx.rotate(p.deadTimer * 7)
      ctx.scale(0.9, 0.9)
    } else {
      ctx.rotate(clamp(p.vx / 3200, -0.07, 0.07))
    }
    ctx.scale(p.facing * sx, sy)
    ctx.drawImage(frame, -8, -20)
    ctx.restore()

    if (p.shield && !p.dead) {
      const cx = p.x + p.w / 2
      const cy = p.y + p.h / 2
      const wob = Math.sin(this.time * 5) * 1.2
      ctx.save()
      ctx.strokeStyle = 'rgba(180,240,255,.85)'
      ctx.fillStyle = 'rgba(159,232,255,.13)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, 14.5 + wob, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      ctx.beginPath()
      ctx.arc(cx - 5, cy - 6, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  drawEnemy(ctx, e) {
    if (e.type === 'mosca') {
      this.drawFly(ctx, e)
      return
    }
    const image = e.type === 'grumo' ? this.art.grumo : this.art.salto
    const w = image.width
    const h = image.height
    ctx.save()
    ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h))
    if (e.dying) {
      ctx.globalAlpha = Math.max(0, 1 - e.dyingT / 0.5)
      ctx.scale(1.15, 0.22)
    } else if (e.type === 'grumo') {
      const wob = Math.sin(e.t * 9) * 0.06
      ctx.scale(1 + wob, 1 - wob)
    } else {
      const stretch = clamp(-e.vy / 700, -0.2, 0.28)
      ctx.scale(1 - stretch * 0.3, 1 + stretch)
    }
    ctx.scale(e.dir, 1)
    ctx.drawImage(image, -w / 2, -h)
    ctx.restore()
  }

  drawFly(ctx, e) {
    ctx.save()
    const cx = e.x + e.w / 2
    const cy = e.y + e.h / 2
    ctx.translate(Math.round(cx), Math.round(cy))
    if (e.dying) {
      ctx.globalAlpha = Math.max(0, 1 - e.dyingT / 0.55)
      ctx.rotate(e.dyingT * 8)
    }
    const flap = Math.sin(e.wings) * 0.6
    ctx.fillStyle = 'rgba(226,255,255,.7)'
    ctx.beginPath()
    ctx.ellipse(-4, -3, 6, 2.6, -0.5 + flap, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(4, -3, 6, 2.6, 0.5 - flap, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6b4a8a'
    ctx.beginPath()
    ctx.ellipse(0, 1, 5, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#9d7cc0'
    ctx.beginPath()
    ctx.ellipse(-1, 0, 3.4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-2, 0, 1.4, 0, Math.PI * 2)
    ctx.arc(2, 0, 1.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a1020'
    ctx.fillRect(-2.6, -0.4, 1, 1)
    ctx.fillRect(1.6, -0.4, 1, 1)
    ctx.strokeStyle = '#3a2a4a'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(-3, 4)
    ctx.lineTo(-4, 6)
    ctx.moveTo(3, 4)
    ctx.lineTo(4, 6)
    ctx.stroke()
    ctx.restore()
  }

  drawCheckpoints(ctx) {
    for (const cp of this.checkpoints) {
      const x = Math.round(cp.x)
      const baseY = GROUND_ROW * TILE
      // Base de piedra
      ctx.fillStyle = '#5f6b78'
      ctx.fillRect(x - 6, baseY - 5, 12, 5)
      ctx.fillStyle = '#8b95a3'
      ctx.fillRect(x - 6, baseY - 5, 12, 2)
      ctx.fillStyle = '#414d59'
      ctx.fillRect(x - 2, baseY - 38, 4, 34)
      ctx.fillStyle = '#9fb0bd'
      ctx.fillRect(x - 2, baseY - 38, 1, 34)

      if (cp.active) {
        const glow = 0.5 + Math.sin(this.time * 4) * 0.2
        ctx.fillStyle = `rgba(255,216,115,${glow * 0.28})`
        ctx.beginPath()
        ctx.arc(x, baseY - 40, 14, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = cp.active ? '#ffd873' : '#9aa7b0'
      ctx.beginPath()
      ctx.arc(x, baseY - 40, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = cp.active ? '#fff6c9' : '#c3ced6'
      ctx.beginPath()
      ctx.arc(x - 1, baseY - 41.5, 1.4, 0, Math.PI * 2)
      ctx.fill()

      const wave = Math.sin(this.time * (cp.active ? 5 : 2)) * 1.3
      const flagTop = baseY - 36
      ctx.fillStyle = cp.active ? '#57b84c' : '#7f8c99'
      ctx.beginPath()
      ctx.moveTo(x + 2, flagTop)
      ctx.quadraticCurveTo(x + 12, flagTop + 2 + wave, x + 22, flagTop + 4 + wave)
      ctx.lineTo(x + 22, flagTop + 13 + wave)
      ctx.quadraticCurveTo(x + 12, flagTop + 11 + wave, x + 2, flagTop + 9)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = cp.active ? '#8fe76b' : '#9aa7b0'
      ctx.fillRect(x + 2, flagTop + 1, 18, 1)
      // Emblema de sapo
      ctx.fillStyle = cp.active ? '#fff4d6' : '#c3ced6'
      ctx.beginPath()
      ctx.arc(x + 12, flagTop + 6.5 + wave * 0.6, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = cp.active ? '#2f7d3c' : '#5f6b78'
      ctx.fillRect(x + 10.5, flagTop + 5.5 + wave * 0.6, 1.2, 1.2)
      ctx.fillRect(x + 12.6, flagTop + 5.5 + wave * 0.6, 1.2, 1.2)
    }
  }

  drawGoal(ctx) {
    const x = this.level.goalX
    const baseY = GROUND_ROW * TILE
    ctx.fillStyle = 'rgba(0,0,0,.15)'
    ctx.beginPath()
    ctx.ellipse(x, baseY + 1, 12, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#41505c'
    ctx.fillRect(x - 2, baseY - 104, 4, 104)
    ctx.fillStyle = '#9fb0bd'
    ctx.fillRect(x - 2, baseY - 104, 1, 104)
    ctx.fillStyle = '#ffd873'
    ctx.beginPath()
    ctx.arc(x, baseY - 107, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff6c9'
    ctx.beginPath()
    ctx.arc(x - 1.5, baseY - 108.5, 1.6, 0, Math.PI * 2)
    ctx.fill()

    const t = this.time * 4
    ctx.fillStyle = '#57b84c'
    ctx.beginPath()
    ctx.moveTo(x + 1, baseY - 100)
    ctx.quadraticCurveTo(x + 18, baseY - 100 + Math.sin(t) * 2, x + 36, baseY - 96 + Math.sin(t + 1) * 3)
    ctx.lineTo(x + 36, baseY - 76 + Math.sin(t + 1) * 3)
    ctx.quadraticCurveTo(x + 18, baseY - 78 + Math.sin(t) * 2, x + 1, baseY - 80)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#8fe76b'
    ctx.beginPath()
    ctx.moveTo(x + 2, baseY - 97)
    ctx.quadraticCurveTo(x + 16, baseY - 96 + Math.sin(t) * 2, x + 30, baseY - 92 + Math.sin(t + 1) * 3)
    ctx.lineTo(x + 30, baseY - 88 + Math.sin(t + 1) * 3)
    ctx.quadraticCurveTo(x + 16, baseY - 92 + Math.sin(t) * 2, x + 2, baseY - 92)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff4d6'
    ctx.beginPath()
    ctx.arc(x + 17, baseY - 89, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2f7d3c'
    ctx.fillRect(x + 14, baseY - 91, 2, 2)
    ctx.fillRect(x + 19, baseY - 91, 2, 2)
    ctx.fillRect(x + 14, baseY - 86, 7, 1)
  }

  drawCastle(ctx) {
    const x = Math.round(this.level.castleX)
    const baseY = GROUND_ROW * TILE
    if (x - this.camera.x > VIEW_W + 140) return
    const stone = '#8b95a3'
    const dark = '#5f6b78'
    const light = '#aab5c1'

    ctx.fillStyle = 'rgba(0,0,0,.14)'
    ctx.fillRect(x + 6, baseY - 2, 92, 4)

    // Cuerpo principal
    ctx.fillStyle = stone
    ctx.fillRect(x + 10, baseY - 66, 76, 66)
    ctx.fillStyle = dark
    ctx.fillRect(x + 10, baseY - 66, 76, 3)
    ctx.fillRect(x + 10, baseY - 66, 3, 66)
    ctx.fillStyle = light
    for (let yy = baseY - 60; yy < baseY - 6; yy += 10) {
      for (let xx = x + 14; xx < x + 82; xx += 12) {
        ctx.fillRect(xx + ((yy / 10) % 2 ? 5 : 0), yy, 7, 1)
      }
    }

    // Almenas
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? dark : stone
      ctx.fillRect(x + 10 + i * 13, baseY - 74, 9, 8)
    }

    // Torre central
    ctx.fillStyle = stone
    ctx.fillRect(x + 28, baseY - 104, 40, 38)
    ctx.fillStyle = dark
    ctx.fillRect(x + 28, baseY - 104, 40, 3)
    ctx.fillRect(x + 28, baseY - 104, 3, 38)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? stone : light
      ctx.fillRect(x + 28 + i * 14, baseY - 112, 10, 8)
    }

    // Ventanas
    ctx.fillStyle = '#26323c'
    ctx.fillRect(x + 42, baseY - 94, 12, 16)
    ctx.fillRect(x + 36, baseY - 100, 6, 6)
    ctx.fillRect(x + 55, baseY - 100, 6, 6)

    // Puerta
    ctx.fillStyle = '#26323c'
    ctx.beginPath()
    ctx.moveTo(x + 38, baseY)
    ctx.lineTo(x + 38, baseY - 22)
    ctx.quadraticCurveTo(x + 48, baseY - 36, x + 58, baseY - 22)
    ctx.lineTo(x + 58, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3f4d59'
    ctx.fillRect(x + 41, baseY - 16, 14, 16)
    ctx.fillStyle = '#ffd873'
    ctx.fillRect(x + 54, baseY - 12, 2, 2)
    ctx.fillRect(x + 42, baseY - 12, 2, 2)

    // Banderines
    const flap = Math.sin(this.time * 3.4) * 1.5
    for (const [fx, fy] of [[x + 24, baseY - 106], [x + 72, baseY - 106], [x + 48, baseY - 118]]) {
      ctx.fillStyle = '#41505c'
      ctx.fillRect(fx, fy, 2, 16)
      ctx.fillStyle = '#ff8a3d'
      ctx.beginPath()
      ctx.moveTo(fx + 2, fy)
      ctx.lineTo(fx + 14, fy + 3 + flap)
      ctx.lineTo(fx + 2, fy + 7)
      ctx.closePath()
      ctx.fill()
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = clamp(p.life / Math.min(p.maxLife, 0.6), 0, 1)
      if (p.type === 'confetti') {
        ctx.save()
        ctx.globalAlpha = Math.min(1, alpha + 0.3)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6)
        ctx.restore()
      } else if (p.type === 'spark') {
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
      } else {
        ctx.globalAlpha = alpha * 0.7
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center'
    ctx.font = 'bold 8px ui-monospace, monospace'
    ctx.lineWidth = 2
    for (const t of this.texts) {
      const alpha = clamp(t.life / 0.45, 0, 1)
      ctx.globalAlpha = alpha
      ctx.strokeStyle = 'rgba(12,26,18,.8)'
      ctx.strokeText(t.text, Math.round(t.x), Math.round(t.y))
      ctx.fillStyle = t.color
      ctx.fillText(t.text, Math.round(t.x), Math.round(t.y))
    }
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
  }

  drawVignette(ctx) {
    if (!this._vignette) {
      const c = document.createElement('canvas')
      c.width = VIEW_W
      c.height = VIEW_H
      const g = c.getContext('2d')
      const grad = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.68)
      grad.addColorStop(0, 'rgba(4,20,16,0)')
      grad.addColorStop(1, 'rgba(4,20,16,.28)')
      g.fillStyle = grad
      g.fillRect(0, 0, VIEW_W, VIEW_H)
      this._vignette = c
    }
    ctx.drawImage(this._vignette, 0, 0)
    if (this.state === 'playing' && this.timeLeft < 30 && !this.player.dead) {
      const pulse = (Math.sin(this.time * 6) + 1) / 2
      ctx.fillStyle = `rgba(255,60,60,${0.03 + pulse * 0.05})`
      ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    }
    if (this.state === 'victory' && this.victoryTimer < 0.35) {
      ctx.fillStyle = `rgba(255,255,255,${(1 - this.victoryTimer / 0.35) * 0.65})`
      ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    }
  }
}

