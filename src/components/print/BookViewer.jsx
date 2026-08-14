import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronLeft, BookOpen, Search, StickyNote, X } from 'lucide-react'
import { db } from '@/api/db'
import { formatDurationDisplay, getStepDisplayTitle } from '@/lib/stepUtils'
import { useBranding } from '@/hooks/useBranding'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const FLIP_MS = 550

function IngredientsPage({ recipe, ingredientRows, recipeParams, parameters }) {
  return (
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
                  <td className="py-1 text-left font-medium w-24">{row.display}</td>
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
  )
}

function StepsPage({ steps }) {
  return (
    <div className="book-page-inner">
      <h3 className="font-heading font-semibold text-base mb-3">שלבי הכנה</h3>
      <ol className="text-sm space-y-2 list-decimal pr-5">
        {steps.map((s) => (
          <li key={s.id}>
            {getStepDisplayTitle(s)}
            {s.type === 'ingredient_addition' && s.base_quantity ? ` — ${s.base_quantity}${s.unit ? ` ${s.unit}` : ''}` : ''}
            {s.type === 'wait_time' && s.duration_minutes ? ` — ${formatDurationDisplay(s.duration_minutes)}` : ''}
            {s.instructions && <span className="opacity-70"> ({s.instructions})</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

function Spread({ recipe, steps, parameters }) {
  const ingredientSteps = steps.filter((s) => s.type === 'ingredient_addition')
  const ingredientRows = ingredientSteps.map((s) => ({
    key: s.id,
    name: s.ingredient_name || s.title,
    display: s.base_quantity ? `${s.base_quantity} ${s.unit || ''}`.trim() : '',
  }))
  return (
    <div className="flex flex-col md:flex-row w-full h-full">
      <div className="book-page page-right flex-1 border-b md:border-b-0 md:border-l border-black/10">
        <IngredientsPage recipe={recipe} ingredientRows={ingredientRows} recipeParams={recipe.parameter_values || []} parameters={parameters} />
      </div>
      <div className="book-page page-left flex-1">
        <StepsPage steps={steps} />
      </div>
    </div>
  )
}

// Page-turn effect built entirely with React state + a CSS rotateY
// transition (no imperative DOM library) - react-pageflip's vanilla-JS
// engine directly manipulates DOM nodes it doesn't own, which conflicts
// with React 18 StrictMode's double-mount and crashes ("insertBefore ...
// not a child of this node"). This trades away drag-to-flip/corner-curl for
// something fully under React's control and safe with StrictMode.
//
// Mechanic: the outgoing spread sits in an absolutely-positioned overlay
// exactly on top of the (already-updated) base spread underneath, then
// rotates away around the vertical center spine; backface-visibility hides
// it past 90°, revealing the new spread that was underneath all along.
export default function BookViewer({ recipes, stepsByRecipe, parameters }) {
  const { branding } = useBranding()
  const queryClient = useQueryClient()
  const [opened, setOpened] = useState(false)
  const [index, setIndex] = useState(0)
  const [overlay, setOverlay] = useState(null) // { index, rotated }
  const [search, setSearch] = useState('')
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const timerRef = useRef(null)

  const total = recipes.length

  const flip = (dir) => {
    if (overlay || total === 0) return
    const nextIndex = dir === 'next' ? (index + 1) % total : (index - 1 + total) % total
    setOverlay({ index, angle: dir === 'next' ? -180 : 180, rotated: false })
    setIndex(nextIndex)
    requestAnimationFrame(() => requestAnimationFrame(() => setOverlay((o) => (o ? { ...o, rotated: true } : o))))
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setOverlay(null), FLIP_MS)
  }

  const current = recipes[index]

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return recipes.map((r, i) => ({ ...r, __index: i })).filter((r) => r.name?.toLowerCase().includes(q))
  }, [recipes, search])

  const jumpTo = (i) => {
    setOpened(true)
    setIndex(i)
    setSearch('')
  }

  const saveNoteMutation = useMutation({
    mutationFn: (notes) => db.Recipe.update(current.id, { notes: notes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      setNoteDialogOpen(false)
    },
  })

  const openNoteDialog = () => {
    setNoteDraft(current?.notes || '')
    setNoteDialogOpen(true)
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-full max-w-3xl">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מתכון בספר..."
          className="w-full h-9 rounded-lg border border-border bg-card pr-9 pl-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-20 top-full inset-x-0 mt-1 bg-card border border-border rounded-lg shadow-card-hover max-h-56 overflow-y-auto">
            {searchResults.map((r) => (
              <button key={r.id} onClick={() => jumpTo(r.__index)} className="w-full text-right px-3 py-2 text-sm hover:bg-secondary transition-colors">
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full max-w-3xl h-[680px] md:h-[560px]" style={{ perspective: 2000 }}>
        {!opened ? (
          <>
            <div className="book-stack-edge right" />
            <div className="book-stack-edge left" />
            <button onClick={() => setOpened(true)} className="book-page w-full h-full block relative shadow-[0_12px_32px_hsl(20_35%_14%/0.25)] rounded-sm">
              <div className="book-page-inner book-cover">
                <BookOpen className="w-12 h-12 mb-4 opacity-80" />
                <h1 className="font-heading font-bold text-3xl text-center">{branding.title}</h1>
                <p className="text-sm opacity-80 mt-3">לחץ לפתיחה</p>
              </div>
            </button>
          </>
        ) : total === 0 ? (
          <div className="book-page w-full h-full">
            <div className="book-page-inner book-cover">אין מתכונים עדיין</div>
          </div>
        ) : (
          <>
            <div className="book-stack-edge right" />
            <div className="book-stack-edge left" />
            <button
              onClick={openNoteDialog}
              className="absolute bottom-2 left-1 z-20 p-2 rounded-full bg-card border border-border shadow-soft hover:bg-muted transition-colors"
              title="הערה למתכון"
            >
              <StickyNote className={`w-4 h-4 ${current?.notes ? 'text-primary' : 'text-muted-foreground'}`} />
            </button>
            <div className="absolute inset-0 shadow-[0_12px_32px_hsl(20_35%_14%/0.25)] rounded-sm overflow-hidden">
              {current && <Spread recipe={current} steps={stepsByRecipe[current.id] || []} parameters={parameters} />}
            </div>
            {overlay && recipes[overlay.index] && (
              <div
                className="absolute inset-0 shadow-[0_12px_32px_hsl(20_35%_14%/0.25)] rounded-sm overflow-hidden"
                style={{
                  transformOrigin: 'center',
                  backfaceVisibility: 'hidden',
                  transform: `rotateY(${overlay.rotated ? overlay.angle : 0}deg)`,
                  transition: `transform ${FLIP_MS}ms ease-in-out`,
                }}
              >
                <Spread recipe={recipes[overlay.index]} steps={stepsByRecipe[recipes[overlay.index].id] || []} parameters={parameters} />
              </div>
            )}
          </>
        )}
      </div>

      {opened && total > 0 && (
        <div className="flex items-center gap-4">
          <button onClick={() => flip('prev')} className="p-2 rounded-full bg-card border border-border shadow-soft hover:bg-muted transition-colors" title="הדף הקודם">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span dir="ltr" className="text-xs text-muted-foreground tabular-nums">
            {index + 1} / {total}
          </span>
          <button onClick={() => flip('next')} className="p-2 rounded-full bg-card border border-border shadow-soft hover:bg-muted transition-colors" title="הדף הבא">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {opened && current?.notes && (
        <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-3 text-sm whitespace-pre-wrap shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground mb-1">הערה על {current.name}</p>
          {current.notes}
        </div>
      )}

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>הערה על "{current?.name}"</DialogTitle>
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
            {current?.notes && (
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
