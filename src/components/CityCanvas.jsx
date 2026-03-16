import { useEffect, useRef, useState, useCallback } from 'react'
import { renderCity } from '../lib/cityRenderer.js'

export default function CityCanvas({ buildings, newBuildingId, fires = [] }) {
  const canvasRef = useRef(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const animFrame = useRef(null)
  const glowPhase = useRef(0)
  const lastTimestamp = useRef(0)

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animRunning = true

    function frame(timestamp) {
      if (!animRunning) return
      const dt = timestamp - lastTimestamp.current
      lastTimestamp.current = timestamp
      glowPhase.current = (glowPhase.current + dt * 0.002) % (Math.PI * 2)

      // Resize canvas to container
      const parent = canvas.parentElement
      if (parent) {
        const { width, height } = parent.getBoundingClientRect()
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }
      }

      renderCity(canvas, buildings, newBuildingId, pan, zoom, fires)
      animFrame.current = requestAnimationFrame(frame)
    }

    animFrame.current = requestAnimationFrame(frame)
    return () => {
      animRunning = false
      cancelAnimationFrame(animFrame.current)
    }
  }, [buildings, newBuildingId, pan, zoom, fires])

  // Pan handlers
  const onMouseDown = useCallback((e) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Zoom
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(3, Math.max(0.3, z * delta)))
  }, [])

  // Touch support
  const lastTouch = useRef(null)
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])
  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastMouse.current.x
      const dy = e.touches[0].clientY - lastMouse.current.y
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
    }
  }, [])
  const onTouchEnd = useCallback(() => { isDragging.current = false }, [])

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'none' }}
      />
      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          className="w-8 h-8 rounded bg-black/30 text-white/80 hover:bg-black/50 text-lg leading-none flex items-center justify-center"
        >+</button>
        <button
          onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}
          className="w-8 h-8 rounded bg-black/30 text-white/80 hover:bg-black/50 text-lg leading-none flex items-center justify-center"
        >−</button>
        <button
          onClick={resetView}
          className="w-8 h-8 rounded bg-black/30 text-white/80 hover:bg-black/50 text-xs flex items-center justify-center"
          title="Reset view"
        >⌂</button>
      </div>
      {buildings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[#8a6a44] text-sm opacity-60 italic">
            Complete a session to begin building Rome...
          </p>
        </div>
      )}
    </div>
  )
}
