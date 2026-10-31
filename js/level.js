// Nivel de Sapo Bros. Se construye por código para mantenerlo fácil de ajustar.
export const TILE = 16
export const COLS = 240
export const ROWS = 17
export const GROUND_ROW = 15

export const T = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QUESTION: 3,
  USED: 4,
  PIPE_BODY: 5,
  PIPE_TOP: 6,
  PLATFORM: 7,
  SPIKE: 8,
}

export const SOLID = new Set([
  T.GROUND, T.BRICK, T.QUESTION, T.USED, T.PIPE_BODY, T.PIPE_TOP,
])

export function isPlatform(t) {
  return t === T.PLATFORM
}

export function createLevel() {
  const tiles = new Uint8Array(COLS * ROWS)
  const coins = []
  const enemies = []
  const platforms = []
  const checkpoints = []
  const powerBlocks = new Set()

  const idx = (x, y) => y * COLS + x
  const set = (x, y, t) => {
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) tiles[idx(x, y)] = t
  }
  const get = (x, y) => (x >= 0 && x < COLS && y >= 0 && y < ROWS ? tiles[idx(x, y)] : T.EMPTY)

  const ground = (x0, x1) => {
    for (let x = x0; x <= x1; x++) {
      set(x, 15, T.GROUND)
      set(x, 16, T.GROUND)
    }
  }

  const brick = (x, y) => set(x, y, T.BRICK)
  const question = (x, y, power = false) => {
    set(x, y, T.QUESTION)
    if (power) powerBlocks.add(idx(x, y))
  }

  const pipe = (x, height) => {
    const top = GROUND_ROW - height
    for (let yy = top; yy < GROUND_ROW; yy++) {
      set(x, yy, yy === top ? T.PIPE_TOP : T.PIPE_BODY)
      set(x + 1, yy, yy === top ? T.PIPE_TOP : T.PIPE_BODY)
    }
  }

  const coin = (tx, ty) => coins.push({ x: tx * TILE + 8, y: ty * TILE + 8 })
  const coinRow = (x0, x1, ty) => { for (let x = x0; x <= x1; x++) coin(x, ty) }
  const coinArc = (x0, ty) => {
    const pattern = [1, 0, -1, 0]
    for (let i = 0; i < 4; i++) coin(x0 + i, ty + pattern[i])
  }
  const enemy = (type, tx, row = GROUND_ROW) => {
    enemies.push({ type, x: tx * TILE + 1, y: row * TILE, row })
  }
  const movingPlatform = (tx, ty, axis, range, speed = 30, width = 40) => {
    platforms.push({
      x: tx * TILE, y: ty * TILE, w: width, h: 8,
      ox: tx * TILE, oy: ty * TILE, axis, range, speed, phase: platforms.length * 1.3,
      dx: 0, dy: 0,
    })
  }
  const checkpoint = (tx) => checkpoints.push({ x: tx * TILE + 8, active: false, t: 0 })

  // ---- Sección A: pradera inicial -------------------------------------------
  ground(0, 32)
  coinRow(9, 11, 13)
  brick(12, 11); brick(13, 11)
  question(14, 11, true); brick(15, 11)
  coinRow(12, 15, 9)
  enemy('grumo', 18)
  pipe(22, 2)
  enemy('grumo', 26)
  coinArc(32, 11)

  // ---- Sección B: escalera y primer hueco ----------------------------------
  ground(37, 56)
  coinRow(37, 38, 13)
  for (let i = 0; i < 5; i++) {
    for (let yy = 14 - i; yy <= 14; yy++) brick(40 + i, yy)
  }
  coin(40, 12); coin(41, 11); coin(42, 10); coin(43, 9); coin(44, 8)
  question(46, 11)
  enemy('grumo', 48)
  pipe(50, 2)
  enemy('grumo', 53)
  set(59, 12, T.PLATFORM); set(60, 12, T.PLATFORM)
  coin(59, 10); coin(60, 10)

  // ---- Sección C: pinchos y mosca ------------------------------------------
  ground(62, 87)
  pipe(64, 3)
  coin(64, 11); coin(65, 11)
  set(73, 14, T.SPIKE); set(74, 14, T.SPIKE)
  enemy('mosca', 76, 8)
  brick(78, 11); brick(79, 11); question(80, 11, true); brick(81, 11)
  coinRow(78, 81, 9)
  enemy('salto', 83)
  coinArc(88, 10)
  movingPlatform(90, 13, 'x', 40, 32, 40)

  // ---- Sección D: bandera intermedia y ascensor ----------------------------
  ground(93, 119)
  checkpoint(96)
  enemy('grumo', 100)
  brick(101, 11); question(102, 11); brick(103, 11)
  movingPlatform(106, 12, 'y', 40, 26, 40)
  coinRow(104, 108, 7)
  enemy('grumo', 108)
  enemy('mosca', 110, 7)
  set(112, 14, T.SPIKE); set(113, 14, T.SPIKE)
  enemy('grumo', 116)
  pipe(118, 2)
  set(122, 12, T.PLATFORM); set(123, 12, T.PLATFORM)
  coin(122, 10); coin(123, 10)

  // ---- Sección E: pinchos y saltarines -------------------------------------
  ground(125, 157)
  pipe(129, 3)
  coin(129, 11); coin(130, 11)
  enemy('grumo', 133)
  enemy('grumo', 136)
  for (let i = 0; i < 4; i++) brick(140 + i, 11)
  coinRow(140, 143, 9)
  question(145, 11)
  set(147, 14, T.SPIKE); set(148, 14, T.SPIKE)
  enemy('salto', 152)
  coinArc(155, 11)

  // ---- Sección F: recta final ----------------------------------------------
  ground(162, 189)
  movingPlatform(166, 11.5, 'y', 40, 30, 40)
  coinRow(164, 168, 8)
  enemy('mosca', 170, 6)
  enemy('grumo', 174)
  set(177, 14, T.SPIKE); set(178, 14, T.SPIKE); set(179, 14, T.SPIKE)
  enemy('mosca', 180, 8)
  brick(181, 11); question(182, 11, true); brick(183, 11)
  enemy('grumo', 184)
  checkpoint(186)
  set(192, 12, T.PLATFORM); set(193, 12, T.PLATFORM)
  coinArc(190, 10)

  // ---- Sección G: escalera final y castillo --------------------------------
  ground(195, 239)
  for (let i = 0; i < 5; i++) {
    for (let yy = 14 - i; yy <= 14; yy++) brick(205 + i, yy)
  }
  coin(205, 12); coin(206, 11); coin(207, 10); coin(208, 9); coin(209, 8)
  enemy('grumo', 215)
  question(216, 10)
  enemy('grumo', 220)
  coinArc(222, 11)

  const goalX = 230 * TILE + 8
  const castleX = 234 * TILE

  return {
    tiles, coins, enemies, platforms, checkpoints, powerBlocks,
    width: COLS * TILE, height: ROWS * TILE,
    spawn: { x: 7 * TILE, y: GROUND_ROW * TILE - 20 },
    goalX, castleX, coinTotal: coins.length,
    get,
  }
}
