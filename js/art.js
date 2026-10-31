// Arte procedural: sprites de píxeles, tiles y decoración.
// Todo se dibuja en canvas sin fuentes externas para que funcione sin conexión.

const PAL = {
  k: '#1b2b22', g: '#57b84c', G: '#8fe76b', d: '#2f7d3c',
  b: '#ffe9b3', e: '#ffffff', p: '#15221b', w: '#ffffff',
  y: '#f4b93f', Y: '#ffdd85',
  v: '#2f6f9e', V: '#5aa5d6', n: '#1d4a6a',
  m: '#b8672e', M: '#e59a5c', r: '#7a3f1c',
  o: '#e2712f', O: '#ff9d5f', q: '#a8451a',
  s: '#7f8c99', S: '#c3ced6',
}

function sprite(rows, palette = PAL) {
  const w = rows[0].length
  const h = rows.length
  for (const row of rows) {
    if (row.length !== w) throw new Error(`Fila de sprite con ancho ${row.length}, esperado ${w}: "${row}"`)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      ctx.fillStyle = palette[ch] || '#ff00ff'
      ctx.fillRect(x, y, 1, 1)
    }
  })
  return canvas
}

// ---------------------------------------------------------------------------
// Héroe: un hombre sapo con pañuelo y peto azul.
// ---------------------------------------------------------------------------
const FROG_BODY = [
  '...kkk....kkk...',
  '..keeek..keeek..',
  '..kepek..kepek..',
  '...kgk....kgk...',
  '..kggggggggggk..',
  '..kgGGGGGGGGgk..',
  '..kggggggggggk..',
  '..kgbbbbbbbbgk..',
  '..kgbkkkkkkbgk..',
  '...kbbbbbbbbk...',
  '....kkkkkkkk....',
  '..kYyyyyyyyyYk..',
  '.kggkyyyyyykggk.',
  '.kggkvvVVvvkggk.',
  '.kggkvvvvvvkggk.',
  '..kkkvvvvvvkkk..',
]

const FROG_LEGS = {
  idle: [
    '...kvvvvvvvvk...',
    '...kvvk..kvvk...',
    '...kvvk..kvvk...',
    '..kvvvvkkvvvvk..',
  ],
  walkA: [
    '...kvvvvvvvvk...',
    '..kvvk....kvvk..',
    '..kvvk....kvvk..',
    '.kvvvk....kvvvk.',
  ],
  walkB: [
    '...kvvvvvvvvk...',
    '....kvvkkvvk....',
    '...kvvk..kvvk...',
    '..kvvk....kvvk..',
  ],
  jump: [
    '...kvvvvvvvvk...',
    '..kvvk....kvvk..',
    '..kvvk....kvvk..',
    '.kkvvk....kvvkk.',
  ],
}

const GRUMO_ROWS = [
  '.....kkkkkk.....',
  '...kkmmmmmmkk...',
  '..kmmmmmmmmmmk..',
  '..kmmeemmeemmk..',
  '..kmepemmepemk..',
  '..kmmeemmeemmk..',
  '..kmmmmmmmmmmk..',
  '..kmmkkkkkkmmk..',
  '..kmmmmmmmmmmk..',
  '..kMmmmmmmmmMk..',
  '..kmmmmmmmmmmk..',
  '.kddkkkkkkkkddk.',
  '.kddk......kddk.',
]

const SALTO_ROWS = [
  '...kkk....kkk...',
  '..keeek..keeek..',
  '..kepek..kepek..',
  '...kok....kok...',
  '..koooooooooook.',
  '..koOOOOOOOOook.',
  '..kookkkkkkookk.',
  '...koooooooookk.',
  '....kkooookk....',
  '...koookkoook...',
  '..kOOOk..kOOOk..',
  '.kqqqk....kqqqk.',
]

function buildFrog() {
  const frames = {}
  for (const [name, legs] of Object.entries(FROG_LEGS)) {
    frames[name] = sprite([...FROG_BODY, ...legs])
  }
  return frames
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas16() {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 16
  return c
}

function makeGroundTop(variant) {
  const c = canvas16()
  const ctx = c.getContext('2d')
  const rnd = mulberry32(100 + variant * 37)
  ctx.fillStyle = '#96602f'
  ctx.fillRect(0, 0, 16, 16)
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#855227' : '#a96f39'
    ctx.fillRect((rnd() * 16) | 0, 6 + ((rnd() * 10) | 0), 2 + ((rnd() * 3) | 0), 2)
  }
  ctx.fillStyle = '#3f8f3c'
  ctx.fillRect(0, 0, 16, 1)
  ctx.fillStyle = '#57b84c'
  ctx.fillRect(0, 1, 16, 4)
  ctx.fillStyle = '#8fe76b'
  ctx.fillRect(0, 1, 16, 2)
  // Borde ondulado del césped
  for (let x = 0; x < 16; x++) {
    if ((x + variant * 3) % 4 !== 0) ctx.fillStyle = '#57b84c'
    else ctx.fillStyle = '#3f8f3c'
    ctx.fillRect(x, 5, 1, 2)
  }
  if (variant === 1) {
    ctx.fillStyle = '#ffd873'
    ctx.fillRect(4, 2, 1, 1)
    ctx.fillStyle = '#ff8a3d'
    ctx.fillRect(12, 3, 1, 1)
  }
  return c
}

function makeDirt(variant) {
  const c = canvas16()
  const ctx = c.getContext('2d')
  const rnd = mulberry32(900 + variant * 53)
  ctx.fillStyle = '#8a5629'
  ctx.fillRect(0, 0, 16, 16)
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#784a22' : '#a06a34'
    ctx.fillRect((rnd() * 15) | 0, (rnd() * 15) | 0, 2, 2)
  }
  ctx.fillStyle = 'rgba(0,0,0,.08)'
  ctx.fillRect(0, 0, 16, 2)
  return c
}

function makeBrick() {
  const c = canvas16()
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#8a3b28'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#c65f3d'
  const rows = [[0, 6, 0, 6], [9, 15, 0, 6], [0, 2, 8, 14], [5, 15, 8, 14]]
  for (const [x0, x1, y0, y1] of rows) ctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
  ctx.fillStyle = '#e08a5e'
  for (const [x0, x1, y0] of rows) ctx.fillRect(x0, y0, x1 - x0 + 1, 1)
  ctx.fillStyle = '#7a3322'
  ctx.fillRect(0, 15, 16, 1)
  return c
}

function makeQuestion() {
  const c = canvas16()
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#b07a1f'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#f6c945'
  ctx.fillRect(1, 1, 14, 14)
  ctx.fillStyle = '#ffe58a'
  ctx.fillRect(1, 1, 13, 2)
  ctx.fillRect(1, 1, 2, 13)
  ctx.fillStyle = '#d9a52c'
  ctx.fillRect(2, 13, 12, 2)
  ctx.fillRect(13, 2, 2, 12)
  ctx.fillStyle = '#9a6516'
  const rivets = [[2, 2], [12, 2], [2, 12], [12, 12]]
  for (const [x, y] of rivets) ctx.fillRect(x, y, 2, 2)
  const glyph = [
    '..###..',
    '.#...#.',
    '.#...#.',
    '....##.',
    '...##..',
    '..##...',
    '..##...',
    '.......',
    '..##...',
  ]
  glyph.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        ctx.fillStyle = '#7a4b0e'
        ctx.fillRect(5 + x, 4 + y, 1, 1)
      }
    }
  })
  return c
}

function makeUsed() {
  const c = canvas16()
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#6f4a22'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#a9793f'
  ctx.fillRect(1, 1, 14, 14)
  ctx.fillStyle = '#c08d4d'
  ctx.fillRect(2, 2, 12, 2)
  ctx.fillStyle = '#8a5f2c'
  ctx.fillRect(2, 12, 12, 2)
  ctx.fillStyle = '#6f4a22'
  for (const [x, y] of [[2, 2], [12, 2], [2, 12], [12, 12]]) ctx.fillRect(x, y, 2, 2)
  return c
}

function makePlatformTile() {
  const c = canvas16()
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#8a5a2e'
  ctx.fillRect(0, 2, 16, 12)
  ctx.fillStyle = '#c28447'
  ctx.fillRect(0, 2, 16, 3)
  ctx.fillStyle = '#e8b06c'
  ctx.fillRect(0, 2, 16, 1)
  ctx.fillStyle = '#6b4423'
  ctx.fillRect(0, 13, 16, 2)
  ctx.fillStyle = '#a06a34'
  ctx.fillRect(2, 6, 5, 1)
  ctx.fillRect(9, 9, 4, 1)
  ctx.fillStyle = '#4fae45'
  ctx.fillRect(1, 5, 3, 1)
  ctx.fillStyle = '#7b4a1f'
  ctx.fillRect(0, 0, 1, 3)
  ctx.fillRect(15, 0, 1, 3)
  return c
}

function makeSpike() {
  const c = canvas16()
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#232c33'
  ctx.fillRect(0, 12, 16, 4)
  ctx.fillStyle = '#c96f3e'
  ctx.fillRect(1, 13, 4, 1)
  ctx.fillRect(11, 13, 4, 1)
  ctx.fillStyle = '#596978'
  ctx.fillRect(0, 12, 16, 1)
  for (let i = 0; i < 3; i++) {
    const x = i * 5 + 1
    ctx.fillStyle = '#596978'
    ctx.beginPath()
    ctx.moveTo(x + 2.5, 0)
    ctx.lineTo(x + 5, 12)
    ctx.lineTo(x, 12)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#dbe4ea'
    ctx.beginPath()
    ctx.moveTo(x + 2.5, 1)
    ctx.lineTo(x + 2.5, 12)
    ctx.lineTo(x, 12)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 1, 2, 1, 7)
  }
  return c
}

function makeCoinFrames() {
  const widths = [10, 7, 3, 7]
  return widths.map((w) => {
    const c = document.createElement('canvas')
    c.width = 10
    c.height = 12
    const ctx = c.getContext('2d')
    const x = (10 - w) / 2
    ctx.fillStyle = '#b07a1f'
    ctx.beginPath()
    ctx.ellipse(5, 6, w / 2, 5.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f6c945'
    ctx.beginPath()
    ctx.ellipse(5, 6, Math.max(0.5, w / 2 - 1), 4.5, 0, 0, Math.PI * 2)
    ctx.fill()
    if (w > 4) {
      ctx.fillStyle = '#ffe58a'
      ctx.fillRect(Math.round(x + 2), 3, 1, 4)
    }
    return c
  })
}

function makeCloud(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(255,255,255,.92)'
  const bumps = [
    [w * 0.22, h * 0.62, h * 0.34],
    [w * 0.42, h * 0.48, h * 0.4],
    [w * 0.62, h * 0.52, h * 0.36],
    [w * 0.78, h * 0.66, h * 0.28],
  ]
  for (const [x, y, r] of bumps) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillRect(w * 0.18, h * 0.62, w * 0.66, h * 0.3)
  ctx.fillStyle = 'rgba(180,225,240,.55)'
  ctx.fillRect(w * 0.2, h * 0.86, w * 0.62, 2)
  return c
}

function makeBush(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#3f8f3c'
  ctx.fillRect(0, h - 5, w, 5)
  const blobs = [[w * 0.25, h * 0.55, h * 0.42], [w * 0.5, h * 0.42, h * 0.5], [w * 0.75, h * 0.55, h * 0.42]]
  for (const [x, y, r] of blobs) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#57b84c'
  for (const [x, y, r] of blobs) {
    ctx.beginPath()
    ctx.arc(x - 1, y - 2, r * 0.75, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

function makePipe(heightPx) {
  const c = document.createElement('canvas')
  c.width = 36
  c.height = heightPx
  const ctx = c.getContext('2d')
  const x = 2
  const w = 32
  // Cuerpo
  ctx.fillStyle = '#1e5c33'
  ctx.fillRect(x, 14, w, heightPx - 14)
  ctx.fillStyle = '#3fae5a'
  ctx.fillRect(x + 2, 14, w - 4, heightPx - 14)
  ctx.fillStyle = '#7fe08a'
  ctx.fillRect(x + 5, 14, 5, heightPx - 14)
  ctx.fillStyle = '#2b7d43'
  ctx.fillRect(x + w - 10, 14, 6, heightPx - 14)
  // Boca
  ctx.fillStyle = '#1e5c33'
  ctx.fillRect(0, 0, 36, 16)
  ctx.fillStyle = '#3fae5a'
  ctx.fillRect(2, 2, 32, 12)
  ctx.fillStyle = '#7fe08a'
  ctx.fillRect(5, 2, 6, 12)
  ctx.fillStyle = '#2b7d43'
  ctx.fillRect(25, 2, 7, 12)
  ctx.fillStyle = '#164a29'
  ctx.fillRect(0, 14, 36, 2)
  return c
}

export function createArt() {
  return {
    frog: buildFrog(),
    grumo: sprite(GRUMO_ROWS),
    salto: sprite(SALTO_ROWS),
    groundTop: [makeGroundTop(0), makeGroundTop(1), makeGroundTop(2), makeGroundTop(3)],
    dirt: [makeDirt(0), makeDirt(1), makeDirt(2), makeDirt(3)],
    brick: makeBrick(),
    question: makeQuestion(),
    used: makeUsed(),
    platform: makePlatformTile(),
    spike: makeSpike(),
    coin: makeCoinFrames(),
    cloud: [makeCloud(56, 26), makeCloud(38, 18), makeCloud(76, 30)],
    bush: [makeBush(44, 18), makeBush(30, 14)],
    pipes: new Map(),
    pipe(heightTiles) {
      if (!this.pipes.has(heightTiles)) this.pipes.set(heightTiles, makePipe(heightTiles * 16))
      return this.pipes.get(heightTiles)
    },
  }
}
