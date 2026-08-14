import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/api/db'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Rocket } from 'lucide-react'
import { stepTimerFields } from '@/hooks/useServerTimer'

// recipe: { id, name } - always a concrete recipe, reached only from
// RecipeView's "התחל ייצור מודרך" button. onClose(session) is called with
// the created session (undefined if cancelled) so the caller can navigate
// to the runner.
//
// No batch/cycles picker - a recipe's base_quantity is always 1 (the recipe
// as written), so starting production is just "how many times to make it";
// that number *is* the scale factor.
export default function StartGuidedProductionModal({ recipe, onClose }) {
  const queryClient = useQueryClient()
  const [multiplier, setMultiplier] = useState(1)

  const changeMultiplier = (delta) => setMultiplier((v) => Math.max(0.5, Math.round((v + delta) * 100) / 100))

  const createMutation = useMutation({
    mutationFn: async () => {
      // A wait_time step needs its server timestamp set the moment
      // production reaches it - normally that's navigateMutation's job when
      // advancing between steps, but the very first step is never "advanced
      // into", so it has to happen here too.
      const firstSteps = await db.RecipeStep.filter({ recipe_id: recipe.id }, 'order')
      return db.ProductionSession.create({
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        current_step_index: 0,
        status: 'active',
        started_at: new Date().toISOString(),
        steps_completed: [],
        production_mode: 'scaled',
        vat_number: 1,
        vat_volume: multiplier,
        scale_factor: multiplier,
        total_vats: 1,
        ...stepTimerFields(firstSteps[0]),
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
          <DialogTitle className="text-center text-lg">כמה פעמים להכין?</DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground -mt-2">{recipe.name}</p>

        <div className="flex items-center justify-center gap-4 my-2">
          <button onClick={() => changeMultiplier(-1)} className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all">
            <Minus className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <input
              type="number"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value) || 0)}
              onBlur={(e) => {
                if (!e.target.value || parseFloat(e.target.value) <= 0) setMultiplier(1)
              }}
              className="w-full text-center text-5xl font-bold bg-transparent border-none outline-none text-foreground tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">{multiplier === 1 ? 'כמות המתכון כפי שנכתב' : `${multiplier}× כמות המתכון`}</p>
          </div>
          <button onClick={() => changeMultiplier(1)} className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <Button className="w-full h-12 text-base font-semibold mt-1 gap-2" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Rocket className="w-4 h-4" />
          {createMutation.isPending ? 'שומר...' : 'התחל ייצור'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
