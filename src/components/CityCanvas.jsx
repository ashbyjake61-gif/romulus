import { useEffect, useRef, useCallback } from 'react'
import { renderCity, screenToGrid, getViewOffsets, hitTestBuildings } from '../lib/cityRenderer.js'
import { CITY_COLS, CITY_ROWS } from '../lib/cityEngine.js'

export default function CityCanvas({ buildings, newBuildingId, fires = [], onBuildingMove }) {
  const canvasRef = useRef(null)
  const animFrame = useRef(null)

  // Mutable render state — all kept in refs so rAF loop always reads fresh values
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const buildingsRef = useRef(buildings)
  const newBuildingIdRef = useRef(newBuildingId)
  const firesRef = useRef(fires)
  const dragRef = useRef(null) // { building, ghostCol, ghostRow, isFree }

  // Keep refs in sync with props
  buildingsRef.current = buildings
  newBuildingIdRef.current = newBuildingId
  firesRef.current = fires

  // Single rAF loop — starts once, reads all state from refs
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
          canvas.width = Math.round(width)
          canvas.height = Math.round(height)
        }
      }
      renderCity(
        canvas,
        buildingsRef.current,
        newBuildingIdRef.current,
        panRef.current,
        zoomRef.current,
        firesRef.current,
        dragRef.current,
      )
      animFrame.current = requestAnimationFrame(frame)
    }

    animFrame.current = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(animFrame.current)
    }
  }, []) // never restarts

  // Convert clientX/Y to local canvas coords (after pan/zoom removed)
  const clientToLocal = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const cx = (clientX - rect.left) * scaleX
    const cy = (clientY - rect.top) * scaleY
    const zoom = zoomRef.current
    const pan = panRef.current
    return { lx: (cx - pan.x) / zoom, ly: (cy - pan.y) / zoom }
  }, [])

  // Convert clientX/Y to fractional grid coordinates
  const clientToGrid = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const local = clientToLocal(clientX, clientY)
    if (!local) return null
    const { offsetX, offsetY } = getViewOffsets(canvas.width, canvas.height, zoomRef.current)
    return screenToGrid(local.lx, local.ly, offsetX, offsetY)
  }, [clientToLocal])

  // Pointer tracking
  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  const checkFree = useCallback((dragging, newCol, newRow) => {
    if (newCol < 0 || newRow < 0 || newCol + dragging.w > CITY_COLS || newRow + dragging.h > CITY_ROWS) return false
    for (const b of buildingsRef.current) {
      if (b.seed === dragging.seed) continue
      if (newCol < b.col + b.w && newCol + dragging.w > b.col &&
          newRow < b.row + b.h && newRow + dragging.h > b.row) {
        return false
      }
    }
    return true
  }, [])

  const onPointerDown = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const local = clientToLocal(clientX, clientY)
    if (!local) return
    const { offsetX, offsetY } = getViewOffsets(canvas.width, canvas.height, zoomRef.current)
    const hit = hitTestBuildings(buildingsRef.current, local.lx, local.ly, offsetX, offsetY)

    if (hit && !hit.isLandmark) {
      // Start building drag
      dragRef.current = {
        building: hit,
        ghostCol: hit.col,
        ghostRow: hit.row,
        isFree: true,
      }
    } else {
      // Start map pan
      isPanning.current = true
    }
    lastPointer.current = { x: clientX, y: clientY }
  }, [clientToLocal])

  const onPointerMove = useCallback((clientX, clientY) => {
    if (dragRef.current) {
      const gridPos = clientToGrid(clientX, clientY)
      if (!gridPos) return
      const gc = Math.round(gridPos.col - dragRef.current.building.w / 2)
      const gr = Math.round(gridPos.row - dragRef.current.building.h / 2)
      const clampedCol = Math.max(0, Math.min(CITY_COLS - dragRef.current.building.w, gc))
      const clampedRow = Math.max(0, Math.min(CITY_ROWS - dragRef.current.building.h, gr))
      dragRef.current = {
        ...dragRef.current,
        ghostCol: clampedCol,
        ghostRow: clampedRow,
        isFree: checkFree(dragRef.current.building, clampedCol, clampedRow),
      }
    } else if (isPanning.current) {
      const dx = clientX - lastPointer.current.x
      const dy = clientY - lastPointer.current.y
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy }
    }
    lastPointer.current = { x: clientX, y: clientY }
  }, [clientToGrid, checkFree])

  const onPointerUp = useCallback(() => {
    if (dragRef.current) {
      const { building, ghostCol, ghostRow, isFree } = dragRef.current
      if (isFree && (ghostCol !== building.col || ghostRow !== building.row)) {
        onBuildingMove?.(building, ghostCol, ghostRow)
      }
      dragRef.current = null
    }
    isPanning.current = false
  }, [onBuildingMove])

  // Mouse events
  const onMouseDown = useCallback((e) => { onPointerDown(e.clientX, e.clientY) }, [onPointerDown])
  const onMouseMove = useCallback((e) => { onPointerMove(e.clientX, e.clientY) }, [onPointerMove])
  const onMouseUp = useCallback(() => { onPointerUp() }, [onPointerUp])

  // Wheel zoom
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    zoomRef.current = Math.min(3, Math.max(0.3, zoomRef.current * delta))
  }, [])

  // Touch events
  const lastTouch = useRef(null)
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      onPointerDown(e.touches[0].clientX, e.touches[0].clientY)
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [onPointerDown])

  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY)
    }
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
      {/* Controls */}
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
