import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer(onSessionComplete) {
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsToday, setSessionsToday] = useState(0)
  const intervalRef = useRef(null)
  const completedRef = useRef(false)

  const totalSeconds = durationMinutes * 60

  // Reset timer when duration changes (only when not running)
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(durationMinutes * 60)
      completedRef.current = false
    }
  }, [durationMinutes, isRunning])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setIsRunning(false)
            if (!completedRef.current) {
              completedRef.current = true
              setSessionsToday(s => s + 1)
              onSessionComplete(durationMinutes)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning, durationMinutes, onSessionComplete])

  const start = useCallback(() => {
    if (timeLeft === 0) {
      setTimeLeft(durationMinutes * 60)
      completedRef.current = false
    }
    setIsRunning(true)
  }, [timeLeft, durationMinutes])

  const pause = useCallback(() => setIsRunning(false), [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(durationMinutes * 60)
    completedRef.current = false
  }, [durationMinutes])

  const setDuration = useCallback((mins) => {
    setDurationMinutes(mins)
  }, [])

  const progress = 1 - timeLeft / totalSeconds

  return {
    timeLeft,
    isRunning,
    progress,
    durationMinutes,
    sessionsToday,
    start,
    pause,
    reset,
    setDuration,
  }
}
