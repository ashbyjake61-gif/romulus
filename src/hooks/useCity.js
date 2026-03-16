import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildCityLayout, LANDMARKS } from '../lib/cityEngine.js'
import { SHOP_BUILDINGS } from '../components/BuildingShop.jsx'

const LOCAL_KEY = 'romulus_city_state'
const FIRE_KEY = 'romulus_fires'
const PURCHASED_KEY = 'romulus_purchased'

function loadLocal() {
  try { const raw = localStorage.getItem(LOCAL_KEY); if (raw) return JSON.parse(raw) } catch {}
  return null
}
function saveLocal(state) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)) } catch {}
}
function loadFires() {
  try { const raw = localStorage.getItem(FIRE_KEY); if (raw) return JSON.parse(raw) } catch {}
  return []
}
function saveFires(fires) {
  try { localStorage.setItem(FIRE_KEY, JSON.stringify(fires)) } catch {}
}
function loadPurchased() {
  try { const raw = localStorage.getItem(PURCHASED_KEY); if (raw) return JSON.parse(raw) } catch {}
  return []
}
function savePurchased(p) {
  try { localStorage.setItem(PURCHASED_KEY, JSON.stringify(p)) } catch {}
}

const DEFAULT_STATE = { totalSessions: 0, totalMinutes: 0, spentDenarii: 0 }

// Find a free spot for a purchased building
function findFreeSpot(grid, w, h) {
  const cx = 10, cy = 10
  const candidates = []
  for (let r = 0; r < 20; r++)
    for (let c = 0; c < 20; c++)
      candidates.push({ c, r, dist: Math.hypot(c - cx, r - cy) })
  candidates.sort((a, b) => a.dist - b.dist)

  for (const { c, r } of candidates) {
    if (c < 0 || r < 0 || c + w > 20 || r + h > 20) continue
    let free = true
    outer: for (let rr = r; rr < r + h; rr++)
      for (let cc = c; cc < c + w; cc++)
        if (grid[rr]?.[cc]) { free = false; break outer }
    if (free) return { col: c, row: r }
  }
  return null
}

export function useCity(user) {
  const [cityState, setCityState] = useState(() => loadLocal() || DEFAULT_STATE)
  const [buildings, setBuildings] = useState([])
  const [newBuildingId, setNewBuildingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fires, setFires] = useState(() => loadFires())
  const [purchasedBuildings, setPurchasedBuildings] = useState(() => loadPurchased())

  const totalHours = cityState.totalMinutes / 60
  const totalSessions = cityState.totalSessions
  const denarii = Math.max(0, cityState.totalMinutes - (cityState.spentDenarii || 0))

  useEffect(() => {
    const layout = buildCityLayout(cityState.totalSessions, totalHours)

    // Build occupation grid from auto-placed buildings
    const grid = Array.from({ length: 20 }, () => Array(20).fill(false))
    for (const b of layout) {
      for (let r = b.row; r < b.row + b.h; r++)
        for (let c = b.col; c < b.col + b.w; c++)
          if (grid[r]) grid[r][c] = true
    }

    const allBuildings = [...layout]
    // Track which purchased buildings needed their position assigned
    let positionsUpdated = false
    const updatedPurchased = purchasedBuildings.map(pb => {
      // Already has a saved position — use it
      if (pb.col !== undefined && pb.row !== undefined) {
        for (let r = pb.row; r < pb.row + pb.h; r++)
          for (let c = pb.col; c < pb.col + pb.w; c++)
            if (grid[r]) grid[r][c] = true
        allBuildings.push({ ...pb, isLandmark: false, unlocked: true })
        return pb
      }
      // No position yet — find one and save it permanently
      const spot = findFreeSpot(grid, pb.w, pb.h)
      if (spot) {
        for (let r = spot.row; r < spot.row + pb.h; r++)
          for (let c = spot.col; c < spot.col + pb.w; c++)
            if (grid[r]) grid[r][c] = true
        const placed = { ...pb, col: spot.col, row: spot.row }
        allBuildings.push({ ...placed, isLandmark: false, unlocked: true })
        positionsUpdated = true
        return placed
      }
      return pb
    })

    // If any positions were newly assigned, persist them
    if (positionsUpdated) {
      savePurchased(updatedPurchased)
      setPurchasedBuildings(updatedPurchased)
    }

    setBuildings(allBuildings)
  }, [cityState.totalSessions, totalHours, purchasedBuildings])

  const persistToSupabase = useCallback(async (state, userId, purchased) => {
    if (!userId) return
    await supabase.from('city_saves').upsert({
      user_id: userId,
      total_sessions: state.totalSessions,
      total_minutes: state.totalMinutes,
      spent_denarii: state.spentDenarii || 0,
      purchased_buildings: purchased ?? [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }, [])

  // Load from Supabase when user logs in
  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('city_saves')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        setLoading(false)
        if (data && !error) {
          const state = {
            totalSessions: data.total_sessions || 0,
            totalMinutes: data.total_minutes || 0,
            spentDenarii: data.spent_denarii || 0,
          }
          setCityState(state)
          saveLocal(state)
          // Restore purchased buildings from Supabase — source of truth
          if (Array.isArray(data.purchased_buildings)) {
            setPurchasedBuildings(data.purchased_buildings)
            savePurchased(data.purchased_buildings)
          }
        }
      })
  }, [user])

  const completeSession = useCallback((durationMinutes) => {
    setCityState(prev => {
      const next = { ...prev, totalSessions: prev.totalSessions + 1, totalMinutes: prev.totalMinutes + durationMinutes }
      saveLocal(next)
      if (user) persistToSupabase(next, user.id, purchasedBuildings)
      return next
    })
    if (durationMinutes >= 25) {
      setFires(prev => { if (prev.length === 0) return prev; const next = prev.slice(1); saveFires(next); return next })
    }
    setNewBuildingId(`session_${Date.now()}`)
    setTimeout(() => setNewBuildingId(null), 3000)
  }, [user, persistToSupabase, purchasedBuildings])

  const purchaseBuilding = useCallback((shopBuilding) => {
    const cost = shopBuilding.cost
    let didPurchase = false

    setCityState(prev => {
      const available = Math.max(0, prev.totalMinutes - (prev.spentDenarii || 0))
      if (available < cost) return prev
      didPurchase = true
      const next = { ...prev, spentDenarii: (prev.spentDenarii || 0) + cost }
      saveLocal(next)
      return next
    })

    // We can't read didPurchase synchronously due to React batching,
    // so re-check affordability here directly
    const available = Math.max(0, cityState.totalMinutes - (cityState.spentDenarii || 0))
    if (available < cost) return

    const newBuilding = { ...shopBuilding, seed: `purchased_${Date.now()}` }
    setPurchasedBuildings(prev => {
      const next = [...prev, newBuilding]
      savePurchased(next)
      // Persist state + purchased to Supabase together
      setCityState(state => {
        if (user) persistToSupabase(state, user.id, next)
        return state
      })
      return next
    })
  }, [user, persistToSupabase, cityState.totalMinutes, cityState.spentDenarii])

  const failSession = useCallback((currentBuildings) => {
    const candidates = currentBuildings.filter(b => !b.isLandmark && !fires.some(f => f.col === b.col && f.row === b.row))
    if (candidates.length === 0) return null
    const target = candidates[Math.floor(Math.random() * candidates.length)]
    const fire = { id: `fire_${Date.now()}`, col: target.col, row: target.row, label: target.label, failedAt: Date.now() }
    setFires(prev => { const next = [...prev, fire]; saveFires(next); return next })
    return fire
  }, [fires])

  const repairByPay = useCallback((fireId) => {
    setCityState(prev => {
      const next = { ...prev, totalMinutes: Math.max(0, prev.totalMinutes - 10) }
      saveLocal(next)
      if (user) persistToSupabase(next, user.id, purchasedBuildings)
      return next
    })
    setFires(prev => { const next = prev.filter(f => f.id !== fireId); saveFires(next); return next })
  }, [user, persistToSupabase, purchasedBuildings])

  const nextLandmark = LANDMARKS.find(lm => totalHours < lm.hoursRequired) || null

  return {
    buildings, totalHours, totalSessions, newBuildingId, loading,
    fires, denarii, completeSession, failSession, repairByPay,
    purchaseBuilding, nextLandmark,
  }
}
