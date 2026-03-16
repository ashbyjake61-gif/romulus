import { LANDMARKS } from '../lib/cityEngine.js'

function HoursBar({ totalHours, nextLandmark }) {
  if (!nextLandmark) return null
  const prev = LANDMARKS.slice().reverse().find(lm => totalHours >= lm.hoursRequired) || null
  const fromH = prev ? prev.hoursRequired : 0
  const toH = nextLandmark.hoursRequired
  const progress = Math.min(1, (totalHours - fromH) / (toH - fromH))

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-[#8a6a44] mb-1">
        <span>{totalHours.toFixed(1)}h</span>
        <span>Next: {nextLandmark.label} at {nextLandmark.hoursRequired}h</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#d4b896]/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c05828] to-[#e8a040] transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

export default function StatsPanel({ totalHours, totalSessions, nextLandmark }) {
  const unlockedLandmarks = LANDMARKS.filter(lm => totalHours >= lm.hoursRequired)

  return (
    <div className="flex flex-col gap-3">
      {/* Main stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#e8d4a8]/40 rounded-xl p-3 text-center border border-[#c4a07e]/30">
          <div className="text-2xl font-bold text-[#5a3a18]">{totalSessions}</div>
          <div className="text-xs text-[#8a6a44]">sessions</div>
        </div>
        <div className="bg-[#e8d4a8]/40 rounded-xl p-3 text-center border border-[#c4a07e]/30">
          <div className="text-2xl font-bold text-[#5a3a18]">{totalHours.toFixed(1)}</div>
          <div className="text-xs text-[#8a6a44]">hours</div>
        </div>
      </div>

      {/* Progress to next landmark */}
      <HoursBar totalHours={totalHours} nextLandmark={nextLandmark} />

      {/* Unlocked landmarks */}
      {unlockedLandmarks.length > 0 && (
        <div>
          <p className="text-xs text-[#8a6a44] font-medium mb-1.5 uppercase tracking-wide">Landmarks</p>
          <div className="flex flex-col gap-1">
            {unlockedLandmarks.map(lm => (
              <div key={lm.id} className="flex items-center gap-2 text-xs text-[#5a3a18]">
                <span className="text-yellow-600">✦</span>
                <span>{lm.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalSessions === 0 && (
        <p className="text-xs text-[#8a6a44] italic text-center opacity-70 mt-1">
          Complete your first session to place your first building.
        </p>
      )}
    </div>
  )
}
