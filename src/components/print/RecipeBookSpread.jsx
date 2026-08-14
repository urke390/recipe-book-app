import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { StickyNote, X } from 'lucide-react'
import { db } from '@/api/db'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDurationDisplay, getStepDisplayTitle } from '@/lib/stepUtils'
import Qty from '@/components/Qty'

// Static two-page "open book" spread for a single recipe's print preview -
// no page-flip mechanics (nothing to flip between, it's one recipe), just
// the same paper-page look as BookViewer plus a one-time flip-open entrance
// animation (see .book-open-animation in index.css) so opening the preview
// itself feels like opening a book to this recipe. Also carries the same
// per-recipe notes button as BookViewer, so it's available both from the
// interactive cookbook and from a single recipe's own page.
export default function RecipeBookSpread({ recipe, steps, parameters }) {
  const queryClient = useQueryClient()
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const ingredientSteps = steps.filter((s) => s.type === 'ingredient_addition')
  const ingredientRows = ingredientSteps.map((s) => ({
    key: s.id,
    name: s.ingredient_name || s.title,
    quantity: s.base_quantity,
    unit: s.unit,
  }))
  const recipeParams = recipe.parameter_values || []

  const saveNoteMutation = useMutation({
    mutationFn: (notes) => db.Recipe.update(recipe.id, { notes: notes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      setNoteDialogOpen(false)
    },
  })

  const openNoteDialog = () => {
    setNoteDraft(recipe.notes || '')
    setNoteDialogOpen(true)
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 px-2">
      <div className="relative w-full max-w-3xl">
        <div className="book-stack-edge right" />
        <div className="book-stack-edge left" />
        <button
          onClick={openNoteDialog}
          className="absolute bottom-2 left-1 z-20 p-2 rounded-full bg-card border border-border shadow-soft hover:bg-muted transition-colors"
          title="הערה למתכון"
        >
          <StickyNote className={`w-4 h-4 ${recipe.notes ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>
        <div className="book-open-animation flex flex-col md:flex-row w-full shadow-[0_12px_32px_hsl(20_35%_14%/0.25)] rounded-sm overflow-hidden" style={{ minHeight: 500 }}>
          <div className="book-page page-right flex-1 border-b md:border-b-0 md:border-l border-black/10">
            <div className="book-page-inner">
              <h2 className="font-heading font-bold text-2xl mb-1">{recipe.name}</h2>
              {recipe.description && <p className="text-sm opacity-70 mb-4">{recipe.description}</p>}

              {ingredientRows.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-heading font-semibold text-base mb-2">רכיבים</h3>
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {ingredientRows.map((row) => (
                        <tr key={row.key} className="border-b border-current/10">
                          <td className="py-1 pl-2">{row.name}</td>
                          <td className="py-1 text-left font-medium w-24">
                            <Qty value={row.quantity} unit={row.unit} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {recipeParams.length > 0 && (
                <div>
                  <h3 className="font-heading font-semibold text-base mb-2">פרמטרים</h3>
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {recipeParams.map((pv) => {
                        const param = parameters.find((p) => p.id === pv.parameter_id)
                        if (!param) return null
                        const isSingle = pv.value_type === 'single'
                        return (
                          <tr key={pv.parameter_id} className="border-b border-current/10">
                            <td className="py-1 pl-2">{param.name}</td>
                            <td className="py-1 text-left font-medium w-24">
                              {isSingle ? pv.value : `${pv.value_min ?? '?'}–${pv.value_max ?? '?'}`} {param.unit}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="book-page page-left flex-1">
            <div className="book-page-inner">
              <h3 className="font-heading font-semibold text-base mb-3">שלבי הכנה</h3>
              <ol className="text-sm space-y-2 list-decimal pr-5">
                {steps.map((s) => (
                  <li
                    key={s.id}
                    className={
                      s.type === 'section_header'
                        ? 'list-none font-heading font-bold mt-1'
                        : s.type === 'ingredient_addition'
                          ? 'list-none pr-3'
                          : undefined
                    }
                    style={s.type === 'section_header' || s.type === 'ingredient_addition' ? { counterIncrement: 'list-item 0' } : undefined}
                  >
                    {s.type === 'ingredient_addition' && '• '}
                    {getStepDisplayTitle(s)}
                    {s.type === 'ingredient_addition' && s.base_quantity && (
                      <>
                        {' — '}
                        <Qty value={s.base_quantity} unit={s.unit} />
                      </>
                    )}
                    {s.type === 'wait_time' && s.duration_minutes ? ` — ${formatDurationDisplay(s.duration_minutes)}` : ''}
                    {s.instructions && <span className="opacity-70"> ({s.instructions})</span>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {recipe.notes && (
        <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-3 text-sm whitespace-pre-wrap shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground mb-1">הערה על {recipe.name}</p>
          {recipe.notes}
        </div>
      )}

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>הערה על "{recipe.name}"</DialogTitle>
          </DialogHeader>
          <textarea
            autoFocus
            dir="rtl"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="הערה אישית על המתכון הזה..."
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
          <DialogFooter className="gap-2">
            {recipe.notes && (
              <Button variant="outline" className="gap-1.5" onClick={() => saveNoteMutation.mutate('')} disabled={saveNoteMutation.isPending}>
                <X className="w-3.5 h-3.5" />
                מחק הערה
              </Button>
            )}
            <Button onClick={() => saveNoteMutation.mutate(noteDraft)} disabled={saveNoteMutation.isPending}>
              {saveNoteMutation.isPending ? 'שומר...' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
