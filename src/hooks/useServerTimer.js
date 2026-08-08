import { useEffect, useState, useRef } from 'react'
import { playAlarmById, getAlarmSoundId } from '@/components/SoundSettings'

// Derives the countdown purely from the server's step_started_at +
// step_duration_seconds - never counts locally. Any device rendering the same
// session computes the same remaining value, and a refresh/sleep/second tab
// can't desync it because there is no local timer state to lose.
export function useServerTimer(stepStartedAt, stepDurationSeconds) {
  const [remaining, setRemaining] = useState(null)
  const alarmFiredRef = useRef(false)
  const warningFiredRef = useRef(false)

  useEffect(() => {
    alarmFiredRef.current = false
    warningFiredRef.current = false
    if (!stepStartedAt || !stepDurationSeconds) {
      setRemaining(null)
      return
    }
    const startedAtMs = new Date(stepStartedAt).getTime()
    const endAtMs = startedAtMs + stepDurationSeconds * 1000

    const tick = () => {
      const rem = Math.max(0, Math.round((endAtMs - Date.now()) / 1000))
      setRemaining(rem)

      if (rem <= 60 && rem > 55 && !warningFiredRef.current) {
        warningFiredRef.current = true
        playAlarmById('beep')
      }
      if (rem <= 0 && !alarmFiredRef.current) {
        alarmFiredRef.current = true
        playAlarmById(getAlarmSoundId())
      }
    }

    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [stepStartedAt, stepDurationSeconds])

  return remaining
}

// Computes the DB fields to write when advancing to a given step - the sole
// place a timer "starts": a wait_time step gets a fresh server timestamp
// (used as a single countdown target); anything else clears it.
export function stepTimerFields(step) {
  if (step?.type === 'wait_time') {
    return { step_started_at: new Date().toISOString(), step_duration_seconds: (step.duration_minutes || 1) * 60, notified_at: null }
  }
  return { step_started_at: null, step_duration_seconds: null, notified_at: null }
}
