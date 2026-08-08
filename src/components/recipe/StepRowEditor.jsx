import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/api/db'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, GripVertical } from 'lucide-react'
import { STEP_TYPE_COLORS, UNITS } from '@/lib/stepUtils'

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

export default function StepRowEditor({ step, stepIndex, recipeId, onSave, onClose, dragHandleProps }) {
  const [type, setType] = useState(step?.type || 'action')
  const [title, setTitle] = useState(step?.title || '')
  const [categoryId, setCategoryId] = useState('')
  const [ingredientId, setIngredientId] = useState(step?.ingredient_id || '')
  const [ingredientName, setIngredientName] = useState(step?.ingredient_name || '')
  const [categoryName, setCategoryName] = useState(step?.category_name || '')
  const [baseQuantity, setBaseQuantity] = useState(step?.base_quantity ?? '')
  const [unit, setUnit] = useState(step?.unit || 'גרם')
  const initDur = decomposeDuration(step?.duration_minutes)
  const [durationValue, setDurationValue] = useState(initDur.value)
  const [durationUnit, setDurationUnit] = useState(initDur.unit)
  const [isFinalStep, setIsFinalStep] = useState(step?.is_final_step || false)
  const [instructions, setInstructions] = useState(step?.instructions || '')

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => db.Category.list('name') })
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', categoryId],
    queryFn: () => db.Ingredient.filter({ category_id: categoryId }),
    enabled: !!categoryId,
  })

  // Resolve the initial category from the step's stored category_name (we only persist the name, not the id)
  useEffect(() => {
    if (step?.category_name && categories.length && !categoryId) {
      const match = categories.find((c) => c.name === step.category_name)
      if (match) setCategoryId(match.id)
    }
  }, [categories, step?.category_name])

  const isSelfIngredient = categoryId && ingredients.length === 1 && ingredients[0].name === categoryName

  useEffect(() => {
    if (isSelfIngredient) {
      setIngredientId(ingredients[0].id)
      setIngredientName(ingredients[0].name)
      setUnit(ingredients[0].default_unit || 'גרם')
    }
  }, [isSelfIngredient])

  const handleCategoryChange = (catId) => {
    const cat = categories.find((c) => c.id === catId)
    setCategoryId(catId)
    setCategoryName(cat?.name || '')
    setIngredientId('')
    setIngredientName('')
  }

  const handleIngredientChange = (ingId) => {
    const ing = ingredients.find((i) => i.id === ingId)
    if (ing) {
      setIngredientId(ingId)
      setIngredientName(ing.name)
      setUnit(ing.default_unit || 'גרם')
    }
  }

  const durationMinutes = durationValue ? parseFloat(durationValue) * (TIME_UNITS.find((u) => u.value === durationUnit)?.multiplier || 1) : null

  const isValid = () => {
    if (type === 'ingredient_addition') return ingredientId && baseQuantity !== ''
    if (type === 'wait_time') return durationValue && parseFloat(durationValue) > 0
    if (type === 'action') return !!title
    return false
  }

  const handleSave = () => {
    onSave({
      recipe_id: recipeId,
      type,
      title: title || null,
      instructions: instructions || null,
      ingredient_id: type === 'ingredient_addition' ? ingredientId : null,
      ingredient_name: type === 'ingredient_addition' ? ingredientName : null,
      category_name: type === 'ingredient_addition' ? categoryName : null,
      base_quantity: type === 'ingredient_addition' ? parseFloat(baseQuantity) : null,
      unit: type === 'ingredient_addition' ? unit : null,
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
          </SelectContent>
        </Select>

        {type === 'ingredient_addition' && (
          <>
            <Select value={categoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-7 text-sm w-28 border-dashed">
                <SelectValue placeholder="כותרת..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSelfIngredient && (
              <Select value={ingredientId} onValueChange={handleIngredientChange} disabled={!categoryId}>
                <SelectTrigger className="h-7 text-sm w-24 border-dashed">
                  <SelectValue placeholder="רכיב..." />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input type="number" value={baseQuantity} onChange={(e) => setBaseQuantity(e.target.value)} className="h-7 text-sm w-16 border-dashed" placeholder="כמות" />
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="h-7 text-sm w-16 border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
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

        <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} className="h-7 text-sm w-full border-dashed mt-1" placeholder="הוראות נוספות (אופציונלי)..." />
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
