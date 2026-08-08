import { useLocation } from 'react-router-dom'
import { useRealtimeList } from '@/hooks/useRealtime'
import { useServerTimer } from '@/hooks/useServerTimer'

// Mounts one silent timer per active session so the alarm sound fires no
// matter which page is open - previously useServerTimer only ran for
// whichever session ProductionRunner happened to be showing, so an expiring
// timer on a DIFFERENT production went unnoticed while the app was open
// (push notifications still cover the app being closed entirely).
function SessionAlarm({ session }) {
  useServerTimer(session.step_started_at, session.step_duration_seconds)
  return null
}

export default function GlobalTimerWatcher() {
  const location = useLocation()
  const { rows: activeSessions } = useRealtimeList('production_sessions', 'status', 'active')

  // The currently-open production page already runs its own useServerTimer
  // for its session - skip it here to avoid firing the same alarm twice.
  const viewedMatch = location.pathname.match(/^\/production\/([^/]+)/)
  const viewedSessionId = viewedMatch?.[1]

  const watched = activeSessions.filter((s) => s.id !== viewedSessionId && s.step_started_at && s.step_duration_seconds)

  return (
    <>
      {watched.map((s) => (
        <SessionAlarm key={s.id} session={s} />
      ))}
    </>
  )
}
