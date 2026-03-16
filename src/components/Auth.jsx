import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Auth({ onClose }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose?.()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Check your email to confirm your account!')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#faf3e8] rounded-2xl shadow-2xl w-full max-w-sm p-8 relative border border-[#e8d4a8]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a6a44] hover:text-[#5a3a18] text-xl"
        >
          ✕
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🏛️</div>
          <h2 className="text-xl font-bold text-[#5a3a18]">
            {mode === 'login' ? 'Welcome back' : 'Join Romulus'}
          </h2>
          <p className="text-sm text-[#8a6a44] mt-1">
            {mode === 'login' ? 'Your city awaits' : 'Begin building your empire'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="px-4 py-2.5 rounded-lg bg-[#e8d4a8]/50 border border-[#c4a07e]/50 text-[#5a3a18] placeholder-[#a08060] focus:outline-none focus:border-[#c05828] text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="px-4 py-2.5 rounded-lg bg-[#e8d4a8]/50 border border-[#c4a07e]/50 text-[#5a3a18] placeholder-[#a08060] focus:outline-none focus:border-[#c05828] text-sm"
          />
          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-700 text-xs bg-green-50 border border-green-200 rounded px-3 py-2">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 rounded-lg bg-[#c05828] text-white font-semibold hover:bg-[#a04818] disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#8a6a44] mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
            className="text-[#c05828] hover:underline font-medium"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
