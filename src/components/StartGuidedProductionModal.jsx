import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/api/db'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Rocket } from 'lucide-react'
import { stepTimerFields } from '@/hooks/useServerTimer'

function BatchIcon({ count, active }) {
  const color = active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
  if (count === 1) {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="14" width="28" height="26" rx="4" stroke={color} strokeWidth="2.5" fill="none" />
        <path d="M14 14V11a2 2 0 012-2h16a2 2 0 012 2v3" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="22" x2="38" y2="22" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="24" y1="40" x2="24" y2="46" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="17" y1="46" x2="31" y2="46" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none">
      {[0, 1, 2].map((i) => {
        const x = 2 + i * 18
        return (
          <g key={i}>
            <rect x={x} y="10" width="15" height="22" rx="3" stroke={color} strokeWidth="2" fill="none" />
            <path d={`M${x + 2} 10V8a1.5 1.5 0 011.5-1.5h8a1.5 1.5 0 011.5 1.5v2`} stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line x1={x} y1="16" x2={x + 15} y2="16" stroke={color} strokeWidth="1" strokeDasharray="2 1.5" />
            <line x1={x + 7} y1="32" x2={x + 7} y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line x1={x + 3} y1="37" x2={x + 11} y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </g>
        )
      })}
    </svg>
  )
}

// recipe: { id, name, base_quantity, base_unit } - always a concrete recipe,
// reached only from RecipeView's "התחל ייצור מודרך" button. onClose(session)
// is called with the created session (undefined if cancelled) so the caller
// can navigate to the runner.
export default function StartGuidedProductionModal({ recipe, onClose }) {
  const queryClient = useQueryClient()
  const [volume, setVolume] = useState(recipe.base_quantity || 4)
  const [mode, setMode] = useState('scaled')

  const baseQuantity = recipe.base_quantity || 4
  const baseUnit = recipe.base_unit || 'מנות'

  const fullCycles = Math.floor(volume / baseQuantity)
  const remainder = Math.round((volume % baseQuantity) * 100) / 100
  const totalCycles = fullCycles + (remainder > 0 ? 1 : 0)

  const changeVolume = (delta) => setVolume((v) => Math.max(1, v + delta))

  const createMutation = useMutation({
    mutationFn: async () => {
      // A wait_time step needs its server timestamp set the moment
      // production reaches it - normally that's navigateMutation's job when
      // advancing between steps, but the very first step is never "advanced
      // into", so it has to happen here too.
      const firstSteps = await db.RecipeStep.filter({ recipe_id: recipe.id }, 'order')
      const base = {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        current_step_index: 0,
        status: 'active',
        started_at: new Date().toISOString(),
        steps_completed: [],
        ...stepTimerFields(firstSteps[0]),
      }
      return mode === 'scaled'
        ? db.ProductionSession.create({
            ...base,
            production_mode: 'scaled',
            vat_number: 1,
            vat_volume: volume,
            scale_factor: volume / baseQuantity,
            total_vats: 1,
          })
        : db.ProductionSession.create({
            ...base,
            production_mode: 'cycles',
            vat_number: 1,
            vat_volume: baseQuantity,
            scale_factor: 1,
            total_vats: totalCycles,
            total_production_volume: volume,
          })
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions-count'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onClose(session)
    },
  })

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">בחר כמות לייצור</DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground -mt-2">{recipe.name}</p>
        <p className="text-center text-xs text-muted-foreground">כמות כללית לייצור ({baseUnit})</p>

        <div className="flex items-center justify-center gap-4 my-2">
          <button onClick={() => changeVolume(-baseQuantity)} className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all">
            <Minus className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
              onBlur={(e) => {
                if (!e.target.value || parseFloat(e.target.value) <= 0) setVolume(baseQuantity)
              }}
              className="w-full text-center text-5xl font-bold bg-transparent border-none outline-none text-foreground tabular-nums"
            />
          </div>
          <button onClick={() => changeVolume(baseQuantity)} className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="border-t border-border my-2" />
        <p className="text-center text-sm font-semibold">שיטת ייצור</p>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            onClick={() => setMode('scaled')}
            className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${mode === 'scaled' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          >
            <BatchIcon count={1} active={mode === 'scaled'} />
            <p className="text-xs font-semibold text-center leading-tight">ייצור באצווה אחת</p>
          </button>
          <button
            onClick={() => setMode('cycles')}
            className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${mode === 'cycles' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          >
            <BatchIcon count={3} active={mode === 'cycles'} />
            <p className="text-xs font-semibold text-center leading-tight">חלוקה למספר אצוות</p>
          </button>
        </div>

        {mode === 'cycles' && volume > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 text-xs text-primary text-center">
            {totalCycles} אצוות — {fullCycles} מלאות ({baseQuantity} {baseUnit}){remainder > 0 ? ` + חלקית (${remainder} ${baseUnit})` : ''}
          </div>
        )}

        <Button className="w-full h-12 text-base font-semibold mt-1 gap-2" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Rocket className="w-4 h-4" />
          {createMutation.isPending ? 'שומר...' : 'התחל ייצור'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
