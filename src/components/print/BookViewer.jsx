import { useMemo, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft, BookOpen } from 'lucide-react'
import { STEP_TYPE_LABELS, formatDurationDisplay, getStepDisplayTitle } from '@/lib/stepUtils'

const FLIP_MS = 550

function IngredientsPage({ recipe, ingredientRows, recipeParams, parameters }) {
  return (
    <div className="book-page-inner">
      <h2 className="font-heading font-bold text-2xl mb-1">{recipe.name}</h2>
      {recipe.description && <p className="text-sm opacity-70 mb-3">{recipe.description}</p>}
      <p className="text-xs opacity-60 mb-4">
        כמות בסיס: {recipe.base_quantity} {recipe.base_unit}
      </p>

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
            <span className="opacity-50 text-xs">[{STEP_TYPE_LABELS[s.type]}]</span> {getStepDisplayTitle(s)}
            {s.type === 'ingredient_addition' && s.base_quantity ? ` — ${s.base_quantity}${s.unit ? ` ${s.unit}` : ''}` : ''}
            {s.type === 'wait_time' && s.duration_minutes ? ` — ${formatDurationDisplay(s.duration_minutes)}` : ''}
            {s.instructions && <span className="opacity-70"> ({s.instructions})</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ingredientRowsFor(steps) {
  return steps
    .filter((s) => s.type === 'ingredient_addition')
    .map((s) => ({
      key: s.id,
      name: s.ingredient_name || s.title,
      display: s.base_quantity ? `${s.base_quantity} ${s.unit || ''}`.trim() : '',
    }))
}

function Spread({ recipe, steps, parameters }) {
  return (
    <div className="flex w-full h-full">
      <div className="book-page page-right flex-1 border-l border-black/10">
        <IngredientsPage recipe={recipe} ingredientRows={ingredientRowsFor(steps)} recipeParams={recipe.parameter_values || []} parameters={parameters} />
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
// Mechanic: only the single page closest to the spine actually turns - not
// the whole spread as one rigid card - hinged at its own spine edge
// (transform-origin), so it visually sweeps across and over the opposite
// page as it rotates, the way a real leaf turns. The other page never
// moves. Base content underneath is already updated to the target recipe
// before the rotation starts, so once the turning page passes 90° and
// disappears (backface-visibility: hidden), the next spread is already
// sitting there waiting.
export default function BookViewer({ recipes, stepsByRecipe, parameters }) {
  const [opened, setOpened] = useState(false)
  const [index, setIndex] = useState(0)
  const [turning, setTurning] = useState(null) // { dir, recipe, steps, rotated }
  const timerRef = useRef(null)

  const total = recipes.length

  const flip = (dir) => {
    if (turning || total === 0) return
    const fromIndex = index
    const nextIndex = dir === 'next' ? (index + 1) % total : (index - 1 + total) % total
    const fromRecipe = recipes[fromIndex]
    setTurning({ dir, recipe: fromRecipe, steps: stepsByRecipe[fromRecipe.id] || [], rotated: false })
    setIndex(nextIndex)
    requestAnimationFrame(() => requestAnimationFrame(() => setTurning((t) => (t ? { ...t, rotated: true } : t))))
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setTurning(null), FLIP_MS)
  }

  const current = recipes[index]

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-full max-w-3xl" style={{ height: 560, perspective: 2000 }}>
        {!opened ? (
          <>
            <div className="book-stack-edge right" />
            <div className="book-stack-edge left" />
            <button onClick={() => setOpened(true)} className="book-page w-full h-full block relative shadow-[0_12px_32px_hsl(20_35%_14%/0.25)] rounded-sm">
              <div className="book-page-inner book-cover">
                <BookOpen className="w-12 h-12 mb-4 opacity-80" />
                <h1 className="font-heading font-bold text-3xl text-center">ספר מתכונים ביתי</h1>
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
            <div className="absolute inset-0 shadow-[0_12px_32px_hsl(20_35%_14%/0.25)] rounded-sm overflow-hidden">
              {current && <Spread recipe={current} steps={stepsByRecipe[current.id] || []} parameters={parameters} />}
            </div>
            {turning &&
              (turning.dir === 'next' ? (
                <div
                  className="book-page page-left absolute inset-y-0 left-0 shadow-[4px_0_12px_hsl(20_35%_14%/0.3)]"
                  style={{
                    width: '50%',
                    transformOrigin: 'right center',
                    backfaceVisibility: 'hidden',
                    transform: `rotateY(${turning.rotated ? -180 : 0}deg)`,
                    transition: `transform ${FLIP_MS}ms ease-in-out`,
                  }}
                >
                  <StepsPage steps={turning.steps} />
                </div>
              ) : (
                <div
                  className="book-page page-right absolute inset-y-0 right-0 shadow-[-4px_0_12px_hsl(20_35%_14%/0.3)]"
                  style={{
                    width: '50%',
                    transformOrigin: 'left center',
                    backfaceVisibility: 'hidden',
                    transform: `rotateY(${turning.rotated ? 180 : 0}deg)`,
                    transition: `transform ${FLIP_MS}ms ease-in-out`,
                  }}
                >
                  <IngredientsPage recipe={turning.recipe} ingredientRows={ingredientRowsFor(turning.steps)} recipeParams={turning.recipe.parameter_values || []} parameters={parameters} />
                </div>
              ))}
          </>
        )}
      </div>

      {opened && total > 0 && (
        <div className="flex items-center gap-4">
          <button onClick={() => flip('next')} className="p-2 rounded-full bg-card border border-border shadow-soft hover:bg-muted transition-colors" title="הדף הבא">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span dir="ltr" className="text-xs text-muted-foreground tabular-nums">
            {index + 1} / {total}
          </span>
          <button onClick={() => flip('prev')} className="p-2 rounded-full bg-card border border-border shadow-soft hover:bg-muted transition-colors" title="הדף הקודם">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
