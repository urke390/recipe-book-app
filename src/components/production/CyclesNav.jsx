import { Check } from 'lucide-react'

export default function CyclesNav({ totalVats, currentVat, completedVats = [], onMarkComplete }) {
  if (!totalVats || totalVats <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-2 bg-muted/40 border-b border-border overflow-x-auto">
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0 ml-1">מחזורים:</span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalVats }, (_, i) => {
          const vatNum = i + 1
          const isCurrent = vatNum === currentVat
          const isDone = completedVats.includes(vatNum)
          const isPast = vatNum < currentVat && !isDone
          return (
            <div key={vatNum} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onMarkComplete && onMarkComplete(vatNum)}
                title={isDone ? `מחזור ${vatNum} הושלם` : `סמן מחזור ${vatNum} כהושלם`}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isDone
                    ? 'bg-success border-success text-success-foreground'
                    : isCurrent
                    ? 'bg-primary border-primary text-primary-foreground shadow-md scale-110'
                    : isPast
                    ? 'bg-muted border-border text-muted-foreground hover:border-success hover:bg-success/10'
                    : 'bg-card border-border text-muted-foreground opacity-50'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : vatNum}
              </button>
              {i < totalVats - 1 && <div className={`w-3 h-0.5 ${vatNum < currentVat || isDone ? 'bg-success' : 'bg-border'}`} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
