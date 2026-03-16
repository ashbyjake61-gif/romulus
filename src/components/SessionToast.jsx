import { useEffect, useState } from 'react'

export default function SessionToast({ visible, message }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const t = setTimeout(() => setShow(false), 3500)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!show) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down">
      <div className="bg-[#5a3a18] text-[#f0dfc0] px-5 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
        <span className="text-yellow-400">✦</span>
        {message || 'Session complete! A new building rises.'}
      </div>
    </div>
  )
}
