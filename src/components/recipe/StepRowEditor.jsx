import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/api/db'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, GripVertical } from 'lucide-react'
import { STEP_TYPE_COLORS } from '@/lib/stepUtils'

const TIME_UNITS = [
  { value: 'minutes', label: 'דקות', multiplier: 1 },
  { value: 'hours', label: 'שעות', multiplier: 60 },
  { value: 'days', label: 'ימים', multiplier: 1440 },
]

function decomposeDuration(minutes) {
  if (!minutes) return { value: '', unit: 'minutes' }
  if (minutes % 1440 === 0) return { value: String(minutes / 1440), unit: 'days' }
  if (minutes % 60 === 0) return { value: String(minutes / 60), unit: 'hours' }
  return { value: String(minutes), unit: 'minutes' }
}

// Ingredients are free text (just a name) - no category/ingredient catalog
// lookup. That catalog (categories/ingredients tables) is a leftover from
// cheese-app's structured ingredient list; this app's recipes were imported
// with free-text ingredient names from the start, and picking from a
// pre-built list added friction with no benefit here.
export default function StepRowEditor({ step, stepIndex, recipeId, onSave, onClose, dragHandleProps }) {
  const [type, setType] = useState(step?.type || 'action')
  const [title, setTitle] = useState(step?.title || '')
  const [ingredientName, setIngredientName] = useState(step?.ingredient_name || '')
  const [baseQuantity, setBaseQuantity] = useState(step?.base_quantity ?? '')
  const [unit, setUnit] = useState(step?.unit || '')
  const initDur = decomposeDuration(step?.duration_minutes)
  const [durationValue, setDurationValue] = useState(initDur.value)
  const [durationUnit, setDurationUnit] = useState(initDur.unit)
  const [isFinalStep, setIsFinalStep] = useState(step?.is_final_step || false)
  const [instructions, setInstructions] = useState(step?.instructions || '')

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => db.Unit.list('order') })

  const durationMinutes = durationValue ? parseFloat(durationValue) * (TIME_UNITS.find((u) => u.value === durationUnit)?.multiplier || 1) : null

  const isValid = () => {
    if (type === 'ingredient_addition') return !!ingredientName.trim() && baseQuantity !== ''
    if (type === 'wait_time') return durationValue && parseFloat(durationValue) > 0
    if (type === 'action') return !!title
    if (type === 'section_header') return !!title
    return false
  }

  const handleSave = () => {
    onSave({
      recipe_id: recipeId,
      type,
      title: title || null,
      instructions: instructions || null,
      ingredient_id: null,
      ingredient_name: type === 'ingredient_addition' ? ingredientName.trim() : null,
      category_name: null,
      base_quantity: type === 'ingredient_addition' ? parseFloat(baseQuantity) : null,
      unit: type === 'ingredient_addition' ? unit || null : null,
      duration_minutes: type === 'wait_time' ? durationMinutes : null,
      is_final_step: type === 'action' ? isFinalStep : false,
    })
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-border bg-card shadow-soft">
      <div className={`mt-1.5 text-muted-foreground/40 cursor-grab flex-shrink-0 ${dragHandleProps ? '' : 'invisible'}`} {...(dragHandleProps || {})}>
        <GripVertical className="w-4 h-4" />
      </div>

      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1 bg-secondary text-secondary-foreground">
        {stepIndex != null ? stepIndex + 1 : ''}
      </span>

      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className={`h-6 text-xs px-2 rounded-full border font-medium w-auto shrink-0 focus:ring-0 ${STEP_TYPE_COLORS[type]}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ingredient_addition">הוספת רכיב</SelectItem>
            <SelectItem value="wait_time">זמן המתנה</SelectItem>
            <SelectItem value="action">פעולה</SelectItem>
            <SelectItem value="section_header">כותרת משנה</SelectItem>
          </SelectContent>
        </Select>

        {type === 'ingredient_addition' && (
          <>
            <Input value={ingredientName} onChange={(e) => setIngredientName(e.target.value)} className="h-7 text-sm flex-1 min-w-24 border-dashed" placeholder="שם הרכיב..." />
            <Input type="number" value={baseQuantity} onChange={(e) => setBaseQuantity(e.target.value)} className="h-7 text-sm w-16 border-dashed" placeholder="כמות" />
            <Select value={unit || 'none'} onValueChange={(v) => setUnit(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-7 text-sm w-20 border-dashed">
                <SelectValue placeholder="יחידה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {type === 'wait_time' && (
          <>
            <Input type="number" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className="h-7 text-sm w-16 border-dashed" placeholder="משך" />
            <Select value={durationUnit} onValueChange={setDurationUnit}>
              <SelectTrigger className="h-7 text-sm w-20 border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-sm flex-1 min-w-24 border-dashed" placeholder="בשביל מה ממתינים?" />
          </>
        )}

        {type === 'action' && (
          <>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-sm flex-1 min-w-24 border-dashed" placeholder="שם הפעולה..." />
            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap cursor-pointer flex-shrink-0">
              <input type="checkbox" checked={isFinalStep} onChange={(e) => setIsFinalStep(e.target.checked)} className="w-3 h-3 accent-primary" />
              פעולה אחרונה בלבד
            </label>
          </>
        )}

        {type === 'section_header' && <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-sm flex-1 min-w-24 border-dashed" placeholder="לדוגמה: לציפוי..." />}

        {type !== 'section_header' && (
          <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} className="h-7 text-sm w-full border-dashed mt-1" placeholder="הוראות נוספות (אופציונלי)..." />
        )}
      </div>

      <div className="flex gap-0.5 flex-shrink-0">
        <button onClick={handleSave} disabled={!isValid()} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-success/10 text-success disabled:opacity-30 disabled:text-muted-foreground">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
