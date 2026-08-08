// Presentational analog countdown. `remaining`/`total` are in seconds; the
// caller (useServerTimer) derives them from the server's step_started_at.
export default function TimerDisplay({ remaining, total, inline = false }) {
  if (remaining == null || total == null) return null

  const progress = total > 0 ? remaining / total : 0
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isWarning = remaining <= 60 && remaining > 0

  const faceColor = isWarning ? '#fff1f2' : '#f0f9ff'
  const rimColor = isWarning ? '#fca5a5' : '#93c5fd'
  const handColor = isWarning ? '#dc2626' : '#1d4ed8'
  const accentColor = isWarning ? '#ef4444' : '#2563eb'

  const minuteAngle = (1 - progress) * 360 - 90
  const secondAngle = (secs / 60) * 360 - 90

  const R = 44
  const CIRCUM = 2 * Math.PI * R
  const dashOffset = CIRCUM * (1 - progress)

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
    const isMajor = i % 3 === 0
    const r1 = isMajor ? 38 : 40
    const r2 = 44
    return { x1: 64 + r1 * Math.cos(angle), y1: 64 + r1 * Math.sin(angle), x2: 64 + r2 * Math.cos(angle), y2: 64 + r2 * Math.sin(angle), isMajor }
  })

  const handEnd = (angleDeg, length) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: 64 + length * Math.cos(rad), y: 64 + length * Math.sin(rad) }
  }
  const minEnd = handEnd(minuteAngle, 26)
  const secEnd = handEnd(secondAngle, 34)

  const clock = (
    <svg width={inline ? 120 : 128} height={inline ? 120 : 128} viewBox="0 0 128 128" className="flex-shrink-0">
      <circle cx="64" cy="64" r="58" fill="none" stroke={rimColor} strokeWidth="2" opacity="0.4" />
      <circle cx="64" cy="64" r="54" fill={faceColor} stroke={rimColor} strokeWidth="3" />
      <circle cx="64" cy="64" r={R} fill="none" stroke={rimColor} strokeWidth="7" opacity="0.35" />
      <circle
        cx="64"
        cy="64"
        r={R}
        fill="none"
        stroke={accentColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={CIRCUM}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
        opacity="0.85"
      />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={handColor} strokeWidth={t.isMajor ? 2.5 : 1.5} strokeLinecap="round" opacity={t.isMajor ? 0.7 : 0.35} />
      ))}
      <line x1="64" y1="64" x2={minEnd.x} y2={minEnd.y} stroke={handColor} strokeWidth="3.5" strokeLinecap="round" style={{ transition: 'all 1s linear' }} />
      <line x1="64" y1="64" x2={secEnd.x} y2={secEnd.y} stroke={accentColor} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <circle cx="64" cy="64" r="4" fill={handColor} />
      <circle cx="64" cy="64" r="2" fill={faceColor} />
      <text x="64" y="96" textAnchor="middle" fontSize="12" fontWeight="bold" fontFamily="monospace" fill={handColor} opacity="0.85">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </text>
    </svg>
  )

  if (inline) return clock

  return (
    <div className={`mx-4 mb-4 rounded-xl p-4 border flex items-center gap-5 ${isWarning ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      {clock}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-base ${isWarning ? 'text-red-600' : 'text-blue-700'}`}>{isWarning ? '⚠️ פחות מדקה נותרה!' : '⏳ המתנה בתהליך'}</p>
        <p className={`text-sm mt-0.5 ${isWarning ? 'text-red-500' : 'text-blue-600'}`}>{mins > 0 ? `נותרו ${mins} דק' ו-${secs} שנ'` : `נותרו ${secs} שניות`}</p>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: isWarning ? '#fca5a5' : '#93c5fd' }}>
          <div className="h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress * 100}%`, background: isWarning ? '#ef4444' : '#2563eb' }} />
        </div>
      </div>
    </div>
  )
}
