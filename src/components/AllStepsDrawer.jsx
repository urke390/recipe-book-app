import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { List, Check } from 'lucide-react'
import { STEP_TYPE_LABELS, getStepDisplayTitle } from '@/lib/stepUtils'
import Qty from '@/components/Qty'

export default function AllStepsDrawer({ steps, currentIndex, scaleFactor, onSelectStep }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <List className="w-3.5 h-3.5" />
          כל השלבים
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>שלבי הייצור ({steps.length})</SheetTitle>
        </SheetHeader>
        <div className="space-y-1.5 mt-4">
          {steps.map((step, idx) => {
            const isActive = idx === currentIndex
            const isDone = idx < currentIndex
            return (
              <button
                key={step.id}
                onClick={() => {
                  onSelectStep(idx)
                  setOpen(false)
                }}
                className={`w-full text-right rounded-xl p-3 border transition-all ${
                  isActive ? 'bg-primary text-primary-foreground border-primary shadow-soft' : isDone ? 'bg-success/10 border-success/30 text-success' : 'bg-card border-border hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isActive ? 'bg-white/20' : isDone ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{getStepDisplayTitle(step)}</p>
                    <p className={`text-xs mt-0.5 ${isActive ? 'opacity-70' : 'text-muted-foreground'}`}>
                      {STEP_TYPE_LABELS[step.type]}
                      {step.type === 'ingredient_addition' && step.base_quantity && (
                        <>
                          {' • '}
                          <Qty value={step.base_quantity * (scaleFactor || 1)} unit={step.unit} />
                        </>
                      )}
                      {step.type === 'wait_time' && step.duration_minutes && ` • ${step.duration_minutes} דקות`}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
