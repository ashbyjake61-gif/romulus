// 2D Side-scrolling city renderer — Terraria-inspired Roman city

import { CITY_COLS } from './cityEngine.js'

const TILE_W    = 80
const FLOOR_H   = 28
const BLDG_BASE = 16
const PIXEL     = 2   // was 4 — double resolution, same physical size

// ── Offscreen low-res canvas ──────────────────────────────────
let offscreenCanvas = null
let offW = 0, offH = 0

function getOffscreen(W, H) {
  const lw = Math.floor(W / PIXEL)
  const lh = Math.floor(H / PIXEL)
  if (!offscreenCanvas || offW !== lw || offH !== lh) {
    offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = lw
    offscreenCanvas.height = lh
    offW = lw; offH = lh
  }
  return offscreenCanvas
}

// ── Helpers ───────────────────────────────────────────────────
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

// ── Sky ───────────────────────────────────────────────────────
function drawSky(oc, LW, LH) {
  const sky = oc.createLinearGradient(0, 0, 0, LH)
  sky.addColorStop(0,    '#1a3568')
  sky.addColorStop(0.28, '#2d5ca8')
  sky.addColorStop(0.58, '#4a8cd0')
  sky.addColorStop(0.80, '#80c0e8')
  sky.addColorStop(1,    '#b8d8ec')
  oc.fillStyle = sky
  oc.fillRect(0, 0, LW, LH)
}

function drawStars(oc, LW, LH) {
  for (let i = 0; i < 72; i++) {
    const sx  = tileNoise(i * 7.3,  i * 2.1) * LW
    const sy  = tileNoise(i * 3.7,  i * 5.9) * LH * 0.44
    const bri = 0.30 + tileNoise(i * 9.1, i * 4.3) * 0.70
    const big = tileNoise(i * 11.3, i * 6.7) > 0.78
    oc.fillStyle = `rgba(255,248,220,${bri.toFixed(2)})`
    if (big) {
      oc.fillRect(Math.floor(sx),     Math.floor(sy),     2, 1)
      oc.fillRect(Math.floor(sx) + 1, Math.floor(sy) - 1, 1, 1)
      oc.fillRect(Math.floor(sx) + 1, Math.floor(sy) + 1, 1, 1)
    } else {
      oc.fillRect(Math.floor(sx), Math.floor(sy), 1, 1)
    }
  }
}

function drawPixelSun(oc, LW, LH) {
  const cx = LW - 26, cy = 20, r = 13
  const glow = oc.createRadialGradient(cx, cy, r, cx, cy, r + 16)
  glow.addColorStop(0, 'rgba(255,230,90,0.55)')
  glow.addColorStop(1, 'rgba(255,180,30,0)')
  oc.fillStyle = glow
  oc.beginPath(); oc.arc(cx, cy, r + 16, 0, Math.PI * 2); oc.fill()
  oc.fillStyle = '#fce840'
  oc.beginPath(); oc.arc(cx, cy, r, 0, Math.PI * 2); oc.fill()
  oc.fillStyle = '#fffd90'
  oc.fillRect(cx - 6, cy - 9, 4, 4)
  oc.fillRect(cx - 9, cy - 4, 2, 2)
  oc.fillStyle = '#f8c820'
  const rays = [
    [cx - 1, cy - r - 3, 2, 5], [cx - 1, cy + r + 3, 2, 5],
    [cx + r + 3, cy - 1, 5, 2], [cx - r - 7, cy - 1, 5, 2],
    [cx + r,   cy - r - 1, 4, 2], [cx + r,   cy + r - 1, 4, 2],
    [cx - r - 3, cy - r - 1, 2, 4], [cx - r - 3, cy + r - 1, 2, 4],
  ]
  for (const [x, y, w, h] of rays) oc.fillRect(Math.round(x), Math.round(y), w, h)
}

// ── Clouds ────────────────────────────────────────────────────
const CLOUD_DEFS = [
  { ox: 0.08, oy: 0.065, w: 34, h: 10 },
  { ox: 0.30, oy: 0.038, w: 52, h: 13 },
  { ox: 0.55, oy: 0.085, w: 38, h: 10 },
  { ox: 0.76, oy: 0.048, w: 30, h:  8 },
  { ox: 0.92, oy: 0.115, w: 24, h:  7 },
  { ox: 0.43, oy: 0.140, w: 28, h:  8 },
]

function drawPixelCloud(oc, cx, cy, w, h) {
  oc.fillStyle = 'rgba(248,252,255,0.90)'
  oc.fillRect(Math.round(cx),              Math.round(cy + h * 0.48), w,                     Math.ceil(h * 0.52))
  oc.fillRect(Math.round(cx + w * 0.07),   Math.round(cy + h * 0.20), Math.round(w * 0.86),  Math.ceil(h * 0.46))
  oc.fillRect(Math.round(cx + w * 0.14),   Math.round(cy),             Math.round(w * 0.28),  Math.ceil(h * 0.40))
  oc.fillRect(Math.round(cx + w * 0.44),   Math.round(cy + h * 0.06), Math.round(w * 0.34),  Math.ceil(h * 0.36))
  oc.fillRect(Math.round(cx + w * 0.72),   Math.round(cy + h * 0.16), Math.round(w * 0.20),  Math.ceil(h * 0.30))
  oc.fillStyle = 'rgba(160,195,225,0.32)'
  oc.fillRect(Math.round(cx + w * 0.12),   Math.round(cy + h * 0.78), Math.round(w * 0.76),  Math.ceil(h * 0.22))
}

function drawClouds(oc, LW, LH, panX, time) {
  const drift    = time * 0.38
  const parallax = panX * 0.025 / PIXEL
  const shift    = drift + parallax
  for (const def of CLOUD_DEFS) {
    const base = def.ox * LW * 2.8
    const cx = ((base - shift) % (LW * 2.8) + LW * 2.8) % (LW * 2.8) - LW * 0.25
    drawPixelCloud(oc, cx, def.oy * LH, def.w, def.h)
  }
}

// ── Parallax hills — drawn in LR canvas space ─────────────────
function drawHillLayerLR(oc, LW, groundLR, shift, height, f1, p1, f2, p2, color, alpha) {
  oc.globalAlpha = alpha
  oc.fillStyle   = color
  oc.beginPath()
  oc.moveTo(-2, groundLR + 2)
  for (let x = 0; x <= LW + 2; x += 2) {
    const wx = x + shift
    const y  = groundLR
      - height
      - Math.sin(wx * f1 + p1) * height * 0.45
      - Math.sin(wx * f2 + p2) * height * 0.28
    oc.lineTo(x, Math.min(groundLR + 1, y))
  }
  oc.lineTo(LW + 2, groundLR + 2)
  oc.closePath()
  oc.fill()
  oc.globalAlpha = 1
}

function drawHillsLR(oc, LW, LH, panX, panY) {
  const groundLR = LH * 0.72 + panY * 0.10 / PIXEL
  drawHillLayerLR(oc, LW, groundLR, panX * 0.07 / PIXEL, 40, 0.018, 1.3,  0.008, 0.7,  '#b0cc80', 0.58)
  drawHillLayerLR(oc, LW, groundLR, panX * 0.17 / PIXEL, 26, 0.026, 2.2,  0.012, 1.9,  '#7aaa50', 0.68)
  drawHillLayerLR(oc, LW, groundLR, panX * 0.32 / PIXEL, 15, 0.038, 0.5,  0.020, 3.5,  '#5e9038', 0.76)
}

// ── Ground — Terraria style ───────────────────────────────────
function drawGround(ctx, W, H, groundY) {
  const GRASS_TOP = 4
  const DIRT_H    = 60
  // Stone base
  ctx.fillStyle = '#3e3c4a'
  ctx.fillRect(-500, groundY + GRASS_TOP + DIRT_H, W + 1000, H)
  ctx.fillStyle = '#4e4c5c'
  ctx.fillRect(-500, groundY + GRASS_TOP + DIRT_H, W + 1000, 2)
  // Dirt fill
  ctx.fillStyle = '#6a4018'
  ctx.fillRect(-500, groundY + GRASS_TOP, W + 1000, DIRT_H)
  // Dirt brick rows
  const BH = 8, BW = 18
  for (let row = 0; row < Math.ceil(DIRT_H / BH); row++) {
    const by     = groundY + GRASS_TOP + row * BH
    const offset = row % 2 === 0 ? 0 : BW * 0.5
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(-500, by + BH - 1, W + 1000, 1)
    for (let bx = -500 + offset; bx < W + 500; bx += BW) {
      const n = tileNoise(bx * 0.05, by * 0.09)
      ctx.fillStyle = n > 0.62 ? '#7a5028' : (n < 0.26 ? '#5a3410' : '#6a4018')
      ctx.fillRect(bx, by, BW - 1, BH - 1)
      ctx.fillStyle = 'rgba(0,0,0,0.16)'
      ctx.fillRect(bx + BW - 1, by, 1, BH - 1)
    }
  }
  // Grass surface
  ctx.fillStyle = '#4e9030'
  ctx.fillRect(-500, groundY, W + 1000, GRASS_TOP + 2)
  ctx.fillStyle = '#68b83c'
  ctx.fillRect(-500, groundY, W + 1000, 2)
  ctx.fillStyle = '#58a830'
  ctx.fillRect(-500, groundY + 2, W + 1000, 2)
  // Grass blades
  for (let x = -500; x < W + 500; x += 2) {
    const bn = tileNoise(x * 0.08, 88.3)
    if (bn > 0.38) {
      const bh = 3 + Math.floor(bn * 6)
      ctx.fillStyle = bn > 0.72 ? '#78cc44' : '#58b030'
      ctx.fillRect(x, groundY - bh, 1, bh)
    }
  }
}

// ── Sprite helpers ────────────────────────────────────────────
function spriteBrickWall(oc, x, y, w, h, baseColor) {
  const BH = 4, BW = 9
  oc.fillStyle = baseColor
  oc.fillRect(x, y, w, h)
  for (let row = 0; row < Math.ceil(h / BH); row++) {
    const by  = y + row * BH
    const off = row % 2 === 0 ? 0 : Math.floor(BW / 2)
    if (row > 0) {
      oc.fillStyle = 'rgba(0,0,0,0.22)'
      oc.fillRect(x, by, w, 1)
    }
    for (let bx = x - off; bx < x + w; bx += BW) {
      const clampX = Math.max(bx, x)
      const clampW = Math.min(bx + BW - 1, x + w) - clampX
      if (clampW <= 0) continue
      const n = tileNoise(bx * 0.41 + row * 0.7, row * 1.3)
      if (n > 0.64) {
        oc.fillStyle = lighten(baseColor, 0.10)
        oc.fillRect(clampX, by + 1, clampW, BH - 2)
      } else if (n < 0.24) {
        oc.fillStyle = darken(baseColor, 0.12)
        oc.fillRect(clampX, by + 1, clampW, BH - 2)
      }
      oc.fillStyle = 'rgba(0,0,0,0.17)'
      if (bx + BW - 1 > x && bx + BW - 1 < x + w) {
        oc.fillRect(bx + BW - 1, by + 1, 1, BH - 2)
      }
    }
  }
}

function spriteWindow(oc, x, y, w, h, dark) {
  oc.fillStyle = 'rgba(0,0,0,0.30)'
  oc.fillRect(x - 1, y - 2, w + 2, h + 3)
  oc.fillStyle = dark
  oc.fillRect(x + 1, y - 2, w - 2, 1)
  oc.fillRect(x,     y - 1, w,     1)
  oc.fillRect(x, y, w, h)
  // warm glow
  oc.fillStyle = 'rgba(255,200,80,0.20)'
  oc.fillRect(x + 1, y + 1, w - 2, h - 2)
  // cross dividers
  oc.fillStyle = 'rgba(170,120,50,0.50)'
  oc.fillRect(x + Math.floor(w / 2), y, 1, h)
  oc.fillRect(x, y + Math.floor(h / 2), w, 1)
  // glint
  oc.fillStyle = 'rgba(255,230,140,0.40)'
  oc.fillRect(x + 1, y + 1, 2, 3)
  // sill
  oc.fillStyle = '#a08048'
  oc.fillRect(x - 1, y + h + 1, w + 2, 1)
}

function spriteDoor(oc, x, y, w, h, surColor, dark) {
  oc.fillStyle = surColor
  oc.fillRect(x - 2, y, w + 4, h)
  // arch peak
  oc.fillStyle = dark
  oc.fillRect(x + 2, y - 3, w - 4, 3)
  oc.fillRect(x + 1, y - 1, w - 2, 1)
  oc.fillRect(x, y, w, h)
  // door panels
  oc.fillStyle = 'rgba(80,48,16,0.55)'
  const ph = Math.floor(h * 0.42), pw = Math.floor(w / 2) - 2
  oc.fillRect(x + 1,       y + 2,  pw, ph)
  oc.fillRect(x + w/2 + 1, y + 2,  pw, ph)
  oc.fillRect(x + 1,       y + ph + 4, pw, ph - 2)
  oc.fillRect(x + w/2 + 1, y + ph + 4, pw, ph - 2)
  // handle
  oc.fillStyle = '#e0b020'
  oc.fillRect(x + w - 3, y + Math.floor(h * 0.45), 1, 3)
  // step
  oc.fillStyle = lighten(surColor, 0.10)
  oc.fillRect(x - 3, y + h - 1, w + 6, 2)
}

function spriteLantern(oc, x, y) {
  oc.fillStyle = '#8a6830'
  oc.fillRect(x, y,     1, 2)
  oc.fillStyle = '#c09028'
  oc.fillRect(x - 1, y + 2, 3, 4)
  oc.fillStyle = 'rgba(255,210,60,0.75)'
  oc.fillRect(x,     y + 3, 1, 2)
}

// ── Insula sprite 40×44 — double-detail at PIXEL=2 ───────────
// Roman villa sprite — 60×64 logical px → 120×128 screen px at PIXEL=2
// Historically accurate: terracotta roof, Ionic columns, grand triumphal arch
// entrance, painted stucco walls, arched windows with wooden shutters,
// stone plinth + wide steps. CK3-inspired richness and depth.
function buildInsulaSpriteCanvas(_color) {
  const W = 60, H = 64
  const off = document.createElement('canvas')
  off.width = W; off.height = H
  const oc = off.getContext('2d')

  // ── Palette (Pompeii / Roman fresco colours) ──────────────
  const wLit   = '#e8d498'   // stucco, lit face (warm ochre)
  const wMid   = '#d4bc7c'   // stucco, mid tone
  const wShd   = '#c0a25c'   // stucco, shadow side
  const frz    = '#c8a43c'   // golden frieze
  const rLit   = '#c84020'   // terracotta, lit
  const rRidge = '#f07040'   // terracotta ridge (brightest)
  const sLit   = '#c0b080'   // stone, lit
  const sMid   = '#a89868'   // stone, mid
  const sShd   = '#887850'   // stone, shadow
  const cLit   = '#f4ecd8'   // column shaft, lit (near-white)
  const cShd   = '#d8cca8'   // column shaft, shadow
  const cCap   = '#faf6ee'   // column capital highlight
  const wDark  = '#16100a'   // window / arch interior
  const gold   = '#d8a828'   // gold accents (keystone, rings)
  const shut   = '#7c4c1c'   // wooden shutters (Roman oak)
  const ambr1  = 'rgba(255,195,70,0.44)'   // arch glow outer
  const ambr2  = 'rgba(255,230,130,0.58)'  // arch glow mid
  const ambr3  = 'rgba(255,248,190,0.38)'  // arch glow inner

  // ── ACROTERION rows 0–1 (ornamental apex finial) ───────────
  oc.fillStyle = rRidge
  oc.fillRect(27, 0, 6, 1)
  oc.fillStyle = '#f0d080'
  oc.fillRect(28, 1, 4, 1)

  // ── GABLED ROOF rows 2–13 ──────────────────────────────────
  // Lit left face, deep-shadow right face, tile courses every 2 rows
  for (let row = 0; row < 12; row++) {
    const t     = row / 11
    const halfW = Math.round(1 + t * 29)
    const lx    = 30 - halfW
    const lr = Math.round(200 - t * 56), lg = Math.round(64 - t * 22), lb = Math.round(32 - t * 12)
    const sr = Math.round(132 - t * 40), sg = Math.round(44 - t * 16), sb = Math.round(22 - t * 10)
    oc.fillStyle = `rgb(${lr},${lg},${lb})`
    oc.fillRect(lx, row + 2, halfW, 1)
    oc.fillStyle = `rgb(${sr},${sg},${sb})`
    oc.fillRect(30, row + 2, halfW, 1)
    if (row > 0 && row % 2 === 0 && halfW > 1) {
      oc.fillStyle = 'rgba(0,0,0,0.12)'
      oc.fillRect(lx, row + 2, halfW * 2, 1)
    }
  }
  oc.fillStyle = rRidge; oc.fillRect(28, 2, 4, 1)
  oc.fillStyle = lighten(rRidge, 0.22); oc.fillRect(29, 2, 2, 1)
  // Eave overhang
  oc.fillStyle = darken(rLit, 0.22); oc.fillRect(0, 13, W, 1)
  oc.fillStyle = lighten(sLit, 0.16); oc.fillRect(0, 14, W, 1)

  // ── FRIEZE rows 15–16 (dentillated cornice) ────────────────
  oc.fillStyle = frz; oc.fillRect(0, 15, W, 2)
  oc.fillStyle = lighten(frz, 0.28); oc.fillRect(0, 15, W, 1)
  oc.fillStyle = darken(frz, 0.28)
  for (let x = 3; x < W - 2; x += 6) {
    oc.fillRect(x, 15, 3, 2)
    oc.fillRect(x + 3, 16, 2, 1)
  }

  // ── UPPER FLOOR rows 17–28 (painted stucco, 3 arched windows) ──
  spriteBrickWall(oc, 0, 17, W, 12, wLit)
  // Corner pilasters (lit left, shadow right)
  oc.fillStyle = lighten(wLit, 0.24); oc.fillRect(0, 17, 4, 12)
  oc.fillStyle = wShd; oc.fillRect(W - 4, 17, 4, 12)
  // 3 arched windows with painted wooden shutters
  for (const [wx, ww] of [[6, 9], [24, 10], [42, 9]]) {
    spriteWindow(oc, wx, 19, ww, 9, wDark)
    // Shutter panels (left and right of each window)
    oc.fillStyle = shut
    oc.fillRect(wx - 2, 19, 2, 9)
    oc.fillRect(wx + ww, 19, 2, 9)
    // Shutter slat lines
    oc.fillStyle = darken(shut, 0.25)
    for (let sy = 20; sy < 28; sy += 2) {
      oc.fillRect(wx - 2, sy, 2, 1)
      oc.fillRect(wx + ww, sy, 2, 1)
    }
  }

  // ── BELT COURSE rows 29–30 (projecting stone band) ─────────
  oc.fillStyle = lighten(sMid, 0.12); oc.fillRect(0, 29, W, 1)
  oc.fillStyle = darken(sMid, 0.16);  oc.fillRect(0, 30, W, 1)

  // ── LOWER FLOOR rows 31–52 (columns + grand arch + windows) ─
  spriteBrickWall(oc, 0, 31, W, 22, wMid)
  oc.fillStyle = wShd; oc.fillRect(W - 4, 31, 4, 22)

  // ── Four Ionic columns engaged with the arch surround ───────
  // cx = shaft left edge.  Capital 3 rows, shaft 15 rows, base 3 rows.
  for (const [cx, lit] of [[2,true],[15,true],[41,false],[54,false]]) {
    // Capital (flared top — Ionic volute suggestion)
    oc.fillStyle = cCap;                oc.fillRect(cx - 1, 31, 7, 1)
    oc.fillStyle = lit ? cLit : cShd;  oc.fillRect(cx - 1, 32, 7, 2)
    // Shaft with highlight + shadow strips
    oc.fillStyle = lit ? cLit : cShd;  oc.fillRect(cx, 34, 5, 15)
    oc.fillStyle = 'rgba(255,255,255,0.18)'; oc.fillRect(cx, 34, 1, 15)
    oc.fillStyle = 'rgba(0,0,0,0.22)';       oc.fillRect(cx + 4, 34, 1, 15)
    // Attic base
    oc.fillStyle = lit ? sLit : sMid;  oc.fillRect(cx - 1, 49, 7, 3)
    oc.fillStyle = darken(sMid, 0.14); oc.fillRect(cx - 1, 51, 7, 1)
  }

  // ── Grand triumphal arch entrance ───────────────────────────
  // archX=18, archW=24 → opening 18–41, centre at x=30
  const aX = 18, aW = 24, aTop = 32

  // Arch surround (golden frame, 2px wider each side)
  oc.fillStyle = lighten(frz, 0.10)
  oc.fillRect(aX - 2, aTop - 1, aW + 4, 22)

  // Pixel-art semicircular arch crown (staircase approximation, radius 12)
  oc.fillStyle = wDark
  for (const [sx, sy, sw] of [
    [aX + 10, aTop,     4],   // apex
    [aX +  7, aTop + 1, 10],
    [aX +  4, aTop + 2, 16],
    [aX +  2, aTop + 3, 20],
    [aX +  1, aTop + 4, 22],
    [aX,      aTop + 5, 24],  // full width — rect starts here
  ]) oc.fillRect(sx, sy, sw, 1)

  // Arch rectangular dark body (rows aTop+6 to 52)
  oc.fillRect(aX, aTop + 6, aW, 52 - (aTop + 6) + 1)

  // Keystone — gold wedge above arch crown
  oc.fillStyle = gold;              oc.fillRect(aX + 9, aTop - 1, 6, 3)
  oc.fillStyle = lighten(gold, 0.32); oc.fillRect(aX + 10, aTop - 1, 4, 1)

  // Warm amber candlelight inside arch (three layered glows)
  oc.fillStyle = ambr1; oc.fillRect(aX,     aTop + 6, aW,     46)
  oc.fillStyle = ambr2; oc.fillRect(aX + 4, aTop + 9, aW - 8, 40)
  oc.fillStyle = ambr3; oc.fillRect(aX + 8, aTop +13, aW -16, 30)

  // Gold door-pull rings
  oc.fillStyle = gold
  oc.fillRect(aX + 4,      aTop + 16, 2, 2)
  oc.fillRect(aX + aW - 6, aTop + 16, 2, 2)
  oc.fillStyle = darken(gold, 0.22)
  oc.fillRect(aX + 4,      aTop + 17, 2, 1)
  oc.fillRect(aX + aW - 6, aTop + 17, 2, 1)

  // ── Two flanking windows on lower floor ─────────────────────
  // Positioned between outer and inner columns
  for (const [wx, ww] of [[7, 7], [46, 7]]) {
    spriteWindow(oc, wx, 37, ww, 10, wDark)
    oc.fillStyle = shut
    oc.fillRect(wx - 1, 37, 1, 10)
    oc.fillRect(wx + ww, 37, 1, 10)
    oc.fillStyle = darken(shut, 0.25)
    for (let sy = 38; sy < 47; sy += 2) {
      oc.fillRect(wx - 1, sy, 1, 1)
      oc.fillRect(wx + ww, sy, 1, 1)
    }
  }

  // ── STONE PLINTH rows 53–57 (rusticated base) ───────────────
  oc.fillStyle = lighten(sLit, 0.20); oc.fillRect(0, 53, W, 1)
  spriteBrickWall(oc, 0, 54, W, 5, sLit)
  oc.fillStyle = sShd; oc.fillRect(W - 4, 54, 4, 5)

  // ── WIDE STEPS rows 58–63 (3 steps, each 2px tall) ─────────
  // Steps get slightly lighter toward bottom (stone catching light)
  for (let s = 0; s < 3; s++) {
    const sy = 58 + s * 2
    oc.fillStyle = lighten(sMid, 0.12 - s * 0.06)
    oc.fillRect(0, sy, W, 1)
    oc.fillStyle = 'rgba(255,255,255,0.09)'
    oc.fillRect(0, sy, W, 1)
    oc.fillStyle = darken(sMid, 0.12 + s * 0.08)
    oc.fillRect(0, sy + 1, W, 1)
  }

  return off
}

// ── Bakery sprite (Pistrina) — 72×68 logical px → 144×136 screen px ──────
// Asymmetric: tall right production section + shorter left shop-front.
// Historically: Roman pistrina had grain mills, domed fornax oven, display
// counter (trapeza), amphorae, grain sacks, and a chimney for the oven.
function buildBakerySpriteCanvas(_color) {
  const W = 72, H = 68
  const off = document.createElement('canvas')
  off.width = W; off.height = H
  const oc = off.getContext('2d')

  // ── Palette (warm bread/terracotta) ───────────────────────────
  const sLit  = '#eccf98'   // stucco lit — honey ochre, warmer than villa
  const sMid  = '#d8b47c'   // stucco mid
  const sShd  = '#b89058'   // stucco shadow
  const rLit  = '#c84020'   // terracotta lit
  const rShd  = '#803018'   // terracotta shadow
  const ridge = '#f07040'   // roof ridge bright
  const frz   = '#c8a040'   // golden frieze
  const stLit = '#c0b080'   // stone lit
  const stShd = '#907848'   // stone shadow
  const cLit  = '#f0e8d0'   // column lit
  const chim  = '#9a7258'   // chimney brick
  const shut  = '#7a4c18'   // wood shutter
  const wDark = '#16100a'   // window / arch dark
  const sack  = '#c8a850'   // burlap sack
  const sackD = '#8a6830'   // sack dark/tie
  const amph  = '#c85428'   // amphora terracotta
  const amphD = '#883818'   // amphora shadow
  const ctr   = '#b0a070'   // counter stone
  const ctrH  = '#c8b888'   // counter highlight
  const bread = '#c47830'   // baked bread golden-brown
  const rope  = '#8a6030'   // hanging rope

  // ═══════════════════════════════════════════════════════════
  // RIGHT SECTION  x=24–71  (48px wide, full height 0–67)
  // ═══════════════════════════════════════════════════════════

  // Base wall
  spriteBrickWall(oc, 24, 11, 48, 57, sLit)
  // Right-edge depth shadow
  oc.fillStyle = sShd; oc.fillRect(68, 11, 4, 57)
  // Left pilaster (lit)
  oc.fillStyle = lighten(sLit, 0.20); oc.fillRect(24, 11, 4, 57)

  // ── Gabled roof (rows 0–10, peak at x=48) ────────────────
  for (let row = 0; row < 11; row++) {
    const t     = row / 10
    const halfW = Math.round(1 + t * 23)
    const lx    = 48 - halfW
    const lr = Math.round(200-t*54), lg = Math.round(64-t*22), lb = Math.round(32-t*12)
    const sr = Math.round(130-t*38), sg = Math.round(42-t*14), sb = Math.round(22-t*10)
    oc.fillStyle = `rgb(${lr},${lg},${lb})`
    oc.fillRect(lx, row, halfW, 1)
    oc.fillStyle = `rgb(${sr},${sg},${sb})`
    oc.fillRect(48, row, halfW, 1)
    if (row > 0 && row % 2 === 0 && halfW > 1) {
      oc.fillStyle = 'rgba(0,0,0,0.12)'
      oc.fillRect(lx, row, halfW * 2, 1)
    }
  }
  oc.fillStyle = ridge; oc.fillRect(47, 0, 3, 1)
  // Eave + cornice strip
  oc.fillStyle = darken(rLit, 0.22); oc.fillRect(24, 10, 48, 1)
  oc.fillStyle = lighten(stLit, 0.16); oc.fillRect(24, 11, 48, 1)

  // ── Frieze (rows 12–13) ───────────────────────────────────
  oc.fillStyle = frz; oc.fillRect(24, 12, 48, 2)
  oc.fillStyle = lighten(frz, 0.26); oc.fillRect(24, 12, 48, 1)
  oc.fillStyle = darken(frz, 0.26)
  for (let x = 26; x < 70; x += 6) {
    oc.fillRect(x, 12, 3, 2); oc.fillRect(x+3, 13, 2, 1)
  }

  // ── Upper floor (rows 14–26) — 2 windows with shutters ───
  for (const [wx, ww] of [[29,9],[54,9]]) {
    spriteWindow(oc, wx, 16, ww, 10, wDark)
    oc.fillStyle = shut
    oc.fillRect(wx-2, 16, 2, 10); oc.fillRect(wx+ww, 16, 2, 10)
    oc.fillStyle = darken(shut, 0.26)
    for (let sy = 17; sy < 26; sy += 2) {
      oc.fillRect(wx-2, sy, 2, 1); oc.fillRect(wx+ww, sy, 2, 1)
    }
  }

  // ── Belt course (rows 27–28) ──────────────────────────────
  oc.fillStyle = lighten(sMid, 0.10); oc.fillRect(24, 27, 48, 1)
  oc.fillStyle = darken(sMid, 0.14);  oc.fillRect(24, 28, 48, 1)

  // ── Lower floor (rows 29–51) — bread oven arch + window ──
  // Oven arch surround (golden frame)
  oc.fillStyle = lighten(frz, 0.08)
  oc.fillRect(30, 29, 28, 23)
  // Oven arch crown (staircase semicircle, width=24, center=44)
  oc.fillStyle = '#200c04'   // sooty dark
  for (const [sx, sy, sw] of [
    [36, 30, 8], [34, 31, 12], [32, 32, 16],
    [31, 33, 18], [30, 34, 20],
  ]) oc.fillRect(sx, sy, sw, 1)
  // Oven body (sooty interior)
  oc.fillRect(30, 35, 28, 17)
  // Fire glow layers — orange-red furnace heat
  oc.fillStyle = 'rgba(255,120,20,0.52)'; oc.fillRect(30, 35, 28, 17)
  oc.fillStyle = 'rgba(255,170,50,0.60)'; oc.fillRect(33, 38, 22, 12)
  oc.fillStyle = 'rgba(255,215,90,0.55)'; oc.fillRect(36, 41, 16, 8)
  oc.fillStyle = 'rgba(255,248,160,0.38)'; oc.fillRect(39, 44, 10, 4)
  // Keystone
  oc.fillStyle = darken(frz, 0.10); oc.fillRect(43, 28, 4, 3)
  oc.fillStyle = lighten(frz, 0.28); oc.fillRect(44, 28, 2, 1)
  // Small flanking window (right of oven)
  spriteWindow(oc, 61, 33, 7, 9, wDark)
  oc.fillStyle = shut
  oc.fillRect(60, 33, 1, 9); oc.fillRect(68, 33, 1, 9)

  // ── Stone plinth right (rows 52–55) ──────────────────────
  oc.fillStyle = lighten(stLit, 0.18); oc.fillRect(24, 52, 48, 1)
  spriteBrickWall(oc, 24, 53, 48, 5, stLit)
  oc.fillStyle = stShd; oc.fillRect(68, 53, 4, 5)

  // ── Steps right (rows 58–67) ─────────────────────────────
  for (let s = 0; s < 4; s++) {
    const sy = 58 + s * 2
    oc.fillStyle = lighten(stLit, 0.10 - s * 0.04)
    oc.fillRect(24, sy, 48, 1)
    oc.fillStyle = 'rgba(255,255,255,0.09)'; oc.fillRect(24, sy, 48, 1)
    oc.fillStyle = darken(stLit, 0.12 + s * 0.07)
    oc.fillRect(24, sy+1, 48, 1)
  }

  // ═══════════════════════════════════════════════════════════
  // LEFT SECTION  x=0–31  (rows 23–67, shorter)
  // ═══════════════════════════════════════════════════════════

  // Wall fill
  spriteBrickWall(oc, 0, 27, 32, 25, sLit)
  // Right-edge of left section (slightly shadowed where it meets right section)
  oc.fillStyle = darken(sLit, 0.18); oc.fillRect(29, 27, 3, 25)

  // ── Lean-to / shed roof of left section (rows 23–27) ─────
  // Low-pitch slope: right edge high (row 23), left drops 3 rows
  for (let row = 0; row < 5; row++) {
    const xEnd = 32 - row * 4
    const lr = Math.round(198 - row*16), lg = Math.round(62 - row*8), lb = Math.round(31 - row*5)
    oc.fillStyle = `rgb(${lr},${lg},${lb})`
    oc.fillRect(0, 23 + row, Math.max(xEnd, 2), 1)
    if (row > 0 && row % 2 === 0) {
      oc.fillStyle = 'rgba(0,0,0,0.13)'
      oc.fillRect(0, 23 + row, Math.max(xEnd, 2), 1)
    }
  }
  // Eave strip at bottom of lean-to roof
  oc.fillStyle = darken(rLit, 0.20); oc.fillRect(0, 27, 30, 1)

  // ── Open shop-front arch (rows 28–50, x=0-31) ────────────
  // The shop has a large open archway — typical Roman taberna front
  // Arch surround
  oc.fillStyle = lighten(frz, 0.06)
  oc.fillRect(2, 27, 28, 4)   // lintel band above arch
  // Arch opening (large, open to street)
  oc.fillStyle = '#1a100a'
  oc.fillRect(3, 31, 26, 17)
  // Stepped arch crown (width 24, center=16)
  for (const [sx, sy, sw] of [
    [9, 30, 6], [6, 29, 12], [4, 28, 16],
  ]) { oc.fillStyle = '#1a100a'; oc.fillRect(sx, sy, sw, 1) }
  // Warm interior — shopfront light
  oc.fillStyle = 'rgba(255,210,120,0.35)'; oc.fillRect(3, 31, 26, 17)
  oc.fillStyle = 'rgba(255,230,160,0.25)'; oc.fillRect(6, 33, 20, 13)

  // ── Stone display counter (rows 47–51) ───────────────────
  oc.fillStyle = ctrH; oc.fillRect(0, 47, 32, 1)    // top highlight
  oc.fillStyle = ctr;  oc.fillRect(0, 48, 32, 3)    // slab body
  oc.fillStyle = darken(ctr, 0.22); oc.fillRect(0, 51, 32, 1)  // under-lip shadow
  // Counter face (front of slab)
  spriteBrickWall(oc, 0, 48, 32, 4, ctr)

  // ── Grain sacks (leaning left wall, rows 33–47) ──────────
  // Sack 1 (large, x=2-12)
  oc.fillStyle = sack
  oc.fillRect(2, 38, 10, 9)   // body
  oc.fillRect(3, 36, 8, 3)    // neck taper
  oc.fillRect(4, 34, 6, 2)    // top bulge
  oc.fillStyle = lighten(sack, 0.14)
  oc.fillRect(2, 38, 4, 9)    // lit left face
  oc.fillStyle = darken(sack, 0.18)
  oc.fillRect(9, 38, 3, 9)    // shadow right
  // Tie cord
  oc.fillStyle = sackD
  oc.fillRect(3, 37, 8, 1)
  // Sack 2 (smaller, x=1-9, rows 38-47, slightly in front)
  oc.fillStyle = lighten(sack, 0.08)
  oc.fillRect(13, 40, 8, 7)
  oc.fillRect(14, 38, 6, 3)
  oc.fillRect(15, 37, 4, 2)
  oc.fillStyle = sackD; oc.fillRect(14, 39, 6, 1)
  oc.fillStyle = darken(sack, 0.16); oc.fillRect(18, 40, 3, 7)

  // ── Amphora (terracotta jar, x=20-27, rows 39–47) ────────
  oc.fillStyle = amph
  oc.fillRect(20, 42, 8, 5)   // body
  oc.fillRect(21, 40, 6, 3)   // neck
  oc.fillRect(22, 39, 4, 2)   // mouth rim
  oc.fillRect(23, 47, 2, 1)   // pointed base tip
  oc.fillStyle = lighten(amph, 0.16); oc.fillRect(20, 42, 3, 5)  // lit
  oc.fillStyle = amphD; oc.fillRect(25, 42, 3, 5)               // shadow
  // Handle suggestion
  oc.fillStyle = darken(amph, 0.10)
  oc.fillRect(19, 42, 1, 3); oc.fillRect(28, 42, 1, 3)

  // ── Hanging bread loaves above counter (rows 35–45) ──────
  // 3 oval bread loaves hanging on rope
  oc.fillStyle = rope
  oc.fillRect(3, 33, 1, 14)    // left rope
  oc.fillRect(11, 33, 1, 12)   // mid rope
  oc.fillRect(19, 33, 1, 11)   // right rope
  for (const [bx, by] of [[1,38],[9,37],[17,36]]) {
    oc.fillStyle = darken(bread, 0.14); oc.fillRect(bx, by+1, 5, 5)  // shadow
    oc.fillStyle = bread; oc.fillRect(bx, by, 5, 5)
    oc.fillStyle = lighten(bread, 0.22); oc.fillRect(bx, by, 3, 2)   // crust glint
    oc.fillStyle = darken(bread, 0.24); oc.fillRect(bx+1, by+4, 3, 1) // score line
  }

  // ── Stone plinth left (rows 52–55) ───────────────────────
  oc.fillStyle = lighten(stLit, 0.18); oc.fillRect(0, 52, 32, 1)
  spriteBrickWall(oc, 0, 53, 32, 5, stLit)

  // ── Steps left (rows 58–67) ──────────────────────────────
  for (let s = 0; s < 4; s++) {
    const sy = 58 + s * 2
    oc.fillStyle = lighten(stLit, 0.10 - s * 0.04)
    oc.fillRect(0, sy, 32, 1)
    oc.fillStyle = darken(stLit, 0.12 + s * 0.07)
    oc.fillRect(0, sy+1, 32, 1)
  }

  // ═══════════════════════════════════════════════════════════
  // CHIMNEY  x=60–66  (protrudes above roof)
  // ═══════════════════════════════════════════════════════════
  // Chimney body (brick-coloured, rising above roof line)
  oc.fillStyle = lighten(chim, 0.12); oc.fillRect(59, 0, 9, 1)  // cap flange
  oc.fillStyle = chim
  oc.fillRect(60, 1, 7, 9)   // shaft above roof
  // Brick texture on chimney
  oc.fillStyle = darken(chim, 0.18)
  for (let y = 1; y < 10; y += 3) {
    const off = y % 6 === 0 ? 0 : 3
    oc.fillRect(60 + off, y + 2, 3, 1)
  }
  oc.fillStyle = 'rgba(0,0,0,0.22)'; oc.fillRect(67, 1, 1, 9)  // right shadow
  oc.fillStyle = lighten(chim, 0.20); oc.fillRect(60, 1, 1, 9)  // left highlight

  // ── Junction seam (where sections meet x≈28-29) ──────────
  // Vertical shadow line where left section roof meets right wall
  oc.fillStyle = 'rgba(0,0,0,0.30)'
  oc.fillRect(28, 23, 1, 5)   // shadow under lean-to edge

  return off
}

// Bakery chimney smoke — drawn in world space inside world transform
function drawSmoke2D(ctx, cx, topY, time) {
  for (let i = 0; i < 5; i++) {
    const age     = i / 4            // 0 = fresh near chimney, 1 = old high up
    const yOff    = age * 28         // rises upward
    const xWaver  = Math.sin(time * 0.9 + i * 1.4) * (2 + age * 5)
    const opacity = (1 - age) * 0.45
    const radius  = 3 + age * 7
    const sx = cx + xWaver
    const sy = topY - yOff
    const g  = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius)
    g.addColorStop(0, `rgba(210,200,190,${opacity.toFixed(2)})`)
    g.addColorStop(1, `rgba(180,170,160,0)`)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.fill()
  }
}

// Cobblestone path between two buildings at ground level
function drawCobblePath(ctx, x1, x2, groundY) {
  if (x2 <= x1 + 4) return
  const pH = 12
  // Base stone colour
  ctx.fillStyle = '#6a6458'
  ctx.fillRect(x1, groundY - pH, x2 - x1, pH)
  // Cobblestone blocks (2 rows, alternating offset)
  const SW = 10, SH = 6
  for (let row = 0; row < 2; row++) {
    const offset = row % 2 === 0 ? 0 : SW * 0.5
    for (let sx = x1 - offset; sx < x2; sx += SW) {
      const clampX = Math.max(sx, x1)
      const clampW = Math.min(sx + SW - 1, x2) - clampX
      if (clampW <= 0) continue
      const by = groundY - pH + row * SH
      const n  = tileNoise(sx * 0.09, by * 0.13)
      ctx.fillStyle = n > 0.55 ? '#7a7468' : (n < 0.28 ? '#585248' : '#686058')
      ctx.fillRect(clampX, by, clampW, SH - 1)
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(clampX, by, clampW, 1)
      // Right mortar
      ctx.fillStyle = 'rgba(0,0,0,0.20)'; ctx.fillRect(clampX + clampW, by, 1, SH - 1)
    }
  }
  // Top edge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(x1, groundY - pH, x2 - x1, 1)
}

// ── Pixel sprite cache ────────────────────────────────────────
const pixelSpriteCache = {}
function getPixelSprite(id, color) {
  const key = `${id}-${color}`
  if (!pixelSpriteCache[key]) pixelSpriteCache[key] = buildPixelSprite(id, color)
  return pixelSpriteCache[key]
}
function buildPixelSprite(id, color) {
  if (id === 'insula') return buildInsulaSpriteCanvas(color)
  if (id === 'bakery')  return buildBakerySpriteCanvas(color)
  return null
}

// ── Flora ─────────────────────────────────────────────────────
function drawTree2D(ctx, tx, groundY, height, seed) {
  const trunkH = Math.round(height * 0.42)
  const trunkW = 4 + Math.floor(seed * 3)
  const lumpR  = Math.round(13 + seed * 10)
  const topX   = tx, topY = groundY - trunkH

  ctx.fillStyle = '#5a3a18'
  ctx.fillRect(tx - trunkW / 2, groundY - trunkH, trunkW, trunkH)
  ctx.fillStyle = '#7a5428'
  ctx.fillRect(tx - trunkW / 2, groundY - trunkH, 2, trunkH)
  ctx.fillStyle = '#3a2408'
  ctx.fillRect(tx + trunkW / 2 - 2, groundY - trunkH, 2, trunkH)

  // Terraria bulbous foliage — 5 overlapping blobs
  const lumps = [
    { ox:  0,             oy: -lumpR * 0.80, rx: lumpR * 0.88, ry: lumpR * 0.80, c: '#286018' },
    { ox: -lumpR * 0.58,  oy: -lumpR * 0.38, rx: lumpR * 0.74, ry: lumpR * 0.70, c: '#358024' },
    { ox:  lumpR * 0.52,  oy: -lumpR * 0.30, rx: lumpR * 0.70, ry: lumpR * 0.64, c: '#2e7020' },
    { ox: -lumpR * 0.22,  oy: -lumpR * 1.22, rx: lumpR * 0.64, ry: lumpR * 0.58, c: '#408828' },
    { ox:  lumpR * 0.18,  oy: -lumpR * 0.06, rx: lumpR * 0.82, ry: lumpR * 0.52, c: '#286018' },
  ]
  for (const { ox, oy, rx, ry, c } of lumps) {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.ellipse(topX + ox, topY + oy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(110,210,60,0.30)'
  ctx.beginPath()
  ctx.ellipse(topX - lumpR * 0.28, topY - lumpR * 1.0, lumpR * 0.38, lumpR * 0.30, -0.4, 0, Math.PI * 2)
  ctx.fill()
}

// Dense forest bush — small 2px blocks, organic silhouette, deep-shadow interior
function drawShrub2D(ctx, x, groundY, seed) {
  const BS    = 2   // 2 world-px blocks = 2 screen px each (fine, detailed)
  const nCols = 44 + Math.floor(seed * 18)
  const baseH = 12 + Math.floor(seed * 6)

  // Organic height profile: dome envelope + layered bumps + per-column noise
  const heights = []
  for (let c = 0; c < nCols; c++) {
    const cx = c / (nCols - 1)
    const dome  = baseH * Math.pow(Math.max(0, 1 - (2 * cx - 1) ** 2), 0.52)
    const bumps =
      Math.sin(cx * Math.PI * 5  + seed * 3.1) * 2.2 +
      Math.sin(cx * Math.PI * 11 + seed * 7.3) * 1.4 +
      Math.sin(cx * Math.PI * 23 + seed * 13.1) * 0.8 +
      Math.sin(cx * Math.PI * 41 + seed * 19.7) * 0.4
    const noise = (tileNoise(c * 1.9 + seed * 23, c * 3.3 + seed * 8) - 0.5) * 2.4
    heights.push(Math.max(2, Math.round(dome + bumps + noise + 1)))
  }

  const maxH   = Math.max(...heights)
  const startX = Math.round(x - nCols * BS / 2)

  // 10-colour ramp: index 0 = deep shadow, 9 = sunlit tip
  const palette = [
    '#0e2406', '#182e0a', '#1e3c10', '#28500e',
    '#346418', '#3e7c1e', '#4a9224', '#56a82c', '#64bc32', '#74d03a',
  ]

  for (let c = 0; c < nCols; c++) {
    const h  = heights[c]
    const bx = startX + c * BS
    // How far from the side edge: 0 = outermost column, 1+ = well inside
    const edgeFrac = Math.min(c, nCols - 1 - c) / (nCols * 0.10)

    for (let row = 0; row < h; row++) {
      const by      = groundY - (row + 1) * BS
      const fromTop = h - 1 - row   // 0 = top row
      const n  = tileNoise(c * 2.7 + row * 5.3 + seed * 43, row * 4.1 + c * 1.9)
      const n2 = tileNoise(c * 6.1 + seed * 11, row * 8.7 + c * 2.3)

      let idx
      if (fromTop === 0) {
        // Leaf tips: scattered bright/highlight
        idx = n > 0.60 ? 9 : n > 0.28 ? 8 : 7
      } else if (fromTop === 1) {
        idx = n > 0.55 ? 8 : n > 0.25 ? 7 : 6
      } else if (fromTop === 2) {
        idx = n2 > 0.65 ? 7 : 6
      } else if (fromTop <= 4) {
        // Upper foliage — scattered light patches
        idx = n > 0.70 ? 6 : n > 0.40 ? 5 : 4
      } else {
        // Interior depth: darker the further from the surface
        const depthFrac = fromTop / maxH
        idx = Math.round((1 - depthFrac) * 4 + n * 1.5 - 0.5)
        // Woody stem colour at very base
        if (row === 0) idx = 0
      }

      // Side edges always darker (dense shadow at the margins)
      if (edgeFrac < 0.6) idx = Math.min(idx, 2)

      ctx.fillStyle = palette[Math.max(0, Math.min(9, idx))]
      ctx.fillRect(bx, by, BS, BS)
    }
  }
}

function drawFlora(ctx, buildings, streetOffsetX, groundY) {
  const occupied = new Set()
  for (const b of buildings) {
    for (let c = b.col; c < b.col + b.w; c++) occupied.add(c)
  }
  for (let c = 0; c < CITY_COLS; c++) {
    if (occupied.has(c)) continue
    const x    = streetOffsetX + c * TILE_W
    const seed = tileNoise(c * 7.3, 42.1)
    const jx   = (tileNoise(c, 13.7) - 0.5) * TILE_W * 0.45
    if (seed < 0.22) {
      drawTree2D(ctx, x + TILE_W * 0.5 + jx, groundY, 46 + seed * 32, seed)
    } else if (seed < 0.52) {
      drawShrub2D(ctx, x + TILE_W * 0.5 + jx, groundY, seed)
    }
    if (seed > 0.55) {
      const gc = 3 + Math.floor(seed * 5)
      for (let i = 0; i < gc; i++) {
        const gx = x + tileNoise(c * 3.1 + i, i * 2.7) * TILE_W
        const gs = tileNoise(c * 7 + i, i * 4.1)
        ctx.fillStyle = gs > 0.5 ? '#70c040' : '#50a028'
        const bh = 5 + Math.floor(gs * 7)
        ctx.fillRect(gx, groundY - bh, 1, bh)
        ctx.fillRect(gx + 2, groundY - bh + 2, 1, bh - 2)
      }
    }
  }
}

// ── Building draw ─────────────────────────────────────────────
function drawWorldBricks(ctx, x, y, w, h, baseColor) {
  const BH = 8, BW = 18
  for (let row = 0; row < Math.ceil(h / BH); row++) {
    const by     = y + row * BH
    const offset = row % 2 === 0 ? 0 : BW * 0.5
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(x, by + BH - 1, w, 1)
    for (let bx = x - offset; bx < x + w; bx += BW) {
      const clampX = Math.max(bx, x)
      const clampW = Math.min(bx + BW - 1, x + w) - clampX
      if (clampW <= 0) continue
      const n = tileNoise(bx * 0.05, by * 0.09)
      if (n > 0.64) {
        ctx.fillStyle = lighten(baseColor, 0.08)
        ctx.fillRect(clampX, by, clampW, BH - 1)
      } else if (n < 0.24) {
        ctx.fillStyle = darken(baseColor, 0.10)
        ctx.fillRect(clampX, by, clampW, BH - 1)
      }
      ctx.fillStyle = 'rgba(0,0,0,0.14)'
      if (bx + BW - 1 > x && bx + BW - 1 < x + w) {
        ctx.fillRect(bx + BW - 1, by, 1, BH - 1)
      }
    }
  }
}

function drawRoof2D(ctx, x, y, bw, floors, color) {
  const isGabled = floors >= 2
  if (isGabled) {
    const roofH = Math.min(bw * 0.30, 40)
    // Shadow right face
    ctx.fillStyle = '#7a2c14'
    ctx.beginPath()
    ctx.moveTo(x + bw / 2, y - roofH)
    ctx.lineTo(x + bw + 5, y + 3)
    ctx.lineTo(x + bw + 5, y)
    ctx.closePath()
    ctx.fill()
    // Lit left face
    ctx.fillStyle = '#b84828'
    ctx.beginPath()
    ctx.moveTo(x - 5, y)
    ctx.lineTo(x + bw / 2, y - roofH)
    ctx.lineTo(x + bw + 5, y)
    ctx.closePath()
    ctx.fill()
    // Tile course lines
    for (let t = 0.2; t < 1; t += 0.2) {
      const ty = y - roofH + roofH * t
      const hw = (bw / 2 + 5) * (1 - t * 0.8)
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      ctx.fillRect(x + bw / 2 - hw, ty, hw * 2, 1)
    }
    // Ridge
    ctx.fillStyle = '#d05030'
    ctx.fillRect(x + bw / 2 - 4, y - roofH - 3, 8, 4)
  } else {
    ctx.fillStyle = darken(color, 0.10)
    ctx.fillRect(x, y - 8, bw, 8)
    ctx.fillStyle = lighten(color, 0.14)
    ctx.fillRect(x, y - 8, bw, 2)
    // Crenellations
    for (let i = 0; i < Math.floor(bw / 16); i++) {
      ctx.fillStyle = lighten(color, 0.08)
      ctx.fillRect(x + i * 16 + 2, y - 14, 8, 6)
    }
  }
}

function drawWindows2D(ctx, x, y, bw, bh, floors) {
  const winW = 10, winH = 14
  const cols = Math.max(1, Math.floor((bw - 24) / 28))
  for (let f = 0; f < Math.min(floors, 4); f++) {
    const wy = y + bh - BLDG_BASE - (f + 0.60) * FLOOR_H - winH / 2
    for (let c = 0; c < cols; c++) {
      if (f === 0 && c === Math.floor(cols / 2)) continue
      const wx = x + 12 + (cols === 1 ? (bw - 24) * 0.5 : c * (bw - 24) / (cols - 1)) - winW / 2
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.fillRect(wx - 2, wy - 3, winW + 4, winH + 4)
      ctx.fillStyle = '#160a04'
      ctx.fillRect(wx, wy, winW, winH)
      ctx.beginPath()
      ctx.arc(wx + winW / 2, wy, winW / 2, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,200,80,0.18)'
      ctx.fillRect(wx, wy, winW, winH)
      ctx.fillStyle = 'rgba(170,120,50,0.45)'
      ctx.fillRect(wx + winW / 2, wy, 1, winH)
      ctx.fillRect(wx, wy + winH / 2, winW, 1)
    }
  }
}

function drawDoor2D(ctx, x, y, bw, bh, color) {
  const dw = Math.max(14, Math.min(24, bw * 0.2))
  const dh = FLOOR_H + 12
  const dx = x + bw / 2 - dw / 2
  const dy = y + bh - dh
  ctx.fillStyle = lighten(color, 0.18)
  ctx.fillRect(dx - 4, dy - 4, dw + 8, dh + 4)
  ctx.fillStyle = '#160a04'
  ctx.fillRect(dx, dy, dw, dh)
  ctx.beginPath()
  ctx.arc(dx + dw / 2, dy, dw / 2, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = 'rgba(80,48,16,0.50)'
  ctx.fillRect(dx + 2, dy + 3, dw / 2 - 3, dh * 0.42)
  ctx.fillRect(dx + dw / 2 + 1, dy + 3, dw / 2 - 3, dh * 0.42)
  ctx.fillStyle = '#d4a820'
  ctx.beginPath()
  ctx.arc(dx + dw * 0.65, dy + dh * 0.40, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawTemple2D(ctx, x, y, bw, bh, color) {
  const colCount = Math.max(4, Math.floor(bw / 22))
  const pedH     = Math.min(36, bw * 0.26)
  const entH     = 14
  const colH     = bh - pedH - entH - 14
  ctx.fillStyle = lighten(color, 0.20)
  ctx.beginPath()
  ctx.moveTo(x - 6, y + pedH)
  ctx.lineTo(x + bw / 2, y + 3)
  ctx.lineTo(x + bw + 6, y + pedH)
  ctx.closePath()
  ctx.fill()
  drawWorldBricks(ctx, x - 6, y, bw + 12, pedH, lighten(color, 0.20))
  ctx.fillStyle = darken(color, 0.15)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = darken(color, 0.20)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillRect(x - 5, y + pedH, bw + 10, entH)
  drawWorldBricks(ctx, x - 5, y + pedH, bw + 10, entH, color)
  for (let i = 0; i < colCount; i++) {
    const cx = x + 8 + (i / (colCount - 1)) * (bw - 16)
    ctx.fillStyle = lighten(color, 0.24)
    ctx.fillRect(cx - 5, y + pedH + entH, 10, colH)
    ctx.fillStyle = 'rgba(0,0,0,0.10)'
    ctx.fillRect(cx + 3, y + pedH + entH, 2, colH)
    ctx.fillStyle = lighten(color, 0.34)
    ctx.fillRect(cx - 7, y + pedH + entH, 14, 6)
    ctx.fillRect(cx - 7, y + bh - 12, 14, 8)
  }
  for (let s = 0; s < 3; s++) {
    ctx.fillStyle = lighten(color, 0.08 - s * 0.04)
    ctx.fillRect(x - 5 - s * 4, y + bh - s * 4 - 5, bw + 10 + s * 8, 5)
  }
  const dw = 18, dh = colH * 0.55
  ctx.fillStyle = '#160a04'
  ctx.fillRect(x + bw / 2 - dw / 2, y + bh - dh - 12, dw, dh)
  ctx.beginPath()
  ctx.arc(x + bw / 2, y + bh - dh - 12, dw / 2, Math.PI, 0)
  ctx.fill()
}

function drawArch2D(ctx, x, y, bw, bh, color) {
  const pw   = Math.max(10, bw * 0.2)
  const archH = bh * 0.58
  const aw    = bw - pw * 2
  ctx.fillStyle = color
  ctx.fillRect(x, y, pw, bh)
  ctx.fillRect(x + bw - pw, y, pw, bh)
  drawWorldBricks(ctx, x, y, pw, bh, color)
  drawWorldBricks(ctx, x + bw - pw, y, pw, bh, color)
  ctx.fillStyle = darken(color, 0.10)
  ctx.fillRect(x + pw, y + archH, aw, bh - archH)
  ctx.fillStyle = '#160a04'
  ctx.beginPath()
  ctx.arc(x + bw / 2, y + archH, aw / 2, Math.PI, 0)
  ctx.rect(x + pw + 2, y + archH, aw - 4, bh - archH - 2)
  ctx.fill()
  ctx.fillStyle = lighten(color, 0.26)
  ctx.beginPath()
  ctx.moveTo(x + bw / 2 - 6, y + archH - aw / 2 - 4)
  ctx.lineTo(x + bw / 2 + 6, y + archH - aw / 2 - 4)
  ctx.lineTo(x + bw / 2 + 4, y + archH - aw / 2 + 10)
  ctx.lineTo(x + bw / 2 - 4, y + archH - aw / 2 + 10)
  ctx.closePath()
  ctx.fill()
}

function drawGarden2D(ctx, x, groundY, bw, color) {
  ctx.fillStyle = '#c8b478'
  ctx.fillRect(x, groundY - 22, bw, 22)
  drawWorldBricks(ctx, x, groundY - 22, bw, 22, '#c8b478')
  for (let i = 0; i < Math.floor(bw / 20); i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d4c080' : '#c0ac68'
    ctx.fillRect(x + i * 20, groundY - 26, 18, 4)
  }
  const treeCount = Math.max(1, Math.floor(bw / 50))
  for (let i = 0; i < treeCount; i++) {
    const tx   = x + (i + 0.5) * (bw / treeCount)
    const seed = tileNoise(tx * 0.1, i * 3.7)
    drawTree2D(ctx, tx, groundY - 22, 38 + seed * 22, seed)
  }
}

function drawFountain2D(ctx, x, groundY, bw) {
  const cx     = x + bw / 2
  const basinR = bw * 0.34
  ctx.fillStyle = '#c8b080'
  ctx.beginPath()
  ctx.ellipse(cx, groundY - 8, basinR, basinR * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(70,160,220,0.72)'
  ctx.beginPath()
  ctx.ellipse(cx, groundY - 8, basinR * 0.82, basinR * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#d4b870'
  ctx.fillRect(cx - 5, groundY - bw * 0.55, 10, bw * 0.47)
  const time = Date.now() / 1000
  ctx.strokeStyle = 'rgba(120,200,240,0.60)'
  ctx.lineWidth = 1.8
  for (let a = 0; a < 5; a++) {
    const angle = (a / 5) * Math.PI * 2 + time * 0.4
    ctx.beginPath()
    ctx.moveTo(cx, groundY - bw * 0.55)
    ctx.quadraticCurveTo(cx + Math.cos(angle) * 18, groundY - bw * 0.55 - 22, cx + Math.cos(angle) * 26, groundY - 14)
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
      ctx.rect(ax - aw / 2, ay, aw, ah - aw / 2)
      ctx.arc(ax, ay, aw / 2, Math.PI, 0)
      ctx.fill()
    }
  }
}

function drawFire2D(ctx, cx, topY, bw, time) {
  for (let i = 0; i < 5; i++) {
    const phase   = time * 3.5 + i * (Math.PI * 2 / 5)
    const flicker = Math.sin(phase) * 0.4 + 0.6
    const ox      = Math.sin(time * 2 + i * 1.1) * bw * 0.22
    const h       = (18 + Math.sin(phase * 1.3) * 8) * flicker
    const grad    = ctx.createRadialGradient(cx + ox, topY, 1, cx + ox, topY - h * 0.5, h)
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
    const r     = 10 + Math.random() * 8
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

  if (id === 'garden')   { drawGarden2D(ctx, x, groundY, bw, color); return }
  if (id === 'fountain') { drawFountain2D(ctx, x, groundY, bw); return }
  if (id === 'arch' || id === 'aqueduct') {
    drawArch2D(ctx, x, groundY - bh, bw, bh, color); return
  }
  if (id === 'temple_small' || id === 'temple_jupiter' || id === 'pantheon') {
    drawTemple2D(ctx, x, groundY - bh, bw, bh, color); return
  }

  const pixelSprite = getPixelSprite(id, color)
  if (pixelSprite) {
    const sw  = pixelSprite.width  * PIXEL
    const sh  = pixelSprite.height * PIXEL
    const ox  = Math.round((sw - bw) / 2)   // centre wider sprite on the tile
    ctx.drawImage(pixelSprite, x - ox, groundY - sh, sw, sh)
    // Bakery chimney smoke: chimney at logical (63, 1) → world offset (+94, -sh+2)
    if (id === 'bakery') {
      drawSmoke2D(ctx, x - ox + 63 * PIXEL, groundY - sh + 2 * PIXEL, time)
    }
    if (isNew)  drawSparkle2D(ctx, x + bw / 2, groundY - sh)
    if (onFire) drawFire2D(ctx, x + bw / 2, groundY - sh, sw, time)
    return
  }

  const y = groundY - bh
  ctx.fillStyle = color
  ctx.fillRect(x, y, bw, bh)
  drawWorldBricks(ctx, x, y, bw, bh, color)

  ctx.fillStyle = darken(color, 0.30)
  ctx.fillRect(x + bw, y + 5, 6, bh - 5)

  if (id === 'colosseum' || id === 'amphitheater') {
    drawColosseum2D(ctx, x, y, bw, bh, color)
  }

  ctx.fillStyle = lighten(color, 0.16)
  ctx.fillRect(x, y, bw, 10)

  drawWindows2D(ctx, x, y, bw, bh, floors || 1)
  drawDoor2D(ctx, x, y, bw, bh, color)
  drawRoof2D(ctx, x, y, bw, floors || 1, color)

  if (isLandmark) {
    ctx.save()
    const grad = ctx.createRadialGradient(x + bw / 2, y + bh / 2, 10, x + bw / 2, y + bh / 2, bw * 0.9)
    grad.addColorStop(0, 'rgba(255,210,80,0.22)')
    grad.addColorStop(1, 'rgba(255,180,40,0)')
    ctx.fillStyle = grad
    ctx.fillRect(x - bw * 0.4, y - 30, bw * 1.8, bh + 50)
    ctx.restore()
  }

  if (isNew)  drawSparkle2D(ctx, x + bw / 2, y)
  if (onFire) drawFire2D(ctx, x + bw / 2, y, bw, time)
}

// ── Building rise animation ───────────────────────────────────
const seenBuildings    = new Set()
const buildingAnimStart = new Map()
const RISE_DURATION    = 1.1   // seconds

// ── Citizen system ────────────────────────────────────────────
const CITIZEN_COUNT = 6
const citizenList   = []
let   citizenLastTime = null

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
      dir: 1, tunic: tunics[i % tunics.length], seed,
      trip: 0, waitFor: 0, state: 'wander',
      home: null, alpha: 1, insideTimer: 0,
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
    const dx   = c.tx - c.x
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
      c.x  += c.dir * Math.min(c.speed * dt, dist)
      c.walkPhase += dt * 9
      if (c.state === 'goHome') c.alpha = Math.min(1, dist * 2.5)
    }
  }
}

// High-res pixel-art citizen — P=2 blocks, drawn on main canvas
function drawCitizenPixelArt(ctx, c, streetOffsetX, groundY) {
  if (c.state === 'inside') return
  const P      = 2
  const cx     = streetOffsetX + c.x * TILE_W
  const moving = Math.abs(c.tx - c.x) > 0.08 && c.waitFor <= 0 && c.state !== 'emerge'
  const swing  = moving ? Math.sin(c.walkPhase) * P : 0
  const bob    = moving ? Math.abs(Math.sin(c.walkPhase)) * P * 0.5 : 0

  ctx.save()
  ctx.globalAlpha = c.alpha
  ctx.translate(cx, groundY - bob)
  if (c.dir < 0) ctx.scale(-1, 1)

  // Shadow
  ctx.save()
  ctx.globalAlpha = c.alpha * 0.18
  ctx.fillStyle = '#1a0e04'
  ctx.beginPath(); ctx.ellipse(0, bob + P, P * 4, P, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Sandals
  ctx.fillStyle = '#5a3818'
  ctx.fillRect(-P * 3 + swing, -P,       P * 2, P)
  ctx.fillRect( P     - swing, -P,       P * 2, P)

  // Legs
  ctx.fillStyle = '#c8906a'
  ctx.fillRect(-P * 2 + swing, -P * 5,  P, P * 4)
  ctx.fillRect( P     - swing, -P * 5,  P, P * 4)

  // Belt
  ctx.fillStyle = darken(c.tunic, 0.40)
  ctx.fillRect(-P * 2, -P * 5, P * 4, P)

  // Tunic body
  ctx.fillStyle = c.tunic
  ctx.fillRect(-P * 2, -P * 10, P * 4, P * 5)
  ctx.fillStyle = lighten(c.tunic, 0.22)
  ctx.fillRect(-P * 2, -P * 10, P * 4, P)

  // Tunic shadow (right side)
  ctx.fillStyle = darken(c.tunic, 0.18)
  ctx.fillRect( P, -P * 10, P, P * 5)

  // Arms
  ctx.fillStyle = '#c8906a'
  ctx.fillRect(-P * 3, -P * 9 + swing * 0.5, P, P * 3)
  ctx.fillRect( P * 2, -P * 9 - swing * 0.5, P, P * 3)

  // Neck
  ctx.fillStyle = '#c8906a'
  ctx.fillRect(-P / 2, -P * 11, P, P)

  // Head
  ctx.fillStyle = '#c8906a'
  ctx.fillRect(-P, -P * 13, P * 3, P * 2)
  // Hair
  ctx.fillStyle = '#3a2010'
  ctx.fillRect(-P, -P * 13, P * 3, P)
  // Eyes
  ctx.fillStyle = '#1a0c04'
  ctx.fillRect(P,      -P * 12 + 1, 1, 1)  // right eye (flipped → left visible)

  ctx.restore()
}

// ── Main render ───────────────────────────────────────────────
export function renderCity(canvas, buildings, newBuildingId = null, pan = { x: 0, y: 0 }, zoom = 1, fires = []) {
  const ctx = canvas.getContext('2d')
  const W   = canvas.width
  const H   = canvas.height
  const off = getOffscreen(W, H)
  const oc  = off.getContext('2d')
  const LW  = off.width
  const LH  = off.height
  const time = Date.now() / 1000

  oc.clearRect(0, 0, LW, LH)
  oc.imageSmoothingEnabled = false

  // 1 — Sky + stars + sun (LR canvas space, no world transform)
  drawSky(oc, LW, LH)
  drawStars(oc, LW, LH)
  drawPixelSun(oc, LW, LH)

  // 2 — Clouds (LR canvas space, slow parallax)
  drawClouds(oc, LW, LH, pan.x, time)

  // 3 — Parallax hills (LR canvas space, before world transform)
  drawHillsLR(oc, LW, LH, pan.x, pan.y)

  // 4 — World transform
  oc.save()
  oc.scale(1 / PIXEL, 1 / PIXEL)
  oc.translate(pan.x, pan.y)
  oc.scale(zoom, zoom)

  const groundY       = H / zoom * 0.72
  const streetOffsetX = W / (2 * zoom) - (CITY_COLS * TILE_W) / 2

  // 5 — Ground, flora, buildings
  drawGround(oc, W / zoom, H / zoom, groundY)
  drawFlora(oc, buildings, streetOffsetX, groundY)

  const sorted = [...buildings].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)
  for (const b of sorted) {
    const bkey    = `${b.id}_${b.col}`
    const isOnFire = fires.some(f => f.col === b.col && f.row === b.row)

    // Register first appearance
    if (!seenBuildings.has(bkey)) {
      seenBuildings.add(bkey)
      buildingAnimStart.set(bkey, time)
    }

    const elapsed = time - (buildingAnimStart.get(bkey) ?? time)
    const rising  = elapsed < RISE_DURATION

    if (rising) {
      const t     = elapsed / RISE_DURATION
      const ease  = 1 - (1 - t) ** 3           // cubic ease-out
      const bh    = BLDG_BASE + (b.floors || 1) * FLOOR_H
      const animY = Math.round(bh * (1 - ease)) // starts below ground, falls to 0
      oc.save()
      // Clip so building doesn't peek below the ground line while rising
      oc.beginPath()
      oc.rect(-1e5, -1e5, 2e5, 1e5 + groundY)
      oc.clip()
      oc.translate(0, animY)
      drawBuilding2D(oc, b, streetOffsetX, groundY, b.id === newBuildingId, isOnFire, time)
      oc.restore()
    } else {
      drawBuilding2D(oc, b, streetOffsetX, groundY, b.id === newBuildingId, isOnFire, time)
    }
  }

  // Cobblestone path connecting insula to bakery when both exist
  const insulaB  = buildings.find(b => b.id === 'insula')
  const bakeryB  = buildings.find(b => b.id === 'bakery')
  if (insulaB && bakeryB) {
    const iSprite = getPixelSprite('insula', insulaB.color)
    const bSprite = getPixelSprite('bakery', bakeryB.color)
    const iSW  = iSprite ? iSprite.width * PIXEL : insulaB.w * TILE_W
    const bSW  = bSprite ? bSprite.width * PIXEL : bakeryB.w * TILE_W
    const iX   = streetOffsetX + insulaB.col * TILE_W
    const bX   = streetOffsetX + bakeryB.col * TILE_W
    const iOX  = Math.round((iSW - insulaB.w * TILE_W) / 2)
    const bOX  = Math.round((bSW - bakeryB.w * TILE_W) / 2)
    const pathX1 = iX - iOX + iSW   // right edge of villa sprite
    const pathX2 = bX - bOX         // left edge of bakery sprite
    if (pathX2 > pathX1) drawCobblePath(oc, pathX1 - 4, pathX2 + 4, groundY)
  }

  initCitizens()
  updateCitizens(time, buildings)

  oc.restore()

  // 6 — Upscale to main canvas (no smoothing = crisp pixels)
  ctx.clearRect(0, 0, W, H)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(off, 0, 0, W, H)

  // 7 — Citizens at full resolution (main canvas, bypasses PIXEL pipeline)
  ctx.save()
  ctx.translate(pan.x, pan.y)
  ctx.scale(zoom, zoom)
  for (const c of citizenList) drawCitizenPixelArt(ctx, c, streetOffsetX, groundY)
  ctx.restore()

  // 8 — Empty city hint
  if (buildings.length === 0) {
    ctx.fillStyle = 'rgba(80,60,30,0.55)'
    ctx.font = 'italic 13px serif'
    ctx.textAlign = 'center'
    ctx.fillText('Complete a session to begin building Rome...', W / 2, H * 0.72 - 40)
  }
}
