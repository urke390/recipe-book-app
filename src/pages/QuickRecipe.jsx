import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronLeft, Lock, Trash2, Check, Plus, Pencil } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import ParamValueEditor from '@/components/recipe/ParamValueEditor'
import { getStepDisplayTitle, STEP_TYPE_COLORS, STEP_TYPE_LABELS } from '@/lib/stepUtils'
import Qty from '@/components/Qty'

const DRAFT_KEY = 'quick_recipe_draft'

const STEP_CHOICES = [
  { type: 'ingredient_addition', emoji: '🧂', label: 'מוסיפים רכיב', hint: 'חלב, תרבית, מלח...' },
  { type: 'wait_time', emoji: '⏱️', label: 'מחכים', hint: 'המתנה, התססה, קירור...' },
  { type: 'action', emoji: '👐', label: 'עושים פעולה', hint: 'לערבב, לחמם, לחתוך...' },
  { type: 'section_header', emoji: '📌', label: 'מתחילים חלק חדש', hint: 'כותרת, למשל "לציפוי"' },
]

const TIME_UNITS = [
  { value: 'minutes', label: 'דקות', multiplier: 1 },
  { value: 'hours', label: 'שעות', multiplier: 60 },
  { value: 'days', label: 'ימים', multiplier: 1440 },
]

// Screens of the wizard, in order. 'steps' is a loop - the user keeps
// adding steps there until they say they're done.
const SCREENS = ['name', 'category', 'description', 'steps', 'parameters', 'summary']

const EMPTY_DRAFT = { screen: 'name', name: '', description: '', categoryId: null, steps: [], parameterValues: [] }

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

function Question({ title, subtitle, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl md:text-2xl font-heading font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function ChoiceChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  )
}

function StepLine({ step, index, onDelete, onEdit }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-card">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-secondary text-secondary-foreground">{index + 1}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STEP_TYPE_COLORS[step.type]}`}>{STEP_TYPE_LABELS[step.type]}</span>
      <span className="flex-1 min-w-0 truncate text-sm font-medium">{getStepDisplayTitle(step)}</span>
      {step.type === 'ingredient_addition' && step.base_quantity != null && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          <Qty value={step.base_quantity} unit={step.unit} />
        </span>
      )}
      {onEdit && (
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onEdit} title="ערוך">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive" onClick={onDelete} title="מחק">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  )
}

// Asks the questions for a single step of the chosen type, one small form
// per type, and hands back a step object in the same shape StepRowEditor
// saves (so the recipe ends up identical to one built in the full editor).
function StepQuestions({ type, initial, units, onDone, onCancel }) {
  const [ingredientName, setIngredientName] = useState(initial?.ingredient_name || '')
  const [quantity, setQuantity] = useState(initial?.base_quantity ?? '')
  const [unit, setUnit] = useState(initial?.unit || '')
  const initDur = (() => {
    const m = initial?.duration_minutes
    if (!m) return { value: '', unit: 'minutes' }
    if (m % 1440 === 0) return { value: String(m / 1440), unit: 'days' }
    if (m % 60 === 0) return { value: String(m / 60), unit: 'hours' }
    return { value: String(m), unit: 'minutes' }
  })()
  const [durationValue, setDurationValue] = useState(initDur.value)
  const [durationUnit, setDurationUnit] = useState(initDur.unit)
  const [title, setTitle] = useState(initial?.title || '')
  const [instructions, setInstructions] = useState(initial?.instructions || '')
  const firstInput = useRef(null)

  useEffect(() => {
    firstInput.current?.focus()
  }, [type])

  const valid =
    type === 'ingredient_addition' ? !!ingredientName.trim() : type === 'wait_time' ? parseFloat(durationValue) > 0 : !!title.trim()

  const submit = () => {
    if (!valid) return
    const multiplier = TIME_UNITS.find((u) => u.value === durationUnit)?.multiplier || 1
    onDone({
      type,
      title: title.trim() || null,
      instructions: type !== 'section_header' && instructions.trim() ? instructions.trim() : null,
      ingredient_id: null,
      ingredient_name: type === 'ingredient_addition' ? ingredientName.trim() : null,
      category_name: null,
      base_quantity: type === 'ingredient_addition' && quantity !== '' ? parseFloat(quantity) : null,
      unit: type === 'ingredient_addition' ? unit || null : null,
      duration_minutes: type === 'wait_time' ? parseFloat(durationValue) * multiplier : null,
      is_final_step: false,
    })
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') submit()
  }

  const choice = STEP_CHOICES.find((c) => c.type === type)

  return (
    <div className="space-y-4 bg-card border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-xl">{choice.emoji}</span>
        {choice.label}
      </div>

      {type === 'ingredient_addition' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">איזה רכיב מוסיפים?</label>
            <Input ref={firstInput} value={ingredientName} onChange={(e) => setIngredientName(e.target.value)} onKeyDown={onKeyDown} placeholder="לדוגמה: חלב" className="h-11 text-base" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">כמה? (אפשר להשאיר ריק)</label>
            <Input type="number" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} onKeyDown={onKeyDown} placeholder="כמות" className="h-11 text-base w-32" dir="ltr" />
          </div>
          {units.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">באיזו יחידה?</label>
              <div className="flex flex-wrap gap-2">
                <ChoiceChip active={!unit} onClick={() => setUnit('')}>
                  ללא
                </ChoiceChip>
                {units.map((u) => (
                  <ChoiceChip key={u.id} active={unit === u.name} onClick={() => setUnit(u.name)}>
                    {u.name}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {type === 'wait_time' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">כמה זמן מחכים?</label>
            <div className="flex flex-wrap items-center gap-2">
              <Input ref={firstInput} type="number" inputMode="decimal" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} onKeyDown={onKeyDown} placeholder="משך" className="h-11 text-base w-28" dir="ltr" />
              {TIME_UNITS.map((u) => (
                <ChoiceChip key={u.value} active={durationUnit === u.value} onClick={() => setDurationUnit(u.value)}>
                  {u.label}
                </ChoiceChip>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">בשביל מה מחכים? (אפשר להשאיר ריק)</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKeyDown} placeholder="לדוגמה: התססה" className="h-11 text-base" />
          </div>
        </>
      )}

      {type === 'action' && (
        <div>
          <label className="block text-sm font-medium mb-1.5">מה עושים?</label>
          <Input ref={firstInput} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKeyDown} placeholder="לדוגמה: לערבב היטב" className="h-11 text-base" />
        </div>
      )}

      {type === 'section_header' && (
        <div>
          <label className="block text-sm font-medium mb-1.5">איך קוראים לחלק הזה?</label>
          <Input ref={firstInput} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKeyDown} placeholder="לדוגמה: לציפוי" className="h-11 text-base" />
        </div>
      )}

      {type !== 'section_header' && (
        <div>
          <label className="block text-sm font-medium mb-1.5">יש הוראות נוספות? (אפשר להשאיר ריק)</label>
          <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} onKeyDown={onKeyDown} placeholder="לדוגמה: לאט, בלי להקציף" className="h-11 text-base" />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={submit} disabled={!valid} className="flex-1 h-11 gap-2">
          <Check className="w-4 h-4" />
          {initial ? 'עדכן שלב' : 'הוסף שלב'}
        </Button>
        <Button variant="outline" onClick={onCancel} className="h-11">
          ביטול
        </Button>
      </div>
    </div>
  )
}

// "Quick add" - a question-by-question wizard for building a recipe, meant
// for workers who don't know the full editor. It lives alongside
// RecipeEditor (not instead of it) and writes exactly the same recipe /
// recipe_steps shape, so anything made here can later be refined in the
// full editor. Progress is kept in localStorage so an accidental back/refresh
// doesn't lose a half-entered recipe.
export default function QuickRecipe() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { ready, editor } = useEditor()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(loadDraft)
  const [stepType, setStepType] = useState(null) // step type currently being asked about
  const [editingIndex, setEditingIndex] = useState(null)
  const nameInput = useRef(null)

  const { screen, name, description, categoryId, steps, parameterValues } = draft
  const update = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const screenIndex = SCREENS.indexOf(screen)

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // storage unavailable - the wizard still works, just without resume
    }
  }, [draft])

  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
    if (screen === 'name') nameInput.current?.focus()
  }, [screen])

  const { data: categories = [] } = useQuery({ queryKey: ['recipe_categories'], queryFn: () => db.RecipeCategory.list('name') })
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => db.Unit.list('order') })
  const { data: allParameters = [] } = useQuery({ queryKey: ['parameters'], queryFn: () => db.Parameter.list('name') })

  const goTo = (s) => {
    setStepType(null)
    setEditingIndex(null)
    update({ screen: s })
  }
  const next = () => goTo(SCREENS[screenIndex + 1])
  const back = () => (screenIndex === 0 ? navigate(-1) : goTo(SCREENS[screenIndex - 1]))

  const saveStep = (step) => {
    if (editingIndex != null) update({ steps: steps.map((s, i) => (i === editingIndex ? step : s)) })
    else update({ steps: [...steps, step] })
    setStepType(null)
    setEditingIndex(null)
  }

  const toggleParameter = (paramId) => {
    const has = parameterValues.some((pv) => pv.parameter_id === paramId)
    update({
      parameterValues: has
        ? parameterValues.filter((pv) => pv.parameter_id !== paramId)
        : [...parameterValues, { parameter_id: paramId, value_type: 'range', value: null, value_min: null, value_max: null }],
    })
  }

  const updateParamValue = (paramId, field, value) => {
    update({
      parameterValues: parameterValues.map((pv) => (pv.parameter_id === paramId ? { ...pv, [field]: field === 'value_type' ? value : value === '' ? null : parseFloat(value) } : pv)),
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const recipe = await db.Recipe.create({
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        parameter_ids: parameterValues.map((pv) => pv.parameter_id),
        parameter_values: parameterValues,
      })
      for (let i = 0; i < steps.length; i++) {
        await db.RecipeStep.create({ ...steps[i], recipe_id: recipe.id, order: i })
      }
      return recipe
    },
    onSuccess: (recipe) => {
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        // ignore
      }
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast({ title: 'המתכון נשמר' })
      navigate(`/recipes/${recipe.id}`, { replace: true })
    },
    onError: (e) => toast({ title: 'השמירה נכשלה', description: e?.message, variant: 'destructive' }),
  })

  const startOver = () => {
    setStepType(null)
    setEditingIndex(null)
    setDraft(EMPTY_DRAFT)
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!editor) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto w-full">
        <div className="text-center py-16 bg-card border border-border rounded-2xl shadow-soft px-6">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-60" />
          <p className="font-semibold text-lg">צריך קוד עריכה</p>
          <p className="text-sm text-muted-foreground mt-2">כדי להוסיף מתכון צריך להזין קוד עריכה. אפשר לבקש אותו מהאחראי.</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/recipes')}>
            חזרה למתכונים
          </Button>
        </div>
      </div>
    )
  }

  const categoryName = categories.find((c) => c.id === categoryId)?.name
  const hasProgress = !!name || steps.length > 0

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={back} title="חזרה">
          <ChevronRight className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-lg font-heading font-bold">הוספה מהירה</h1>
        {hasProgress && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={startOver}>
            התחל מחדש
          </Button>
        )}
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-8">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((screenIndex + 1) / SCREENS.length) * 100}%` }} />
      </div>

      {screen === 'name' && (
        <Question title="איך קוראים למתכון?">
          <Input
            ref={nameInput}
            value={name}
            onChange={(e) => update({ name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && next()}
            placeholder="לדוגמה: גבינה לבנה 5%"
            className="h-12 text-lg"
          />
          <Button onClick={next} disabled={!name.trim()} className="w-full h-12 gap-2 text-base">
            המשך
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Question>
      )}

      {screen === 'category' && (
        <Question title="לאיזו קטגוריה הוא שייך?">
          <div className="flex flex-wrap gap-2">
            <ChoiceChip active={!categoryId} onClick={() => update({ categoryId: null })}>
              ללא קטגוריה
            </ChoiceChip>
            {categories.map((c) => (
              <ChoiceChip key={c.id} active={categoryId === c.id} onClick={() => update({ categoryId: c.id })}>
                {c.name}
              </ChoiceChip>
            ))}
          </div>
          <Button onClick={next} className="w-full h-12 gap-2 text-base">
            המשך
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Question>
      )}

      {screen === 'description' && (
        <Question title="רוצה להוסיף תיאור קצר?" subtitle="לא חובה - אפשר לדלג">
          <Input
            value={description}
            onChange={(e) => update({ description: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && next()}
            placeholder="לדוגמה: גבינה רכה למריחה"
            className="h-12 text-base"
          />
          <Button onClick={next} className="w-full h-12 gap-2 text-base">
            {description.trim() ? 'המשך' : 'דלג'}
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Question>
      )}

      {screen === 'steps' && (
        <Question
          title={steps.length === 0 ? 'מה עושים ראשון?' : 'מה עושים אחר כך?'}
          subtitle={steps.length === 0 ? 'בונים את המתכון שלב אחרי שלב, לפי הסדר' : `${steps.length} שלבים עד עכשיו`}
        >
          {steps.length > 0 && (
            <div className="space-y-1.5">
              {steps.map((s, i) =>
                editingIndex === i ? (
                  <StepQuestions key={i} type={s.type} initial={s} units={units} onDone={saveStep} onCancel={() => setEditingIndex(null)} />
                ) : (
                  <StepLine
                    key={i}
                    step={s}
                    index={i}
                    onEdit={() => {
                      setStepType(null)
                      setEditingIndex(i)
                    }}
                    onDelete={() => update({ steps: steps.filter((_, j) => j !== i) })}
                  />
                ),
              )}
            </div>
          )}

          {editingIndex == null &&
            (stepType ? (
              <StepQuestions type={stepType} units={units} onDone={saveStep} onCancel={() => setStepType(null)} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {STEP_CHOICES.map((c) => (
                    <button
                      key={c.type}
                      type="button"
                      onClick={() => setStepType(c.type)}
                      className="flex flex-col items-center text-center gap-1 p-4 rounded-2xl border border-border bg-card shadow-soft hover:border-primary/60 transition-colors"
                    >
                      <span className="text-3xl">{c.emoji}</span>
                      <span className="font-semibold text-sm">{c.label}</span>
                      <span className="text-xs text-muted-foreground">{c.hint}</span>
                    </button>
                  ))}
                </div>
                <Button onClick={next} disabled={steps.length === 0} className="w-full h-12 gap-2 text-base">
                  <Check className="w-4 h-4" />
                  סיימתי את השלבים
                </Button>
              </>
            ))}
        </Question>
      )}

      {screen === 'parameters' && (
        <Question title="יש ערכים שצריך לבדוק במהלך הייצור?" subtitle="למשל טמפרטורה או חומציות. לא חובה - אפשר לדלג">
          {allParameters.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין פרמטרים מוגדרים במערכת</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allParameters.map((p) => (
                <ChoiceChip key={p.id} active={parameterValues.some((pv) => pv.parameter_id === p.id)} onClick={() => toggleParameter(p.id)}>
                  {parameterValues.some((pv) => pv.parameter_id === p.id) ? <Check className="w-3.5 h-3.5 inline ml-1" /> : <Plus className="w-3.5 h-3.5 inline ml-1" />}
                  {p.name}
                </ChoiceChip>
              ))}
            </div>
          )}
          {parameterValues.map((pv) => {
            const param = allParameters.find((p) => p.id === pv.parameter_id)
            if (!param) return null
            return <ParamValueEditor key={pv.parameter_id} param={param} pv={pv} onUpdate={(field, value) => updateParamValue(pv.parameter_id, field, value)} />
          })}
          <Button onClick={next} className="w-full h-12 gap-2 text-base">
            {parameterValues.length ? 'המשך' : 'דלג'}
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Question>
      )}

      {screen === 'summary' && (
        <Question title="הכל נכון?" subtitle="אפשר ללחוץ על כל חלק כדי לתקן אותו">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-soft space-y-4">
            <button type="button" onClick={() => goTo('name')} className="block w-full text-right">
              <p className="text-xs text-muted-foreground">שם</p>
              <p className="font-bold text-lg">{name}</p>
            </button>
            <div className="flex gap-6">
              <button type="button" onClick={() => goTo('category')} className="text-right">
                <p className="text-xs text-muted-foreground">קטגוריה</p>
                <p className="text-sm font-medium">{categoryName || 'ללא'}</p>
              </button>
              <button type="button" onClick={() => goTo('description')} className="text-right min-w-0">
                <p className="text-xs text-muted-foreground">תיאור</p>
                <p className="text-sm font-medium truncate">{description.trim() || 'ללא'}</p>
              </button>
            </div>
            <div>
              <button type="button" onClick={() => goTo('steps')} className="text-xs text-muted-foreground mb-1.5">
                שלבים ({steps.length}) · לחץ לעריכה
              </button>
              <div className="space-y-1.5">
                {steps.map((s, i) => (
                  <StepLine key={i} step={s} index={i} />
                ))}
              </div>
            </div>
            <button type="button" onClick={() => goTo('parameters')} className="block w-full text-right">
              <p className="text-xs text-muted-foreground">פרמטרים</p>
              <p className="text-sm font-medium">
                {parameterValues.length ? parameterValues.map((pv) => allParameters.find((p) => p.id === pv.parameter_id)?.name).filter(Boolean).join(', ') : 'ללא'}
              </p>
            </button>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim() || steps.length === 0} className="w-full h-12 gap-2 text-base">
            <Check className="w-4 h-4" />
            {saveMutation.isPending ? 'שומר...' : 'שמור מתכון'}
          </Button>
        </Question>
      )}
    </div>
  )
}
