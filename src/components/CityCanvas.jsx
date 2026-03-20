import { useEffect, useRef, useCallback } from 'react'
import { renderCity } from '../lib/cityRenderer.js'

export default function CityCanvas({ buildings, newBuildingId, fires = [] }) {
  const canvasRef = useRef(null)
  const animFrame = useRef(null)

  // Mutable render state — all in refs so rAF loop reads fresh values
  const panRef  = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const buildingsRef    = useRef(buildings)
  const newBuildingIdRef = useRef(newBuildingId)
  const firesRef        = useRef(fires)

  buildingsRef.current     = buildings
  newBuildingIdRef.current = newBuildingId
  firesRef.current         = fires

  // Single rAF loop — starts once, reads state from refs
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let running = true

    function frame() {
      if (!running) return
      const parent = canvas.parentElement
      if (parent) {
        const { width, height } = parent.getBoundingClientRect()
        if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) {
          canvas.width  = Math.round(width)
          canvas.height = Math.round(height)
        }
      }
      renderCity(canvas, buildingsRef.current, newBuildingIdRef.current, panRef.current, zoomRef.current, firesRef.current)
      animFrame.current = requestAnimationFrame(frame)
    }

    animFrame.current = requestAnimationFrame(frame)
    return () => { running = false; cancelAnimationFrame(animFrame.current) }
  }, [])

  // Pan tracking
  const isPanning   = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((clientX, clientY) => {
    isPanning.current = true
    lastPointer.current = { x: clientX, y: clientY }
  }, [])

  const onPointerMove = useCallback((clientX, clientY) => {
    if (!isPanning.current) return
    panRef.current = {
      x: panRef.current.x + (clientX - lastPointer.current.x),
      y: panRef.current.y + (clientY - lastPointer.current.y),
    }
    lastPointer.current = { x: clientX, y: clientY }
  }, [])

  const onPointerUp = useCallback(() => { isPanning.current = false }, [])

  // Mouse
  const onMouseDown  = useCallback((e) => { onPointerDown(e.clientX, e.clientY) }, [onPointerDown])
  const onMouseMove  = useCallback((e) => { onPointerMove(e.clientX, e.clientY) }, [onPointerMove])
  const onMouseUp    = useCallback(() => { onPointerUp() }, [onPointerUp])

  // Wheel zoom
  const onWheel = useCallback((e) => {
    e.preventDefault()
    zoomRef.current = Math.min(3, Math.max(0.3, zoomRef.current * (e.deltaY > 0 ? 0.9 : 1.1)))
  }, [])

  // Touch
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) onPointerDown(e.touches[0].clientX, e.touches[0].clientY)
  }, [onPointerDown])
  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    if (e.touches.length === 1) onPointerMove(e.touches[0].clientX, e.touches[0].clientY)
  }, [onPointerMove])
  const onTouchEnd = useCallback(() => { onPointerUp() }, [onPointerUp])

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
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => { zoomRef.current = Math.min(3, zoomRef.current * 1.2) }}
          className="w-8 h-8 rounded bg-black/30 text-white/80 hover:bg-black/50 text-lg leading-none flex items-center justify-center"
        >+</button>
        <button
          onClick={() => { zoomRef.current = Math.max(0.3, zoomRef.current * 0.8) }}
          className="w-8 h-8 rounded bg-black/30 text-white/80 hover:bg-black/50 text-lg leading-none flex items-center justify-center"
        >−</button>
        <button
          onClick={() => { panRef.current = { x: 0, y: 0 }; zoomRef.current = 1 }}
          className="w-8 h-8 rounded bg-black/30 text-white/80 hover:bg-black/50 text-xs flex items-center justify-center"
          title="Reset view"
        >⌂</button>
      </div>
    </div>
  )
}
