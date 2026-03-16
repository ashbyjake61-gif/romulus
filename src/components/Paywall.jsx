import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Paywall({ user, onShowAuth }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleBuy() {
    if (!user) {
      onShowAuth()
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to start checkout')
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6"
      style={{ background: 'linear-gradient(160deg, #f5e8d0 0%, #ead4a8 50%, #e0c898 100%)' }}
    >
      {/* City silhouette decoration */}
      <div className="text-6xl mb-2 select-none">🏛️</div>

      <h1 className="text-2xl font-bold text-[#5a3a18] tracking-wide mb-1">ROMULUS</h1>
      <p className="text-sm text-[#8a6a44] italic mb-8 text-center">
        "Rome wasn't built in a day."
      </p>

      <div className="bg-white/50 rounded-3xl p-7 w-full max-w-sm border border-[#e8d4a8] shadow-xl text-center">
        <p className="text-[#5a3a18] font-semibold text-base mb-1">Build your empire.</p>
        <p className="text-[#8a6a44] text-sm mb-6 leading-relaxed">
          A focus timer that grows a Roman city — one session at a time. Yours forever.
        </p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-4xl font-bold text-[#5a3a18]">£3</span>
          <div className="text-left">
            <p className="text-xs font-semibold text-[#5a3a18]">One-time</p>
            <p className="text-xs text-[#8a6a44]">No subscription</p>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#c05828] text-white font-bold text-base hover:bg-[#a04818] active:scale-95 transition-all shadow-lg disabled:opacity-60"
        >
          {loading ? 'Loading…' : user ? 'Buy for £3' : 'Sign in to buy'}
        </button>

        {error && (
          <p className="text-red-600 text-xs mt-3">{error}</p>
        )}

        {!user && (
          <button
            onClick={onShowAuth}
            className="mt-4 text-sm text-[#c05828] underline underline-offset-2"
          >
            Sign in / Create account
          </button>
        )}

        <p className="text-xs text-[#a08060] mt-5">
          Buy it, own it. No ads, no subscription.
        </p>
      </div>
    </div>
  )
}
