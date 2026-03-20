// 2D Side-scrolling city renderer — warm Roman street scene

import { CITY_COLS } from './cityEngine.js'

const TILE_W   = 80   // screen px per grid column
const FLOOR_H  = 28   // px per building floor
const BLDG_BASE = 16  // minimum base height above floor count

// ── Helpers ──────────────────────────────────────────────────
function tileNoise(a, b) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.min(255,Math.max(0,Math.round(v))).toString(16).padStart(2,'0')).join('')
}
function lighten(hex, t) {
  const [r,g,b] = hexToRgb(hex)
  return rgbToHex(r+(255-r)*t, g+(255-g)*t, b+(255-b)*t)
}
function darken(hex, t) {
  const [r,g,b] = hexToRgb(hex)
  return rgbToHex(r*(1-t), g*(1-t), b*(1-t))
}

// ── Background ───────────────────────────────────────────────
function drawHills(ctx, W, groundY) {
  // Back hills (lighter, further away)
  ctx.fillStyle = '#9abd78'
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  for (let x = 0; x <= W; x += 6) {
    const y = groundY
      - 55 - Math.sin(x * 0.007 + 1.2) * 28
      - Math.sin(x * 0.003 + 0.4) * 18
      - Math.sin(x * 0.0013 + 2.1) * 12
    ctx.lineTo(x, y)
  }
  ctx.lineTo(W, groundY)
  ctx.closePath()
  ctx.fill()

  // Front hills (darker, closer)
  ctx.fillStyle = '#78a858'
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  for (let x = 0; x <= W; x += 6) {
    const y = groundY
      - 30 - Math.sin(x * 0.011 + 2.0) * 16
      - Math.sin(x * 0.005 + 1.1) * 10
    ctx.lineTo(x, y)
  }
  ctx.lineTo(W, groundY)
  ctx.closePath()
  ctx.fill()
}

function drawGround(ctx, W, H, groundY) {
  const GRASS_H = 14
  // Grass strip
  ctx.fillStyle = '#5a8e32'
  ctx.fillRect(-200, groundY, W + 400, GRASS_H)
  // Subtle variation blobs
  for (let i = 0; i < 48; i++) {
    const nx = tileNoise(i * 7.3, i * 2.1)
    const ns = tileNoise(i * 3.7, i * 5.9)
    const nv = tileNoise(i * 9.1, i * 1.3)
    ctx.globalAlpha = 0.30 + ns * 0.18
    ctx.fillStyle = nv > 0.5 ? '#4a7e28' : '#6aaa3a'
    ctx.beginPath()
    ctx.ellipse(nx * (W + 200) - 100, groundY + 7, 18 + ns * 50, 5 + nv * 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // Earth below
  const earthGrad = ctx.createLinearGradient(0, groundY + GRASS_H, 0, H)
  earthGrad.addColorStop(0, '#8a6030')
  earthGrad.addColorStop(1, '#3a2010')
  ctx.fillStyle = earthGrad
  ctx.fillRect(-200, groundY + GRASS_H, W + 400, H - groundY - GRASS_H)
}

// ── Flora ────────────────────────────────────────────────────
function drawTree2D(ctx, tx, groundY, height, seed) {
  const trunkW = 5 + seed * 4
  const canopyR = height * 0.42 + seed * 8
  ctx.fillStyle = '#6a4020'
  ctx.fillRect(tx - trunkW / 2, groundY - height, trunkW, height * 0.55)
  ctx.fillStyle = '#2e6018'
  ctx.beginPath()
  ctx.ellipse(tx + 2, groundY - height + 3, canopyR * 0.88, canopyR * 0.76, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4a8820'
  ctx.beginPath()
  ctx.ellipse(tx, groundY - height, canopyR, canopyR * 0.78, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#62a030'
  ctx.beginPath()
  ctx.ellipse(tx - canopyR * 0.22, groundY - height - canopyR * 0.22, canopyR * 0.54, canopyR * 0.46, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawShrub2D(ctx, x, groundY, seed) {
  const r = 10 + seed * 12
  ctx.fillStyle = '#2a5814'
  ctx.beginPath()
  ctx.ellipse(x + 2, groundY - r * 0.35 + 2, r * 1.1, r * 0.65, 0, 0, Math.PI * 2)
  ctx.fill()
  const lumps = 4 + Math.floor(seed * 3)
  const cols = ['#3a7020','#487828','#568430','#3c6c18']
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI + 0.2
    const d = r * (0.2 + tileNoise(i*3.1+seed, seed*4.7) * 0.35)
    const lr = r * (0.5 + tileNoise(i*2.3, seed*6.1) * 0.3)
    ctx.fillStyle = cols[i % cols.length]
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a)*d, groundY - r*0.3 + Math.sin(a)*d*0.5, lr, lr*0.72, 0, 0, Math.PI*2)
    ctx.fill()
  }
}

function drawGrass2D(ctx, x, groundY, seed) {
  const count = 4 + Math.floor(seed * 4)
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI * 0.85 + (i / count) * Math.PI * 1.7 + (seed - 0.5) * 0.5
    const len = 6 + seed * 5 + tileNoise(i+seed*10, seed*7) * 3
    ctx.strokeStyle = i % 2 === 0 ? '#4a8828' : '#569030'
    ctx.lineWidth = 1 + seed * 0.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, groundY)
    ctx.quadraticCurveTo(x + Math.cos(angle)*len*0.55, groundY + Math.sin(angle)*len*0.55, x + Math.cos(angle)*len, groundY + Math.sin(angle)*len)
    ctx.stroke()
  }
}

function drawFlora(ctx, buildings, streetOffsetX, groundY) {
  const occupiedCols = new Set()
  for (const b of buildings) {
    for (let c = b.col; c < b.col + b.w; c++) occupiedCols.add(c)
  }
  for (let c = 0; c < CITY_COLS; c++) {
    if (occupiedCols.has(c)) continue
    const x = streetOffsetX + c * TILE_W
    const seed = tileNoise(c * 7.3, 42.1)
    const jx = (tileNoise(c, 13.7) - 0.5) * TILE_W * 0.5
    if (seed < 0.25) {
      drawTree2D(ctx, x + TILE_W * 0.5 + jx, groundY, 44 + seed * 30, seed)
    } else if (seed < 0.55) {
      drawShrub2D(ctx, x + TILE_W * 0.5 + jx, groundY, seed)
    } else if (seed < 0.82) {
      drawGrass2D(ctx, x + TILE_W * 0.45 + jx, groundY, seed)
    }
  }
}

// ── Building drawing ─────────────────────────────────────────
function drawRoof2D(ctx, x, y, bw, floors, color, id) {
  const isGabled = floors >= 2 || id === 'domus' || id === 'villa' || id === 'baths' || id === 'basilica'
  if (isGabled) {
    const roofH = Math.min(bw * 0.32, 38)
    // Shadow side
    ctx.fillStyle = '#7a2c14'
    ctx.beginPath()
    ctx.moveTo(x + bw / 2, y - roofH)
    ctx.lineTo(x + bw + 4, y + 2)
    ctx.lineTo(x + bw + 4, y)
    ctx.closePath()
    ctx.fill()
    // Lit face
    ctx.fillStyle = '#b04020'
    ctx.beginPath()
    ctx.moveTo(x - 4, y)
    ctx.lineTo(x + bw / 2, y - roofH)
    ctx.lineTo(x + bw + 4, y)
    ctx.closePath()
    ctx.fill()
    // Ridge cap
    ctx.fillStyle = '#c84828'
    ctx.beginPath()
    ctx.moveTo(x + bw/2 - 5, y - roofH - 2)
    ctx.lineTo(x + bw/2 + 5, y - roofH - 2)
    ctx.lineTo(x + bw/2 + 3, y - roofH + 7)
    ctx.lineTo(x + bw/2 - 3, y - roofH + 7)
    ctx.closePath()
    ctx.fill()
  } else {
    // Flat parapet
    ctx.fillStyle = darken(color, 0.1)
    ctx.fillRect(x, y - 7, bw, 7)
    ctx.fillStyle = lighten(color, 0.12)
    ctx.fillRect(x, y - 7, bw, 2)
  }
}

function drawWindows2D(ctx, x, y, bw, bh, floors) {
  const winW = 9
  const winH = 13
  const cols = Math.max(1, Math.floor((bw - 24) / 26))
  for (let f = 0; f < Math.min(floors, 4); f++) {
    const wy = y + bh - BLDG_BASE - (f + 0.62) * FLOOR_H - winH / 2
    for (let c = 0; c < cols; c++) {
      if (f === 0 && c === Math.floor(cols / 2)) continue // skip center (door)
      const wx = x + 12 + (cols === 1 ? (bw - 24) * 0.5 : c * (bw - 24) / (cols - 1)) - winW / 2
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4)
      ctx.fillStyle = '#160a04'
      ctx.fillRect(wx, wy, winW, winH)
      ctx.beginPath()
      ctx.arc(wx + winW/2, wy, winW/2, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,220,150,0.12)'
      ctx.fillRect(wx, wy, winW / 2, winH)
    }
  }
}

function drawDoor2D(ctx, x, y, bw, bh, color) {
  const dw = Math.max(14, Math.min(22, bw * 0.2))
  const dh = FLOOR_H + 10
  const dx = x + bw / 2 - dw / 2
  const dy = y + bh - dh
  ctx.fillStyle = lighten(color, 0.12)
  ctx.fillRect(dx - 3, dy - 4, dw + 6, dh + 4)
  ctx.fillStyle = '#160a04'
  ctx.fillRect(dx, dy, dw, dh)
  ctx.beginPath()
  ctx.arc(dx + dw/2, dy, dw/2, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#c8a830'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(dx + dw * 0.62, dy + dh * 0.38, 2, 0, Math.PI * 2)
  ctx.stroke()
}

function drawTemple2D(ctx, x, y, bw, bh, color) {
  const colCount = Math.max(4, Math.floor(bw / 22))
  const pedH = Math.min(36, bw * 0.28)
  const entH = 12
  const colH = bh - pedH - entH - 14
  // Pediment
  ctx.fillStyle = lighten(color, 0.18)
  ctx.beginPath()
  ctx.moveTo(x - 5, y + pedH)
  ctx.lineTo(x + bw / 2, y + 3)
  ctx.lineTo(x + bw + 5, y + pedH)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = darken(color, 0.2)
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Entablature
  ctx.fillStyle = color
  ctx.fillRect(x - 5, y + pedH, bw + 10, entH)
  // Columns
  for (let i = 0; i < colCount; i++) {
    const cx = x + 8 + (i / (colCount - 1)) * (bw - 16)
    ctx.fillStyle = lighten(color, 0.22)
    ctx.fillRect(cx - 5, y + pedH + entH, 10, colH)
    // Capital
    ctx.fillStyle = lighten(color, 0.32)
    ctx.fillRect(cx - 7, y + pedH + entH, 14, 6)
    // Base
    ctx.fillRect(cx - 7, y + bh - 12, 14, 8)
  }
  // Steps
  for (let s = 0; s < 3; s++) {
    ctx.fillStyle = lighten(color, 0.08 - s * 0.04)
    ctx.fillRect(x - 5 - s * 4, y + bh - s * 4 - 5, bw + 10 + s * 8, 5)
  }
  // Door
  const dw = 18, dh = colH * 0.55
  ctx.fillStyle = '#160a04'
  ctx.fillRect(x + bw/2 - dw/2, y + bh - dh - 12, dw, dh)
  ctx.beginPath()
  ctx.arc(x + bw/2, y + bh - dh - 12, dw/2, Math.PI, 0)
  ctx.fill()
}

function drawArch2D(ctx, x, y, bw, bh, color) {
  const pw = Math.max(10, bw * 0.2)
  const archH = bh * 0.58
  const aw = bw - pw * 2
  ctx.fillStyle = color
  ctx.fillRect(x, y, pw, bh)
  ctx.fillRect(x + bw - pw, y, pw, bh)
  ctx.fillStyle = darken(color, 0.1)
  ctx.fillRect(x + pw, y + archH, aw, bh - archH)
  // Arch opening
  ctx.fillStyle = '#160a04'
  ctx.beginPath()
  ctx.arc(x + bw / 2, y + archH, aw / 2, Math.PI, 0)
  ctx.rect(x + pw + 2, y + archH, aw - 4, bh - archH - 2)
  ctx.fill()
  // Keystone
  ctx.fillStyle = lighten(color, 0.22)
  ctx.beginPath()
  ctx.moveTo(x + bw/2 - 6, y + archH - aw/2 - 4)
  ctx.lineTo(x + bw/2 + 6, y + archH - aw/2 - 4)
  ctx.lineTo(x + bw/2 + 4, y + archH - aw/2 + 10)
  ctx.lineTo(x + bw/2 - 4, y + archH - aw/2 + 10)
  ctx.closePath()
  ctx.fill()
}

function drawGarden2D(ctx, x, groundY, bw, color) {
  // Stone wall
  ctx.fillStyle = '#c8b478'
  ctx.fillRect(x, groundY - 22, bw, 22)
  ctx.fillStyle = darken('#c8b478', 0.12)
  ctx.fillRect(x, groundY - 22, bw, 4)
  // Coping stones
  for (let i = 0; i < Math.floor(bw / 20); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d4c080' : '#c0ac68'
    ctx.fillRect(x + i * 20, groundY - 26, 18, 4)
  }
  // Trees / bushes inside
  const treeCount = Math.max(1, Math.floor(bw / 50))
  for (let i = 0; i < treeCount; i++) {
    const tx = x + (i + 0.5) * (bw / treeCount)
    const seed = tileNoise(tx * 0.1, i * 3.7)
    drawTree2D(ctx, tx, groundY - 22, 38 + seed * 22, seed)
  }
}

function drawFountain2D(ctx, x, groundY, bw) {
  const cx = x + bw / 2
  const basinR = bw * 0.34
  // Basin
  ctx.fillStyle = '#c8b080'
  ctx.beginPath()
  ctx.ellipse(cx, groundY - 8, basinR, basinR * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(80,160,210,0.72)'
  ctx.beginPath()
  ctx.ellipse(cx, groundY - 8, basinR * 0.82, basinR * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  // Column
  ctx.fillStyle = '#d4b870'
  ctx.fillRect(cx - 5, groundY - bw * 0.55, 10, bw * 0.47)
  // Water streams
  const time = Date.now() / 1000
  ctx.strokeStyle = 'rgba(120,200,240,0.65)'
  ctx.lineWidth = 1.8
  for (let a = 0; a < 5; a++) {
    const angle = (a / 5) * Math.PI * 2 + time * 0.4
    ctx.beginPath()
    ctx.moveTo(cx, groundY - bw * 0.55)
    ctx.quadraticCurveTo(
      cx + Math.cos(angle) * 18,
      groundY - bw * 0.55 - 22,
      cx + Math.cos(angle) * 26,
      groundY - 14
    )
    ctx.stroke()
  }
}

function drawColosseum2D(ctx, x, y, bw, bh, color) {
  const archCount = Math.floor(bw / 22)
  for (let f = 0; f < Math.min(3, Math.floor(bh / FLOOR_H)); f++) {
    for (let i = 0; i < archCount; i++) {
      const ax = x + 6 + (i / archCount) * (bw - 12) + (bw - 12) / archCount / 2
      const ay = y + bh - BLDG_BASE - (f + 0.72) * FLOOR_H
      const aw = 11, ah = FLOOR_H * 0.62
      ctx.fillStyle = '#1a0a04'
      ctx.beginPath()
      ctx.rect(ax - aw/2, ay, aw, ah - aw/2)
      ctx.arc(ax, ay, aw/2, Math.PI, 0)
      ctx.fill()
    }
  }
}

function drawFire2D(ctx, cx, topY, bw, time) {
  const count = 5
  for (let i = 0; i < count; i++) {
    const phase = time * 3.5 + i * (Math.PI * 2 / count)
    const flicker = Math.sin(phase) * 0.4 + 0.6
    const ox = Math.sin(time * 2 + i * 1.1) * bw * 0.22
    const h = (18 + Math.sin(phase * 1.3) * 8) * flicker
    const grad = ctx.createRadialGradient(cx + ox, topY, 1, cx + ox, topY - h * 0.5, h)
    grad.addColorStop(0,   `rgba(255,200,50,${0.7 + 0.3 * Math.sin(phase)})`)
    grad.addColorStop(0.4, `rgba(255,100,20,${0.6 * flicker})`)
    grad.addColorStop(1,   'rgba(180,30,0,0)')
    ctx.save()
    ctx.globalAlpha = 0.88
    ctx.beginPath()
    ctx.moveTo(cx + ox - bw * 0.12, topY)
    ctx.quadraticCurveTo(cx + ox + Math.sin(phase) * 5, topY - h * 0.6, cx + ox, topY - h)
    ctx.quadraticCurveTo(cx + ox - Math.sin(phase) * 5, topY - h * 0.6, cx + ox + bw * 0.12, topY)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()
  }
}

function drawSparkle2D(ctx, cx, cy) {
  ctx.save()
  ctx.globalAlpha = 0.75
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const r = 10 + Math.random() * 8
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    ctx.strokeStyle = '#ffe080'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  ctx.restore()
}

function drawBuilding2D(ctx, b, streetOffsetX, groundY, isNew, onFire, time) {
  const { id, col, w, floors, color, isLandmark } = b
  const x  = streetOffsetX + col * TILE_W
  const bw = w * TILE_W
  const bh = BLDG_BASE + (floors || 1) * FLOOR_H

  if (id === 'garden') { drawGarden2D(ctx, x, groundY, bw, color); return }
  if (id === 'fountain') { drawFountain2D(ctx, x, groundY, bw); return }
  if (id === 'arch' || id === 'aqueduct') { drawArch2D(ctx, x, groundY - bh, bw, bh, color); return }
  if (id === 'temple_small' || id === 'temple_jupiter' || id === 'pantheon') {
    drawTemple2D(ctx, x, groundY - bh, bw, bh, color); return
  }

  const y = groundY - bh

  // Main wall
  ctx.fillStyle = color
  ctx.fillRect(x, y, bw, bh)

  // Subtle right-edge depth shadow
  ctx.fillStyle = darken(color, 0.28)
  ctx.fillRect(x + bw, y + 5, 6, bh - 5)

  // Colosseum / amphitheater: arched openings overlay
  if (id === 'colosseum' || id === 'amphitheater') {
    drawColosseum2D(ctx, x, y, bw, bh, color)
  }

  // Frieze strip near top
  ctx.fillStyle = lighten(color, 0.14)
  ctx.fillRect(x, y, bw, 10)

  // Windows
  drawWindows2D(ctx, x, y, bw, bh, floors || 1)

  // Door
  drawDoor2D(ctx, x, y, bw, bh, color)

  // Roof
  drawRoof2D(ctx, x, y, bw, floors || 1, color, id)

  // Landmark glow
  if (isLandmark) {
    ctx.save()
    const grad = ctx.createRadialGradient(x + bw/2, y + bh/2, 10, x + bw/2, y + bh/2, bw * 0.9)
    grad.addColorStop(0, 'rgba(255,210,80,0.22)')
    grad.addColorStop(1, 'rgba(255,180,40,0)')
    ctx.fillStyle = grad
    ctx.fillRect(x - bw * 0.4, y - 30, bw * 1.8, bh + 50)
    ctx.restore()
  }

  if (isNew) drawSparkle2D(ctx, x + bw / 2, y)
  if (onFire) drawFire2D(ctx, x + bw / 2, y, bw, time)
}

// ── Citizen system ────────────────────────────────────────────
const CITIZEN_COUNT = 6
const citizenList = []
let citizenLastTime = null

function initCitizens() {
  if (citizenList.length > 0) return
  const tunics = ['#e0d098','#c8a870','#d4b070','#dcc898','#cca060','#b89060']
  for (let i = 0; i < CITIZEN_COUNT; i++) {
    const seed = tileNoise(i * 13.7, i * 5.3)
    citizenList.push({
      x: tileNoise(i * 5.1, i * 2.3) * CITY_COLS,
      tx: tileNoise(i * 3.9, i * 7.1) * CITY_COLS,
      walkPhase: seed * Math.PI * 2,
      speed: 1.4 + tileNoise(i * 4.1, i * 9.3) * 0.9,
      dir: 1,
      tunic: tunics[i % tunics.length],
      seed,
      trip: 0,
      waitFor: 0,
      state: 'wander',
      home: null,
      alpha: 1,
      insideTimer: 0,
    })
  }
}

function assignHomes(buildings) {
  const homes = buildings.filter(b => !b.isLandmark)
  if (homes.length === 0) return
  citizenList.forEach((c, i) => { if (!c.home) c.home = homes[i % homes.length] })
}

function doorColX(b) { return b.col + b.w * 0.5 }

function pickWanderTarget(c) {
  return tileNoise(c.seed * 50 + c.trip * 3.7, c.trip * 5.1) * CITY_COLS
}

function updateCitizens(time, buildings) {
  if (citizenLastTime === null) { citizenLastTime = time; return }
  const dt = Math.min(time - citizenLastTime, 0.1)
  citizenLastTime = time
  assignHomes(buildings)

  for (const c of citizenList) {
    if (c.state === 'inside') {
      c.insideTimer -= dt
      if (c.insideTimer <= 0) {
        if (c.home) c.x = doorColX(c.home)
        c.alpha = 0; c.state = 'emerge'
      }
      continue
    }
    if (c.state === 'emerge') {
      c.alpha = Math.min(1, c.alpha + dt * 1.5)
      if (c.alpha >= 1) { c.state = 'wander'; c.tx = pickWanderTarget(c) }
      continue
    }
    if (c.waitFor > 0) { c.waitFor -= dt; continue }

    const dx = c.tx - c.x
    const dist = Math.abs(dx)
    if (dist < 0.12) {
      if (c.state === 'goHome') {
        c.alpha = 0; c.state = 'inside'
        c.insideTimer = 15 + tileNoise(c.seed * 11 + c.trip, c.trip * 3) * 25
        continue
      }
      c.trip++
      const goHome = c.home && tileNoise(c.seed * 7 + c.trip, c.trip * 2.3) < 0.25
      if (goHome) {
        c.tx = doorColX(c.home); c.state = 'goHome'
      } else {
        c.state = 'wander'
        c.waitFor = 0.5 + tileNoise(c.seed * 20 + c.trip, c.trip) * 1.2
        c.tx = pickWanderTarget(c)
      }
    } else {
      c.dir = dx > 0 ? 1 : -1
      c.x += c.dir * Math.min(c.speed * dt, dist)
      c.walkPhase += dt * 9
      if (c.state === 'goHome') c.alpha = Math.min(1, dist * 2.5)
    }
  }
}

function drawCitizen2D(ctx, c, streetOffsetX, groundY) {
  if (c.state === 'inside') return
  const sx = streetOffsetX + c.x * TILE_W
  const moving = Math.abs(c.tx - c.x) > 0.08 && c.waitFor <= 0 && c.state !== 'emerge'
  const leg = moving ? Math.sin(c.walkPhase) * 3.8 : 0
  const bob = moving ? Math.abs(Math.sin(c.walkPhase)) * 1.4 : 0
  const by = groundY - bob

  ctx.save()
  ctx.globalAlpha = c.alpha
  ctx.translate(sx, 0)
  if (c.dir < 0) ctx.scale(-1, 1)

  // Shadow
  ctx.save()
  ctx.globalAlpha = c.alpha * 0.17
  ctx.fillStyle = '#1a0e04'
  ctx.beginPath()
  ctx.ellipse(0, groundY + 2, 5, 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Legs
  ctx.lineCap = 'round'
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#7a5028'
  ctx.beginPath(); ctx.moveTo(-2, by - 6); ctx.lineTo(-3 + leg * 0.55, by + 1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(2,  by - 6); ctx.lineTo( 3 - leg * 0.55, by + 1); ctx.stroke()

  // Sandals
  ctx.strokeStyle = '#5a3818'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(-3 + leg * 0.55, by + 1); ctx.lineTo(-5 + leg * 0.55, by + 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo( 3 - leg * 0.55, by + 1); ctx.lineTo( 5 - leg * 0.55, by + 2); ctx.stroke()

  // Tunic
  ctx.fillStyle = c.tunic
  ctx.beginPath()
  ctx.moveTo(-5, by - 6); ctx.lineTo(5, by - 6); ctx.lineTo(3, by - 15); ctx.lineTo(-3, by - 15)
  ctx.closePath(); ctx.fill()

  // Arms
  ctx.lineWidth = 2
  ctx.strokeStyle = '#c8906a'
  ctx.beginPath(); ctx.moveTo(-3, by - 13); ctx.lineTo(-6, by - 10 + leg * 0.35); ctx.stroke()
  ctx.beginPath(); ctx.moveTo( 3, by - 13); ctx.lineTo( 6, by - 10 - leg * 0.35); ctx.stroke()

  // Head
  ctx.fillStyle = '#c8906a'
  ctx.beginPath(); ctx.arc(0, by - 19, 4.2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#3a2010'
  ctx.beginPath(); ctx.arc(0, by - 19, 4.2, Math.PI, 0); ctx.fill()

  ctx.restore()
}

// ── Main render ───────────────────────────────────────────────
export function renderCity(canvas, buildings, newBuildingId = null, pan = { x: 0, y: 0 }, zoom = 1, fires = []) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height

  ctx.clearRect(0, 0, W, H)

  // Fixed sky gradient (behind everything)
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0,    '#4a80bc')
  sky.addColorStop(0.55, '#88b8d8')
  sky.addColorStop(0.82, '#d4c498')
  sky.addColorStop(1,    '#c8b070')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.translate(pan.x, pan.y)
  ctx.scale(zoom, zoom)

  const groundY       = H / zoom * 0.72
  const streetOffsetX = W / (2 * zoom) - (CITY_COLS * TILE_W) / 2

  drawHills(ctx, W / zoom, groundY)
  drawGround(ctx, W / zoom, H / zoom, groundY)
  drawFlora(ctx, buildings, streetOffsetX, groundY)

  // Sort by row (depth) then col (left to right)
  const sorted = [...buildings].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)
  const time = Date.now() / 1000

  for (const b of sorted) {
    drawBuilding2D(ctx, b, streetOffsetX, groundY, b.id === newBuildingId, fires.some(f => f.col === b.col && f.row === b.row), time)
  }

  initCitizens()
  updateCitizens(time, buildings)
  for (const c of citizenList) drawCitizen2D(ctx, c, streetOffsetX, groundY)

  if (buildings.length === 0) {
    ctx.fillStyle = 'rgba(100,80,50,0.45)'
    ctx.font = `italic ${14 / zoom}px serif`
    ctx.textAlign = 'center'
    ctx.fillText('Complete a session to begin building Rome...', W / (2 * zoom), groundY - 40)
  }

  ctx.restore()
}
