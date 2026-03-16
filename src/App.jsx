import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { useTimer } from './hooks/useTimer.js'
import { useCity } from './hooks/useCity.js'
import { LANDMARKS } from './lib/cityEngine.js'
import CityCanvas from './components/CityCanvas.jsx'
import Timer from './components/Timer.jsx'
import Auth from './components/Auth.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import SessionToast from './components/SessionToast.jsx'
import Paywall from './components/Paywall.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [isPaid, setIsPaid] = useState(false)
  const [paidLoading, setPaidLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toastKey, setToastKey] = useState(0)
  const [toastMessage, setToastMessage] = useState('')

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Check payment status
  useEffect(() => {
    if (!user) { setPaidLoading(false); setIsPaid(false); return }
    setPaidLoading(true)
    supabase
      .from('city_saves')
      .select('is_paid')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setIsPaid(!!data?.is_paid)
        setPaidLoading(false)
      })

    // Handle Stripe redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      // Poll briefly — webhook may not have fired yet
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const { data } = await supabase.from('city_saves').select('is_paid').eq('user_id', user.id).single()
        if (data?.is_paid) {
          setIsPaid(true)
          clearInterval(poll)
          window.history.replaceState({}, '', '/')
        } else if (attempts >= 8) {
          clearInterval(poll)
        }
      }, 1500)
    }
  }, [user])

  const { buildings, totalHours, totalSessions, newBuildingId, fires, completeSession, failSession, repairByPay, nextLandmark } = useCity(user)

  const onSessionComplete = useCallback((durationMinutes) => {
    const newHours = totalHours + durationMinutes / 60
    const newLandmark = LANDMARKS.find(lm => lm.hoursRequired <= newHours && lm.hoursRequired > totalHours)
    completeSession(durationMinutes)
    setToastMessage(newLandmark ? `🏛️ ${newLandmark.label} unlocked!` : 'Session complete! A new building rises.')
    setToastKey(k => k + 1)
    if (Notification.permission === 'granted') {
      new Notification('Romulus', { body: 'Session complete! Your city grows.' })
    }
  }, [completeSession, totalHours])

  const timer = useTimer(onSessionComplete)

  function handleStart() {
    if (Notification.permission === 'default') Notification.requestPermission()
    timer.start()
  }

  function handleGiveUp() {
    timer.reset()
    if (buildings.length === 0) return
    const fire = failSession(buildings)
    if (fire) {
      setToastMessage(`🔥 You gave up — ${fire.label} is on fire!`)
      setToastKey(k => k + 1)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setIsPaid(false)
  }

  // Show paywall if not paid (and not still loading)
  const showPaywall = !paidLoading && !isPaid

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: '#d4b896' }}
    >
      {/* City canvas fills the whole screen */}
      <CityCanvas buildings={buildings} newBuildingId={newBuildingId} fires={fires} />

      {/* Paywall overlay */}
      {showPaywall && (
        <Paywall user={user} onShowAuth={() => setShowAuth(true)} />
      )}

      {!showPaywall && (
        <>
          {/* Top bar */}
          <header
            className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 z-20"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 12px)',
              paddingBottom: '10px',
              background: 'linear-gradient(to bottom, rgba(212,184,150,0.92) 0%, rgba(212,184,150,0) 100%)',
            }}
          >
            <div>
              <h1 className="text-base font-bold text-[#5a3a18] tracking-wide leading-none">ROMULUS</h1>
              <p className="text-[10px] text-[#8a6a44] italic leading-none mt-0.5">"Rome wasn't built in a day."</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick stats pill */}
              <div className="bg-black/15 backdrop-blur-sm rounded-full px-3 py-1 flex gap-3">
                <span className="text-xs text-[#5a3a18] font-medium">{totalSessions} <span className="font-normal opacity-70">sessions</span></span>
                <span className="text-xs text-[#5a3a18] font-medium">{totalHours.toFixed(1)}<span className="font-normal opacity-70">h</span></span>
              </div>
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-xs text-[#8a6a44] bg-black/10 rounded-full px-2.5 py-1"
                >
                  Out
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-xs text-[#c05828] font-medium bg-white/50 rounded-full px-2.5 py-1"
                >
                  Sign in
                </button>
              )}
            </div>
          </header>

          {/* Bottom sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-20 transition-transform duration-300 ease-out"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
          >
            <div
              className="rounded-t-3xl shadow-2xl mx-0"
              style={{ background: 'rgba(250,243,232,0.96)', backdropFilter: 'blur(20px)' }}
            >
              {/* Drag handle + expand toggle */}
              <button
                onClick={() => setSheetOpen(o => !o)}
                className="w-full flex flex-col items-center pt-3 pb-1 active:opacity-70"
                aria-label="Toggle stats"
              >
                <div className="w-9 h-1 rounded-full bg-[#c4a07e]/50 mb-2" />
                <span className="text-[10px] text-[#a08060] uppercase tracking-widest">
                  {sheetOpen ? 'hide stats ↓' : 'stats ↑'}
                </span>
              </button>

              {/* Expanded stats */}
              {sheetOpen && (
                <div className="px-5 pt-2 pb-3 border-t border-[#e8d4a8]/60">
                  <StatsPanel totalHours={totalHours} totalSessions={totalSessions} nextLandmark={nextLandmark} />

                  {/* Milestones */}
                  <div className="mt-3 pt-3 border-t border-[#e8d4a8]/40">
                    <p className="text-[10px] text-[#8a6a44] font-semibold uppercase tracking-widest mb-2">Milestones</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {LANDMARKS.map(lm => {
                        const unlocked = totalHours >= lm.hoursRequired
                        return (
                          <div key={lm.id} className={`flex items-center gap-1.5 text-xs ${unlocked ? 'text-[#5a3a18]' : 'text-[#a08060]'}`}>
                            <span className={unlocked ? 'text-yellow-600' : 'opacity-30'}>{unlocked ? '✦' : '○'}</span>
                            <span className={!unlocked ? 'opacity-50' : ''}>{lm.label}</span>
                            <span className="ml-auto opacity-50 text-[10px]">{lm.hoursRequired}h</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Damaged buildings */}
                  {fires.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-200/50">
                      <p className="text-[10px] text-red-600/70 font-semibold uppercase tracking-widest mb-2 flex items-center gap-1">
                        <span>🔥</span> Damaged Buildings
                      </p>
                      <div className="flex flex-col gap-2.5">
                        {fires.map(fire => {
                          const hoursLeft = Math.max(0, 24 - (Date.now() - fire.failedAt) / 3600000)
                          return (
                            <div key={fire.id}>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-[#5a3a18] font-medium">{fire.label}</span>
                                <span className="text-red-400">{hoursLeft.toFixed(0)}h left</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => repairByPay(fire.id)}
                                  className="flex-1 py-2 rounded-xl bg-amber-700/15 border border-amber-700/25 text-amber-800 text-xs font-medium active:scale-95 transition-all"
                                >
                                  Pay (−10 min)
                                </button>
                                <div className="flex-1 py-2 rounded-xl bg-[#e8d4a8]/40 border border-[#c4a07e]/30 text-[#8a6a44] text-xs text-center">
                                  Complete 25m session
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {!user && (
                    <div className="mt-3 text-center">
                      <button onClick={() => setShowAuth(true)} className="text-xs text-[#c05828] underline underline-offset-2">
                        Sign in to save your city →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Timer — always visible */}
              <div className="px-4 pt-2 pb-3">
                <Timer
                  timeLeft={timer.timeLeft}
                  isRunning={timer.isRunning}
                  progress={timer.progress}
                  durationMinutes={timer.durationMinutes}
                  start={handleStart}
                  pause={timer.pause}
                  reset={timer.reset}
                  setDuration={timer.setDuration}
                  onGiveUp={handleGiveUp}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      <SessionToast key={toastKey} visible message={toastMessage} />

      {/* Auth modal */}
      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
    </div>
  )
}
