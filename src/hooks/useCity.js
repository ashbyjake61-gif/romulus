import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildCityLayout, LANDMARKS } from '../lib/cityEngine.js'

const LOCAL_KEY = 'romulus_city_state'
const FIRE_KEY = 'romulus_fires'

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveLocal(state) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
  } catch {}
}

function loadFires() {
  try {
    const raw = localStorage.getItem(FIRE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveFires(fires) {
  try {
    localStorage.setItem(FIRE_KEY, JSON.stringify(fires))
  } catch {}
}

const DEFAULT_STATE = {
  totalSessions: 0,
  totalMinutes: 0,
}

export function useCity(user) {
  const [cityState, setCityState] = useState(() => loadLocal() || DEFAULT_STATE)
  const [buildings, setBuildings] = useState([])
  const [newBuildingId, setNewBuildingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fires, setFires] = useState(() => loadFires())

  const totalHours = cityState.totalMinutes / 60
  const totalSessions = cityState.totalSessions

  useEffect(() => {
    const layout = buildCityLayout(cityState.totalSessions, totalHours)
    setBuildings(layout)
  }, [cityState.totalSessions, totalHours])

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
          }
          setCityState(state)
          saveLocal(state)
        }
      })
  }, [user])

  const persistToSupabase = useCallback(async (state, userId) => {
    if (!userId) return
    await supabase
      .from('city_saves')
      .upsert({
        user_id: userId,
        total_sessions: state.totalSessions,
        total_minutes: state.totalMinutes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
  }, [])

  const completeSession = useCallback((durationMinutes) => {
    setCityState(prev => {
      const next = {
        totalSessions: prev.totalSessions + 1,
        totalMinutes: prev.totalMinutes + durationMinutes,
      }
      saveLocal(next)
      if (user) persistToSupabase(next, user.id)
      return next
    })

    // Auto-repair oldest fire if session is 25min+
    if (durationMinutes >= 25) {
      setFires(prev => {
        if (prev.length === 0) return prev
        const next = prev.slice(1) // remove oldest
        saveFires(next)
        return next
      })
    }

    setNewBuildingId(`session_${Date.now()}`)
    setTimeout(() => setNewBuildingId(null), 3000)
  }, [user, persistToSupabase])

  // Fail a random regular (non-landmark) building
  const failSession = useCallback((currentBuildings) => {
    const candidates = currentBuildings.filter(b =>
      !b.isLandmark &&
      !fires.some(f => f.col === b.col && f.row === b.row)
    )
    if (candidates.length === 0) return null

    const target = candidates[Math.floor(Math.random() * candidates.length)]
    const fire = {
      id: `fire_${Date.now()}`,
      col: target.col,
      row: target.row,
      label: target.label,
      failedAt: Date.now(),
    }
    setFires(prev => {
      const next = [...prev, fire]
      saveFires(next)
      return next
    })
    return fire
  }, [fires])

  // Repair by paying (costs 10 minutes of total study time)
  const repairByPay = useCallback((fireId) => {
    setCityState(prev => {
      const next = {
        ...prev,
        totalMinutes: Math.max(0, prev.totalMinutes - 10),
      }
      saveLocal(next)
      if (user) persistToSupabase(next, user.id)
      return next
    })
    setFires(prev => {
      const next = prev.filter(f => f.id !== fireId)
      saveFires(next)
      return next
    })
  }, [user, persistToSupabase])

  const nextLandmark = LANDMARKS.find(lm => totalHours < lm.hoursRequired) || null

  return {
    buildings,
    totalHours,
    totalSessions,
    newBuildingId,
    loading,
    fires,
    completeSession,
    failSession,
    repairByPay,
    nextLandmark,
  }
}
