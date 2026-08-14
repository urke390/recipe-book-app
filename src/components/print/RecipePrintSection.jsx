import { formatDurationDisplay, getStepDisplayTitle } from '@/lib/stepUtils'

// One recipe's printable content: ingredients (scaled), full step list, and
// parameter targets.
//
// vatScales: one scale factor per actual batch (see lib/production.js). A
// "cycles" production is prepped as several separate batch-sized boxes, not
// one combined batch, so with more than one batch the ingredient table groups
// by (ingredient, quantity-per-batch) and shows "N x amount" instead of a
// single flat total that would silently merge the batches together.
export default function RecipePrintSection({ recipe, steps, parameters, vatScales = [1], volume, pageBreakBefore = false }) {
  const ingredientSteps = steps.filter((s) => s.type === 'ingredient_addition')
  const recipeParams = recipe.parameter_values || []
  const totalScaleFactor = vatScales.reduce((sum, s) => sum + s, 0)
  const stepListScaleFactor = vatScales[0] ?? 1

  const ingredientRows = (() => {
    if (vatScales.length <= 1) {
      return ingredientSteps.map((s) => ({
        key: s.id,
        name: s.ingredient_name || s.title,
        display: s.base_quantity ? `${parseFloat((s.base_quantity * totalScaleFactor).toFixed(2))}${s.unit ? ` ${s.unit}` : ''}` : '',
      }))
    }
    const groups = new Map()
    vatScales.forEach((scaleFactor) => {
      ingredientSteps.forEach((s) => {
        if (!s.base_quantity) return
        const qty = parseFloat((s.base_quantity * scaleFactor).toFixed(2))
        const name = s.ingredient_name || s.title
        const key = `${name}__${s.unit}__${qty}`
        groups.set(key, { name, unit: s.unit, qty, boxes: (groups.get(key)?.boxes || 0) + 1 })
      })
    })
    return [...groups.values()].map((g) => ({ key: `${g.name}-${g.unit}-${g.qty}`, name: g.name, display: `${g.boxes} × ${g.qty} ${g.unit}` }))
  })()

  return (
    <section style={pageBreakBefore ? { pageBreakBefore: 'always' } : undefined} className="print-recipe">
      <header className="mb-6 border-b-2 border-current pb-3">
        <h2 className="text-3xl font-bold">{recipe.name}</h2>
        {recipe.description && <p className="text-base opacity-70 mt-1">{recipe.description}</p>}
        <p className="text-sm opacity-70 mt-1">
          כמות לייצור: <strong>{volume ?? recipe.base_quantity}</strong> {recipe.base_unit} (יחס {totalScaleFactor.toFixed(2)}×{vatScales.length > 1 ? `, ${vatScales.length} אצוות` : ''})
        </p>
      </header>

      {(ingredientRows.length > 0 || recipeParams.length > 0) && (
        <div className={`mb-6 ${ingredientRows.length > 0 && recipeParams.length > 0 ? 'grid grid-cols-2 gap-6' : ''}`}>
          {ingredientRows.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-2">רכיבים</h3>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {ingredientRows.map((row) => (
                    <tr key={row.key} className="border-b border-current/20">
                      <td className="py-1.5 pl-2">{row.name}</td>
                      <td className="py-1.5 text-left font-bold w-32">{row.display}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {recipeParams.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-2">פרמטרים</h3>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {recipeParams.map((pv) => {
                    const param = parameters.find((p) => p.id === pv.parameter_id)
                    if (!param) return null
                    const isSingle = pv.value_type === 'single'
                    return (
                      <tr key={pv.parameter_id} className="border-b border-current/20">
                        <td className="py-1.5 pl-2">{param.name}</td>
                        <td className="py-1.5 text-left font-bold w-28">
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
      )}

      <div>
        <h3 className="text-lg font-bold mb-2">שלבי הכנה</h3>
        {(() => {
          const renderStep = (s) => (
            <li key={s.id}>
              {getStepDisplayTitle(s)}
              {s.type === 'ingredient_addition' && s.base_quantity ? ` — ${parseFloat((s.base_quantity * stepListScaleFactor).toFixed(2))}${s.unit ? ` ${s.unit}` : ''}` : ''}
              {s.type === 'wait_time' && s.duration_minutes ? ` — ${formatDurationDisplay(s.duration_minutes)}` : ''}
              {s.instructions && <span className="opacity-70"> ({s.instructions})</span>}
            </li>
          )
          // Split into two columns (right: 1..half, left: half+1..end) with a
          // divider between them, instead of one long single-column list -
          // frees up page height, which matters for fitting a whole recipe
          // on one printed page.
          const half = Math.ceil(steps.length / 2)
          const rightSteps = steps.slice(0, half)
          const leftSteps = steps.slice(half)
          if (leftSteps.length === 0) {
            return <ol className="text-sm space-y-1.5 list-decimal pr-5">{rightSteps.map(renderStep)}</ol>
          }
          return (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
              <ol className="text-sm space-y-1.5 list-decimal pr-5">{rightSteps.map(renderStep)}</ol>
              <div className="w-px bg-current/20" />
              <ol start={half + 1} className="text-sm space-y-1.5 list-decimal pr-5">
                {leftSteps.map(renderStep)}
              </ol>
            </div>
          )
        })()}
      </div>
    </section>
  )
}
