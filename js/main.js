import { Game } from './game.js'
import { AudioEngine } from './audio.js'

const $ = (id) => document.getElementById(id)

const frame = $('frame')
const canvas = $('game')

const screens = {
  title: $('screen-title'),
  pause: $('screen-pause'),
  gameover: $('screen-gameover'),
  victory: $('screen-victory'),
}

function hideScreens() {
  for (const el of Object.values(screens)) el.classList.add('hidden')
}

const ui = {
  current: 'title',
  showScreen(name) {
    hideScreens()
    if (name && screens[name]) screens[name].classList.remove('hidden')
    this.current = name
  },
  screenShown(name) {
    return this.current === name
  },
  setPlaying(on) {
    frame.classList.toggle('playing', on)
  },
  setHud({ lives, coins, score, time, warn }) {
    $('hud-lives').textContent = String(lives)
    $('hud-coins').textContent = String(coins)
    $('hud-score').textContent = String(score).padStart(6, '0')
    $('hud-time').textContent = String(Math.max(0, time)).padStart(3, '0')
    $('hud-time-chip').classList.toggle('warn', !!warn)
  },
  setBest(value) {
    $('best-score').textContent = String(value)
    $('over-best').textContent = String(value)
  },
  showGameOver({ score, coins, best }) {
    $('over-score').textContent = String(score)
    $('over-coins').textContent = String(coins)
    $('over-best').textContent = String(best)
    this.setPlaying(false)
    this.showScreen('gameover')
  },
  showVictory({ score, coins, bonus }) {
    $('win-score').textContent = String(score)
    $('win-coins').textContent = String(coins)
    $('win-bonus').textContent = `+${bonus}`
    this.setPlaying(false)
    this.showScreen('victory')
  },
}

const audio = new AudioEngine()
const game = new Game(canvas, ui, audio)

// ---------------------------- Sonido / pantalla -----------------------------
const soundBtn = $('btn-sound')
function updateSoundBtn() {
  soundBtn.textContent = audio.enabled ? '♪' : '∅'
  soundBtn.style.opacity = audio.enabled ? '' : '.5'
  soundBtn.setAttribute('aria-label', audio.enabled ? 'Silenciar sonido' : 'Activar sonido')
}
updateSoundBtn()

soundBtn.addEventListener('click', () => {
  audio.toggle()
  updateSoundBtn()
})

$('btn-fullscreen').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await frame.requestFullscreen()
    else await document.exitFullscreen()
  } catch {
    // Algunos navegadores móviles no permiten pantalla completa.
  }
})

$('btn-pause').addEventListener('click', () => {
  if (game.state === 'playing' || game.state === 'paused') game.togglePause()
})

// ------------------------------- Arranque ----------------------------------
function startRun() {
  audio.unlock()
  game.startRun()
}
$('btn-start').addEventListener('click', startRun)
$('btn-retry').addEventListener('click', startRun)
$('btn-again').addEventListener('click', startRun)
$('btn-restart').addEventListener('click', startRun)
$('btn-resume').addEventListener('click', () => {
  if (game.state === 'paused') game.togglePause()
})

// ------------------------------- Teclado -----------------------------------
const KEYMAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', Spacebar: 'jump', z: 'jump', Z: 'jump',
  Shift: 'run', x: 'run', X: 'run',
}

function clearInput() {
  game.input.left = false
  game.input.right = false
  game.input.jump = false
  game.input.run = false
  for (const btn of document.querySelectorAll('.tbtn')) btn.classList.remove('down')
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) {
    if (KEYMAP[e.key] || e.key === ' ') e.preventDefault()
    return
  }
  const action = KEYMAP[e.key]
  if (action) {
    game.input[action] = true
    e.preventDefault()
    audio.unlock()
  }
  if (e.key === ' ' || e.key === 'Enter') {
    if (game.state === 'title' || game.state === 'gameover' || game.state === 'victory') {
      e.preventDefault()
      startRun()
      return
    }
  }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    e.preventDefault()
    if (game.state === 'playing' || game.state === 'paused') game.togglePause()
  }
  if (e.key === 'm' || e.key === 'M') {
    audio.toggle()
    updateSoundBtn()
  }
})

window.addEventListener('keyup', (e) => {
  const action = KEYMAP[e.key]
  if (action) {
    game.input[action] = false
    if (e.key === ' ') e.preventDefault()
  }
})

// ------------------------------- Táctil ------------------------------------
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
if (isTouch) document.body.classList.add('touch')

for (const btn of document.querySelectorAll('.tbtn')) {
  const action = btn.dataset.key
  const press = (e) => {
    e.preventDefault()
    audio.unlock()
    game.input[action] = true
    btn.classList.add('down')
    if (btn.setPointerCapture && e.pointerId !== undefined) {
      try { btn.setPointerCapture(e.pointerId) } catch {}
    }
  }
  const release = (e) => {
    if (e) e.preventDefault()
    game.input[action] = false
    btn.classList.remove('down')
  }
  btn.addEventListener('pointerdown', press)
  btn.addEventListener('pointerup', release)
  btn.addEventListener('pointercancel', release)
  btn.addEventListener('pointerleave', (e) => {
    if (e.buttons === 0) release(e)
  })
  btn.addEventListener('contextmenu', (e) => e.preventDefault())
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault())
frame.addEventListener('contextmenu', (e) => e.preventDefault())

// ----------------------------- Ciclo de vida -------------------------------
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.togglePause()
})

window.addEventListener('blur', () => {
  clearInput()
  if (game.state === 'playing') game.togglePause()
})

document.addEventListener('pointerdown', () => audio.unlock(), { once: true })

// --------------------------------- Bucle -----------------------------------
let last = performance.now()
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  game.frame(dt)
  audio.tick()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
