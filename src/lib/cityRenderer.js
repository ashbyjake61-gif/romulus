// Isometric city renderer on HTML Canvas
// Warm Journey/Abzu aesthetic — terracotta + sandy tones

import { CITY_COLS, CITY_ROWS } from './cityEngine.js'

const TILE_W = 64   // isometric tile width (full diamond)
const TILE_H = 32   // isometric tile height (half diamond)
const FLOOR_H = 14  // height per building floor in pixels
const GROUND_COLOR = '#6a9e4a'       // grass green
const GROUND_ALT   = '#5e9040'       // darker grass variation
const ROAD_COLOR   = '#8b7355'       // dirt path

// Sprite cache — loaded once, reused every frame
// SVG convention: viewBox 0 0 680 560, front-bottom anchor at (340, 460),
// iso base diamond spans x=140→540 (400px wide).
const spriteCache = {}
const SVG_VIEWBOX_W = 680
const SVG_VIEWBOX_H = 560
const SVG_DIAMOND_W = 400   // x:140→540
const SVG_ANCHOR_X  = 340   // front-bottom x in viewBox
const SVG_ANCHOR_Y  = 460   // front-bottom y in viewBox

function getSprite(id) {
  if (spriteCache[id] === undefined) {
    spriteCache[id] = null
    // Try SVG first, fall back to PNG
    const img = new Image()
    img.onload = () => { spriteCache[id] = img }
    img.onerror = () => {
      const png = new Image()
      png.onload = () => { spriteCache[id] = png }
      png.onerror = () => { spriteCache[id] = false }
      png.src = `/buildings/${id}.png`
    }
    img.src = `/buildings/${id}.svg`
  }
  return spriteCache[id]
}

// Seeded noise for deterministic flora placement
function tileNoise(c, r) {
  const n = Math.sin(c * 127.1 + r * 311.7) * 43758.5453
  return n - Math.floor(n)
}

// Convert grid (col, row) to screen (x, y) — isometric projection
export function gridToScreen(col, row, offsetX, offsetY) {
  const x = (col - row) * (TILE_W / 2) + offsetX
  const y = (col + row) * (TILE_H / 2) + offsetY
  return { x, y }
}

// Draw a single isometric tile (ground)
function drawTile(ctx, x, y, color, shadow = false) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2)
  ctx.lineTo(x, y + TILE_H)
  ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  if (shadow) {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}

// Draw an isometric building block
// col, row = grid position; w, h = grid footprint; floors = height steps
function drawBuilding(ctx, building, offsetX, offsetY, isNew = false) {
  const { col, row, w, h, floors, color, isLandmark, id } = building

  // For multi-tile buildings we draw from bottom-right corner for painter's algo
  // The "front" corner in iso is at col+w, row+h
  const totalH = floors * FLOOR_H

  // Compute screen position of the front-bottom corner
  const frontCol = col + w
  const frontRow = row + h
  const { x: fx, y: fy } = gridToScreen(frontCol, frontRow, offsetX, offsetY)

  // Building footprint width/depth in screen coords
  const bw = w * TILE_W / 2  // half-width in screen x
  const bd = h * TILE_H / 2  // depth in screen y

  // Wall colors — 3-face shading
  const wallLight  = lighten(color, 0.18)
  const wallShade  = darken(color, 0.22)
  const roofColor  = darken(color, 0.08)
  const topColor   = lighten(color, 0.25)

  // Special building overrides
  const isGarden  = id === 'garden'
  const isFountain = id === 'fountain'
  const isArch    = id === 'arch' || id === 'aqueduct'

  if (isGarden) {
    drawGarden(ctx, col, row, w, h, offsetX, offsetY)
    return
  }

  if (isFountain) {
    drawFountain(ctx, col, row, offsetX, offsetY)
    return
  }

  // Sprite override — use SVG/PNG if present in /public/buildings/
  const sprite = getSprite(id)
  if (sprite) {
    // Scale so the iso diamond base matches the tile footprint on screen.
    // SVG convention: diamond base = SVG_DIAMOND_W px wide in a SVG_VIEWBOX_W × SVG_VIEWBOX_H viewBox.
    // Target width on screen = (w + h) * TILE_W / 2
    const targetDiamondW = (w + h) * (TILE_W / 2)
    const scale = targetDiamondW / SVG_DIAMOND_W
    const sw = SVG_VIEWBOX_W * scale
    const sh = SVG_VIEWBOX_H * scale
    // Anchor: front-bottom of building in SVG at (SVG_ANCHOR_X, SVG_ANCHOR_Y)
    // This should align with the front ground point: (fx, fy + TILE_H)
    const anchorX = SVG_ANCHOR_X * scale
    const anchorY = SVG_ANCHOR_Y * scale
    ctx.drawImage(sprite, fx - anchorX, fy + TILE_H - anchorY, sw, sh)
    return
  }

  // Base ground tiles (procedural fallback)
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      const { x, y } = gridToScreen(c, r, offsetX, offsetY)
      drawTile(ctx, x, y + TILE_H / 2, GROUND_COLOR)
    }
  }

  // Bottom of building (ground level iso top)
  const baseY = fy - bd

  // Right face (darker — shaded side)
  // Corners: front(fx,baseY) → right-row(fx - h*TW/2, baseY + h*TH/2) → raised by totalH → front raised
  const rx = fx - h * (TILE_W / 2)
  const ry = baseY + h * (TILE_H / 2)
  ctx.beginPath()
  ctx.moveTo(fx, baseY - totalH)
  ctx.lineTo(fx, baseY)
  ctx.lineTo(rx, ry)
  ctx.lineTo(rx, ry - totalH)
  ctx.closePath()
  ctx.fillStyle = wallShade
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Left face (lighter — lit side)
  // Corners: front(fx,baseY) → left-col(fx - w*TW/2, baseY - h*TH/2) → same raised by totalH → front raised
  const lx = fx - w * (TILE_W / 2)
  const ly = baseY - h * (TILE_H / 2)
  ctx.beginPath()
  ctx.moveTo(fx,  baseY - totalH)
  ctx.lineTo(fx,  baseY)
  ctx.lineTo(lx,  ly)
  ctx.lineTo(lx,  ly - totalH)
  ctx.closePath()
  ctx.fillStyle = wallLight
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Top face (roof)
  // Four corners: front-top, left-top, back-top, right-top
  // front: (fx, baseY-totalH)
  // left:  (fx - w*TW/2, baseY - h*TH/2 - totalH)
  // back:  (fx - w*TW/2 - h*TW/2, baseY - totalH)   — same height as front in iso
  // right: (fx - h*TW/2, baseY + h*TH/2 - totalH)
  // Top face: 4 isometric corners of the building footprint, all lifted by totalH.
  // Uses gridToScreen offsets relative to front corner (col+w, row+h).
  // front=(col+w,row+h), left=(col,row+h), back=(col,row), right=(col+w,row)
  // Δx = (Δcol - Δrow)*TW/2,  Δy = (Δcol + Δrow)*TH/2
  const topFx = fx                                               // front
  const topFy = baseY - totalH + h * (TILE_H / 2)
  const topLx = fx - w * (TILE_W / 2)                           // left (col-w, same row)
  const topLy = topFy - w * (TILE_H / 2)
  const topRx = fx - h * (TILE_W / 2)                           // right (same col, row-h) → up-right
  const topRy = topFy - h * (TILE_H / 2)
  const topBx = fx - w * (TILE_W / 2) - h * (TILE_W / 2)       // back (col-w, row-h)
  const topBy = topFy - w * (TILE_H / 2) - h * (TILE_H / 2)

  ctx.beginPath()
  ctx.moveTo(topFx, topFy)
  ctx.lineTo(topLx, topLy)
  ctx.lineTo(topBx, topBy)
  ctx.lineTo(topRx, topRy)
  ctx.closePath()
  ctx.fillStyle = topColor
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Roof ridge / decoration for certain buildings
  if (floors >= 3 && !isArch) {
    drawRoofDecoration(ctx, id, fx, baseY, w, h, totalH, color)
  }

  // Landmark glow ring
  if (isLandmark) {
    drawGlowRing(ctx, fx - (w + h) * TILE_W / 4, baseY - totalH / 2, (w + h) * 20)
  }

  // Windows
  if (floors >= 2 && !isArch) {
    drawWindows(ctx, fx, baseY, w, h, totalH, color)
  }

  // New building sparkle
  if (isNew) {
    drawSparkle(ctx, fx - (w + h) * TILE_W / 4, baseY - totalH)
  }
}

function drawWindows(ctx, fx, baseY, w, h, totalH, color) {
  const winColor = 'rgba(255, 220, 150, 0.6)'
  const winSize = 4

  // Left face windows
  for (let floor = 0; floor < Math.min(Math.floor(totalH / FLOOR_H), 3); floor++) {
    const winsPerFloor = Math.max(1, w)
    for (let wi = 0; wi < winsPerFloor; wi++) {
      const t = (wi + 0.5) / winsPerFloor
      const wx = fx - t * w * (TILE_W / 2)
      const wy = baseY - floor * FLOOR_H - FLOOR_H / 2 - h * (TILE_H / 2) * t
      ctx.fillStyle = winColor
      ctx.fillRect(wx - winSize / 2, wy - winSize / 2, winSize, winSize * 1.4)
    }
  }
}

function drawRoofDecoration(ctx, id, fx, baseY, w, h, totalH, color) {
  const peakX = fx - (w + h) * TILE_W / 4
  const peakY = baseY - totalH - 8

  if (id === 'temple_small' || id === 'temple_jupiter') {
    // Pediment triangle on top face
    ctx.beginPath()
    ctx.moveTo(fx - w * TILE_W / 4, baseY - totalH - 2)
    ctx.lineTo(peakX, peakY - 12)
    ctx.lineTo(fx - h * TILE_W / 4, baseY - totalH - 2)
    ctx.closePath()
    ctx.fillStyle = lighten(color, 0.3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 0.8
    ctx.stroke()
  } else if (id === 'colosseum' || id === 'amphitheater') {
    // Arched openings suggestion
    for (let a = 0; a < Math.min(w * 2, 6); a++) {
      const ax = fx - (a + 0.5) / (w * 2) * w * TILE_W / 2
      const ay = baseY - FLOOR_H * 0.8
      ctx.beginPath()
      ctx.arc(ax, ay, 3, Math.PI, 0)
      ctx.strokeStyle = darken(color, 0.3)
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  } else if (id === 'pantheon') {
    // Dome suggestion
    ctx.beginPath()
    ctx.ellipse(peakX, peakY, w * 10, h * 6, 0, Math.PI, 0)
    ctx.fillStyle = lighten(color, 0.2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawGlowRing(ctx, cx, cy, radius) {
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius)
  grad.addColorStop(0, 'rgba(255, 210, 80, 0.35)')
  grad.addColorStop(1, 'rgba(255, 180, 40, 0)')
  ctx.beginPath()
  ctx.ellipse(cx, cy, radius * 1.4, radius * 0.7, 0, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
}

function drawGarden(ctx, col, row, w, h, offsetX, offsetY) {
  // Draw ground tiles in green
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      const { x, y } = gridToScreen(c, r, offsetX, offsetY)
      drawTile(ctx, x, y + TILE_H / 2, '#8aaa60')
    }
  }
  // Draw some trees
  const treePositions = [
    { c: col + 0.5, r: row + 0.5 },
    { c: col + w - 0.5, r: row + 0.5 },
    { c: col + 0.5, r: row + h - 0.5 },
    { c: col + w - 0.5, r: row + h - 0.5 },
  ]
  for (const tp of treePositions) {
    if (tp.c < col + w && tp.r < row + h) {
      const { x, y } = gridToScreen(tp.c, tp.r, offsetX, offsetY)
      drawTree(ctx, x, y + TILE_H / 2)
    }
  }
}

function drawTree(ctx, x, y) {
  // Trunk
  ctx.fillStyle = '#8B6040'
  ctx.fillRect(x - 2, y - 10, 4, 10)
  // Foliage — 3 circles for depth
  ctx.fillStyle = '#5a8a30'
  ctx.beginPath()
  ctx.arc(x, y - 18, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#6aa040'
  ctx.beginPath()
  ctx.arc(x - 4, y - 14, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7ab848'
  ctx.beginPath()
  ctx.arc(x + 3, y - 16, 6, 0, Math.PI * 2)
  ctx.fill()
}

function drawFountain(ctx, col, row, offsetX, offsetY) {
  const { x, y } = gridToScreen(col + 0.5, row + 0.5, offsetX, offsetY)
  const cy = y + TILE_H / 2

  // Basin
  ctx.beginPath()
  ctx.ellipse(x, cy + 4, 16, 8, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#6899aa'
  ctx.fill()
  ctx.strokeStyle = '#c8b080'
  ctx.lineWidth = 2
  ctx.stroke()

  // Water
  ctx.beginPath()
  ctx.ellipse(x, cy + 4, 12, 6, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(100,180,220,0.7)'
  ctx.fill()

  // Center column
  ctx.fillStyle = '#d4b468'
  ctx.fillRect(x - 2, cy - 8, 4, 12)

  // Water spray
  ctx.strokeStyle = 'rgba(150,210,240,0.6)'
  ctx.lineWidth = 1
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x, cy - 8)
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * 6,
      cy - 14,
      x + Math.cos(angle) * 10,
      cy - 6
    )
    ctx.stroke()
  }
}

function drawSparkle(ctx, cx, cy) {
  ctx.save()
  ctx.globalAlpha = 0.8
  const points = 6
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const r = 12 + Math.random() * 6
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(
      cx + Math.cos(angle) * r,
      cy + Math.sin(angle) * r * 0.5
    )
    ctx.strokeStyle = '#ffe080'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  ctx.restore()
}

// Color helpers
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function drawFlower(ctx, x, y, seed) {
  const colors = ['#f7d0e8', '#ffe066', '#ff9ec4', '#ffffff', '#b8e0ff']
  const petalColor = colors[Math.floor(seed * colors.length * 7) % colors.length]
  const petalCount = 5
  const r = 2.5

  // Stem
  ctx.strokeStyle = '#4a7a28'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 7)
  ctx.stroke()

  // Petals
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(x + Math.cos(angle) * r * 1.4, y - 7 + Math.sin(angle) * r, r, 0, Math.PI * 2)
    ctx.fillStyle = petalColor
    ctx.fill()
  }
  // Centre
  ctx.beginPath()
  ctx.arc(x, y - 7, r * 0.7, 0, Math.PI * 2)
  ctx.fillStyle = '#f0c040'
  ctx.fill()
}

function drawWeed(ctx, x, y, seed) {
  const bladeCount = 3 + Math.floor(seed * 3)
  for (let i = 0; i < bladeCount; i++) {
    const angle = -Math.PI / 2 + (i - bladeCount / 2) * 0.45 + (seed - 0.5) * 0.3
    const len = 6 + seed * 5
    const lean = Math.sin(seed * 10 + i) * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * len * 0.5 + lean,
      y + Math.sin(angle) * len * 0.5,
      x + Math.cos(angle) * len + lean * 1.5,
      y + Math.sin(angle) * len
    )
    ctx.strokeStyle = i % 2 === 0 ? '#4a8a30' : '#5a9e38'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
}

// Draw a subtle road grid
function drawRoads(ctx, buildings, offsetX, offsetY) {
  if (buildings.length < 2) return
  ctx.strokeStyle = ROAD_COLOR
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.5

  // Draw horizontal-ish and vertical-ish iso lines as road hints
  // Simple: draw a line connecting every 5th grid row and col
  for (let r = 0; r < CITY_ROWS; r += 4) {
    ctx.beginPath()
    const { x: x0, y: y0 } = gridToScreen(0, r, offsetX, offsetY)
    const { x: x1, y: y1 } = gridToScreen(CITY_COLS, r, offsetX, offsetY)
    ctx.moveTo(x0, y0 + TILE_H / 2)
    ctx.lineTo(x1, y1 + TILE_H / 2)
    ctx.stroke()
  }
  for (let c = 0; c < CITY_COLS; c += 4) {
    ctx.beginPath()
    const { x: x0, y: y0 } = gridToScreen(c, 0, offsetX, offsetY)
    const { x: x1, y: y1 } = gridToScreen(c, CITY_ROWS, offsetX, offsetY)
    ctx.moveTo(x0, y0 + TILE_H / 2)
    ctx.lineTo(x1, y1 + TILE_H / 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// Draw animated fire over a building position
function drawFire(ctx, col, row, w, h, time) {
  const cx = (col + w / 2)
  const cy = (row + h / 2)
  const { x: sx, y: sy } = { x: 0, y: 0 } // computed below via gridToScreen — use passed coords instead
  // We pass screen coords directly
  const flameCount = 7
  const baseWidth = (w + h) * 10

  // Char/scorch overlay on the building faces — dark semi-transparent
  ctx.save()
  ctx.globalAlpha = 0.45
  ctx.fillStyle = '#1a0a00'
  // Just paint a dark ellipse over the building footprint center
  ctx.beginPath()
  ctx.ellipse(col, row, baseWidth * 0.7, baseWidth * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Smoke puffs (drawn first, behind flames)
  for (let i = 0; i < 4; i++) {
    const phase = time * 0.8 + i * 1.4
    const ox = Math.sin(phase * 0.7 + i) * 8
    const rise = ((time * 40 + i * 18) % 60)
    const alpha = 0.12 + 0.08 * Math.sin(phase)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#555'
    ctx.beginPath()
    ctx.arc(col + ox, row - rise - 20, 8 + i * 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Flame tongues
  for (let i = 0; i < flameCount; i++) {
    const phase = time * 3.5 + i * (Math.PI * 2 / flameCount)
    const flicker = Math.sin(phase) * 0.4 + 0.6
    const ox = Math.sin(time * 2 + i * 1.1) * baseWidth * 0.4
    const height = (18 + Math.sin(phase * 1.3) * 8) * flicker
    const alpha = 0.7 + 0.3 * Math.sin(phase)

    // Outer flame (orange-red)
    const grad = ctx.createRadialGradient(col + ox, row - 4, 1, col + ox, row - height * 0.5, height)
    grad.addColorStop(0,   `rgba(255, 200, 50, ${alpha})`)
    grad.addColorStop(0.4, `rgba(255, 100, 20, ${alpha * 0.8})`)
    grad.addColorStop(1,   'rgba(180, 30, 0, 0)')

    ctx.save()
    ctx.globalAlpha = alpha * 0.9
    ctx.beginPath()
    ctx.moveTo(col + ox - baseWidth * 0.18, row)
    ctx.quadraticCurveTo(
      col + ox + Math.sin(phase) * 6,
      row - height * 0.6,
      col + ox,
      row - height
    )
    ctx.quadraticCurveTo(
      col + ox - Math.sin(phase) * 6,
      row - height * 0.6,
      col + ox + baseWidth * 0.18,
      row
    )
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()
  }

  // Bright core ember
  ctx.save()
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 5)
  ctx.fillStyle = '#fff8c0'
  ctx.beginPath()
  ctx.ellipse(col, row - 2, baseWidth * 0.22, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Main render function
export function renderCity(canvas, buildings, newBuildingId = null, pan = { x: 0, y: 0 }, zoom = 1, fires = []) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height

  // Clear
  ctx.clearRect(0, 0, W, H)

  // Sky gradient — soft blue-grey
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6)
  skyGrad.addColorStop(0, '#c8dff0')
  skyGrad.addColorStop(1, '#ddeedd')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.translate(pan.x, pan.y)
  ctx.scale(zoom, zoom)

  // Center offset — put grid center at canvas center
  const offsetX = W / (2 * zoom)
  const offsetY = H / (2 * zoom) - (CITY_ROWS * TILE_H) / 4

  // Build a set of occupied cells for flora culling
  const occupiedCells = new Set()
  for (const b of buildings) {
    for (let r = b.row; r < b.row + b.h; r++) {
      for (let c = b.col; c < b.col + b.w; c++) {
        occupiedCells.add(`${c},${r}`)
      }
    }
  }

  // Draw ground tiles
  for (let r = 0; r < CITY_ROWS; r++) {
    for (let c = 0; c < CITY_COLS; c++) {
      const { x, y } = gridToScreen(c, r, offsetX, offsetY)
      const noise = tileNoise(c, r)
      // Subtle grass variation — 3 shades
      const shade = noise < 0.33 ? GROUND_COLOR : noise < 0.66 ? GROUND_ALT : '#74a852'
      drawTile(ctx, x, y + TILE_H / 2, shade, true)
    }
  }

  // Draw flora on unoccupied tiles
  for (let r = 0; r < CITY_ROWS; r++) {
    for (let c = 0; c < CITY_COLS; c++) {
      if (occupiedCells.has(`${c},${r}`)) continue
      const noise = tileNoise(c + 100, r + 100)
      if (noise < 0.06) {
        // Flower
        const { x, y } = gridToScreen(c, r, offsetX, offsetY)
        const cx = x + (tileNoise(c, r + 50) - 0.5) * 20
        const cy = y + TILE_H / 2 + (tileNoise(c + 50, r) - 0.5) * 8
        drawFlower(ctx, cx, cy, noise)
      } else if (noise < 0.14) {
        // Weed / grass tuft
        const { x, y } = gridToScreen(c, r, offsetX, offsetY)
        const cx = x + (tileNoise(c, r + 77) - 0.5) * 24
        const cy = y + TILE_H / 2 + (tileNoise(c + 77, r) - 0.5) * 10
        drawWeed(ctx, cx, cy, noise)
      }
    }
  }

  // Draw roads
  if (buildings.length > 0) {
    drawRoads(ctx, buildings, offsetX, offsetY)
  }

  // Sort buildings by painter's algorithm (col + row ascending)
  const sorted = [...buildings].sort((a, b) => (a.col + a.row) - (b.col + b.row))

  const time = Date.now() / 1000

  for (const b of sorted) {
    const isNew = b.id === newBuildingId
    const onFire = fires.some(f => f.col === b.col && f.row === b.row)
    drawBuilding(ctx, b, offsetX, offsetY, isNew)

    // Draw fire on top of burning buildings
    if (onFire) {
      const frontCol = b.col + b.w
      const frontRow = b.row + b.h
      const { x: fx, y: fy } = gridToScreen(frontCol, frontRow, offsetX, offsetY)
      const bd = b.h * TILE_H / 2
      const totalH = b.floors * FLOOR_H
      const baseY = fy - bd
      // Center the fire over the building's top face center
      const fireCx = fx - (b.w + b.h) * TILE_W / 4
      const fireCy = baseY - totalH
      drawFire(ctx, fireCx, fireCy, b.w, b.h, time)
    }
  }

  ctx.restore()
}
