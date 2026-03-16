import { useState, useRef, useEffect } from 'react'
import BuildingShop from './BuildingShop.jsx'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const PRESETS = [25, 50]

export default function Timer({ timeLeft, isRunning, progress, durationMinutes, start, pause, reset, setDuration, onGiveUp, denarii, onPurchase }) {
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const shopRef = useRef(null)

  // Close shop on outside tap
  useEffect(() => {
    if (!showShop) return
    function handle(e) { if (shopRef.current && !shopRef.current.contains(e.target)) setShowShop(false) }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [showShop])

  const circumference = 2 * Math.PI * 44
  const dashOffset = circumference * (1 - progress)

  function applyCustom() {
    const val = parseInt(customInput)
    if (val > 0 && val <= 180) {
      setDuration(val)
      setShowCustom(false)
      setCustomInput('')
    }
  }

  return (
    <div className="flex items-center gap-4 relative">
      {/* Circular timer — compact */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <svg width="100" height="100" className="-rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(192,88,40,0.15)" strokeWidth="5" />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="#c05828"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-[#5a3a18] tracking-widest font-mono leading-none">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] text-[#8a6a44] mt-0.5">
            {isRunning ? 'focusing' : timeLeft === 0 ? 'done!' : 'ready'}
          </span>
        </div>
      </div>

      {/* Shop popup — anchored above the timer row */}
      {showShop && (
        <div ref={shopRef} className="absolute bottom-full left-0 right-0 z-30" style={{ marginBottom: '8px' }}>
          <BuildingShop
            denarii={denarii}
            onPurchase={(b) => { onPurchase(b); setShowShop(false) }}
            onClose={() => setShowShop(false)}
          />
        </div>
      )}

      {/* Right side: presets + controls */}
      <div className="flex flex-col gap-2.5 flex-1 min-w-0">
        {/* Duration presets */}
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map(m => (
            <button
              key={m}
              onClick={() => { setDuration(m); setShowCustom(false) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                durationMinutes === m && !showCustom
                  ? 'bg-[#c05828] text-white'
                  : 'bg-[#e8d4a8]/60 text-[#7a4a28]'
              }`}
            >
              {m}m
            </button>
          ))}
          <button
            onClick={() => setShowCustom(v => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              showCustom ? 'bg-[#c05828] text-white' : 'bg-[#e8d4a8]/60 text-[#7a4a28]'
            }`}
          >
            Custom
          </button>
          {showCustom && (
            <div className="flex gap-1 w-full mt-0.5">
              <input
                type="number"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyCustom()}
                placeholder="min"
                min={1} max={180}
                className="w-16 px-2 py-1 rounded text-xs bg-[#e8d4a8]/60 text-[#5a3a18] border border-[#c4a07e]/50 focus:outline-none"
              />
              <button onClick={applyCustom} className="px-2 py-1 rounded bg-[#c05828] text-white text-xs">Set</button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center">
          {!isRunning ? (
            <button
              onClick={start}
              className="px-5 py-2.5 rounded-xl bg-[#c05828] text-white font-semibold text-sm hover:bg-[#a04818] active:scale-95 transition-all shadow-md"
            >
              {timeLeft === 0 ? 'Again' : 'Start'}
            </button>
          ) : (
            <button
              onClick={pause}
              className="px-5 py-2.5 rounded-xl bg-[#e8d4a8] text-[#7a4a28] font-semibold text-sm active:scale-95 transition-all shadow-md"
            >
              Pause
            </button>
          )}
          <button
            onClick={reset}
            className="px-3 py-2.5 rounded-xl border border-[#c4a07e]/50 text-[#8a6a44] text-sm active:scale-95 transition-all"
          >
            Reset
          </button>
          {/* Hammer — open building shop */}
          <button
            onClick={() => setShowShop(v => !v)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all active:scale-95 ${
              showShop
                ? 'bg-[#c05828] text-white shadow-md'
                : 'bg-[#e8d4a8]/60 text-[#7a4a28]'
            }`}
            title="Build"
          >
            🔨
          </button>
          {/* Denarii balance */}
          <span className="text-xs font-bold text-amber-700 ml-1">ᴅ {denarii}</span>
          {isRunning && (
            <button
              onClick={onGiveUp}
              className="ml-auto text-xs text-red-400/70 hover:text-red-500 transition-colors underline underline-offset-2 pr-1"
            >
              Give up
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
