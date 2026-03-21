// City layout engine — procedural placement with overlap prevention

export const GRID_SIZE = 64 // isometric tile size
export const CITY_COLS = 20
export const CITY_ROWS = 20

// Building type definitions
export const BUILDING_TYPES = [
  { id: 'insula',       label: 'Insula',          w: 1, h: 1, floors: 2, color: '#c8a87a' },
  { id: 'bakery', label: 'Pistrina', w: 1, h: 1, floors: 2, color: '#c89060' },
  { id: 'domus',        label: 'Domus',            w: 2, h: 1, floors: 2, color: '#d4956a' },
  { id: 'taberna',      label: 'Taberna',          w: 1, h: 1, floors: 1, color: '#b8926a' },
  { id: 'thermopolium', label: 'Thermopolium',     w: 1, h: 2, floors: 1, color: '#c09060' },
  { id: 'baths',        label: 'Baths',            w: 2, h: 2, floors: 2, color: '#b88060' },
  { id: 'basilica',     label: 'Basilica',         w: 3, h: 2, floors: 3, color: '#c8a468' },
  { id: 'market',       label: 'Macellum',         w: 2, h: 2, floors: 2, color: '#d49870' },
  { id: 'garden',       label: 'Horti',            w: 2, h: 2, floors: 0, color: '#7a9a60' },
  { id: 'arch',         label: 'Triumphal Arch',   w: 1, h: 1, floors: 2, color: '#d4b468' },
  { id: 'fountain',     label: 'Fountain',         w: 1, h: 1, floors: 1, color: '#88aabb' },
  { id: 'villa',        label: 'Villa',            w: 3, h: 3, floors: 2, color: '#d4a060' },
  { id: 'warehouse',    label: 'Horrea',           w: 2, h: 3, floors: 2, color: '#b09060' },
  { id: 'temple_small', label: 'Small Temple',     w: 2, h: 2, floors: 3, color: '#e0c888' },
  { id: 'aqueduct',     label: 'Aqueduct Arch',    w: 1, h: 3, floors: 4, color: '#c8b080' },
  { id: 'amphitheater', label: 'Amphitheater',     w: 3, h: 3, floors: 3, color: '#c89060' },
]

// Landmark milestones — fixed prominent positions (grid col, row)
export const LANDMARKS = [
  {
    id: 'temple_jupiter',
    label: 'Temple of Jupiter',
    hoursRequired: 5,
    gridCol: 10, gridRow: 10,
    w: 3, h: 3, floors: 5,
    color: '#f0d080',
    isLandmark: true,
  },
  {
    id: 'forum_romanum',
    label: 'Forum Romanum',
    hoursRequired: 10,
    gridCol: 7, gridRow: 7,
    w: 5, h: 4, floors: 3,
    color: '#e8c870',
    isLandmark: true,
  },
  {
    id: 'colosseum',
    label: 'Colosseum',
    hoursRequired: 20,
    gridCol: 13, gridRow: 13,
    w: 5, h: 5, floors: 5,
    color: '#d4a050',
    isLandmark: true,
  },
  {
    id: 'pantheon',
    label: 'Pantheon',
    hoursRequired: 50,
    gridCol: 9, gridRow: 6,
    w: 4, h: 4, floors: 6,
    color: '#f0e090',
    isLandmark: true,
  },
]

// Seeded pseudo-random for deterministic city layouts
function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// Check if a grid rectangle is free
function isFree(grid, col, row, w, h) {
  if (col < 0 || row < 0 || col + w > CITY_COLS || row + h > CITY_ROWS) return false
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (grid[r][c]) return false
    }
  }
  return true
}

// Mark grid cells as occupied
function occupy(grid, col, row, w, h) {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      grid[r][c] = true
    }
  }
}

// Build the city layout from session count and total hours
export function buildCityLayout(sessions, totalHours) {
  const rand = seededRand(42)
  const grid = Array.from({ length: CITY_ROWS }, () => Array(CITY_COLS).fill(false))
  const buildings = []

  // Reserve landmark zones
  for (const lm of LANDMARKS) {
    // Reserve a slightly larger buffer zone around landmarks
    const buf = 1
    occupy(grid,
      Math.max(0, lm.gridCol - buf),
      Math.max(0, lm.gridRow - buf),
      lm.w + buf * 2,
      lm.h + buf * 2
    )
  }

  // Place landmarks that have been unlocked
  for (const lm of LANDMARKS) {
    if (totalHours >= lm.hoursRequired) {
      buildings.push({
        ...lm,
        col: lm.gridCol,
        row: lm.gridRow,
        seed: lm.id,
        unlocked: true,
      })
    }
  }

  // Place regular buildings based on session count
  // Start sparse from center outward using a spiral-ish approach
  const candidates = []
  const cx = Math.floor(CITY_COLS / 2)
  const cy = Math.floor(CITY_ROWS / 2)

  // Generate candidate positions sorted by distance from center
  for (let r = 0; r < CITY_ROWS; r++) {
    for (let c = 0; c < CITY_COLS; c++) {
      const dist = Math.hypot(c - cx, r - cy)
      candidates.push({ c, r, dist })
    }
  }
  candidates.sort((a, b) => a.dist - b.dist)

  // Place buildings in sessions
  let placed = 0
  for (let i = 0; i < sessions && placed < sessions; i++) {
    // First building is always an insula, second always a bakery (to the right)
    let btype
    if (i === 0) {
      btype = BUILDING_TYPES.find(t => t.id === 'insula')
    } else if (i === 1) {
      btype = BUILDING_TYPES.find(t => t.id === 'bakery')
    } else {
      const progress = i / Math.max(sessions, 1)
      const availableTypes = BUILDING_TYPES.filter(t => {
        if (progress < 0.2) return t.w <= 1 && t.h <= 1
        if (progress < 0.5) return t.w <= 2 && t.h <= 2
        return true
      })
      const typeIdx = Math.floor(rand() * availableTypes.length)
      btype = availableTypes[typeIdx]
    }

    // For bakery (i===1): force placement to the right of the insula
    if (i === 1) {
      const insula = buildings.find(b => b.id === 'insula')
      let placed_ = false
      if (insula) {
        for (let dc = 1; dc <= CITY_COLS; dc++) {
          const tc = insula.col + dc
          if (isFree(grid, tc, insula.row, btype.w, btype.h)) {
            occupy(grid, tc, insula.row, btype.w, btype.h)
            buildings.push({ ...btype, col: tc, row: insula.row, seed: i, unlocked: true, isLandmark: false })
            placed_++
            placed++
            break
          }
        }
      }
      if (!placed_) break
      continue
    }

    // Try to place near center first, with some randomness
    let placed_ = false
    for (let attempt = 0; attempt < candidates.length; attempt++) {
      // Add jitter to candidate selection
      const jitter = Math.floor(rand() * Math.min(20, candidates.length))
      const idx = Math.min(attempt + jitter, candidates.length - 1)
      const { c, r } = candidates[idx]

      if (isFree(grid, c, r, btype.w, btype.h)) {
        occupy(grid, c, r, btype.w, btype.h)
        buildings.push({
          ...btype,
          col: c,
          row: r,
          seed: i,
          unlocked: true,
          isLandmark: false,
        })
        placed_++
        placed++
        break
      }
    }
    if (!placed_) break
  }

  return buildings
}
