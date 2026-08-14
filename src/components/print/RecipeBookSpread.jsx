import { STEP_TYPE_LABELS, formatDurationDisplay, getStepDisplayTitle } from '@/lib/stepUtils'

// Static two-page "open book" spread for a single recipe's print preview -
// no page-flip mechanics (nothing to flip between, it's one recipe), just
// the same paper-page look as BookViewer plus a one-time flip-open entrance
// animation (see .book-open-animation in index.css) so opening the preview
// itself feels like opening a book to this recipe.
export default function RecipeBookSpread({ recipe, steps, parameters }) {
  const ingredientSteps = steps.filter((s) => s.type === 'ingredient_addition')
  const ingredientRows = ingredientSteps.map((s) => ({
    key: s.id,
    name: s.ingredient_name || s.title,
    display: s.base_quantity ? `${s.base_quantity} ${s.unit || ''}`.trim() : '',
  }))
  const recipeParams = recipe.parameter_values || []

  return (
    <div className="flex justify-center py-6 px-2">
      <div className="book-open-animation flex w-full max-w-3xl shadow-[0_12px_32px_hsl(20_35%_14%/0.25)] rounded-sm overflow-hidden" style={{ minHeight: 500 }}>
        <div className="book-page flex-1 border-l border-black/10">
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
        </div>

        <div className="book-page flex-1">
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
        </div>
      </div>
    </div>
  )
}
