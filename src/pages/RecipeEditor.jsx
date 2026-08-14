import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { ChevronRight, Plus, Trash2, GripVertical, Pencil, Lock, Printer } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import StepRowEditor from '@/components/recipe/StepRowEditor'
import ParamValueEditor from '@/components/recipe/ParamValueEditor'
import PrintRecipe from '@/pages/print/PrintRecipe'
import { getStepDisplayTitle, STEP_TYPE_COLORS } from '@/lib/stepUtils'

const TABS = [
  { key: 'details', label: 'פרטים' },
  { key: 'steps', label: 'שלבים' },
  { key: 'parameters', label: 'פרמטרים' },
]

// Full-page recipe editor, reached via /recipes/new (create) or
// /recipes/:id/edit (edit). Read-only viewing lives separately in
// pages/RecipeView.jsx - this component is only ever entered by an explicit
// editor action.
export default function RecipeEditor() {
  const { id: idParam } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { editor } = useEditor()
  const queryClient = useQueryClient()
  const [createdId, setCreatedId] = useState(null)
  const id = idParam || createdId
  const isNew = !id

  const [tab, setTab] = useState('details')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [baseQuantity, setBaseQuantity] = useState(4)
  const [baseUnit, setBaseUnit] = useState('מנות')
  const [categoryId, setCategoryId] = useState(null)
  const [addingStep, setAddingStep] = useState(false)
  const [editingStepId, setEditingStepId] = useState(null)
  const [deleteStepId, setDeleteStepId] = useState(null)
  const [localSteps, setLocalSteps] = useState(null)
  const [printing, setPrinting] = useState(false)

  const { data: recipe, isLoading: recipeLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => db.Recipe.get(id),
    enabled: !!id,
  })

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '')
      setDescription(recipe.description || '')
      setImageUrl(recipe.image_url || '')
      setBaseQuantity(recipe.base_quantity || 4)
      setBaseUnit(recipe.base_unit || 'מנות')
      setCategoryId(recipe.category_id || null)
    }
  }, [recipe?.id])

  const { data: recipeCategories = [] } = useQuery({ queryKey: ['recipe_categories'], queryFn: () => db.RecipeCategory.list('name') })

  const { data: steps = [] } = useQuery({
    queryKey: ['steps', id],
    queryFn: () => db.RecipeStep.filter({ recipe_id: id }, 'order'),
    enabled: !!id,
  })
  const displaySteps = localSteps || steps

  const { data: allParameters = [] } = useQuery({ queryKey: ['parameters'], queryFn: () => db.Parameter.list('name') })

  const parameterIds = recipe?.parameter_ids || []
  const parameterValues = recipe?.parameter_values || []

  const saveDetailsMutation = useMutation({
    mutationFn: async () => {
      const data = { name, description: description || null, image_url: imageUrl || null, base_quantity: parseFloat(baseQuantity) || 4, base_unit: baseUnit, category_id: categoryId }
      if (isNew) return db.Recipe.create(data)
      return db.Recipe.update(id, data)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast({ title: 'המתכון נשמר' })
      if (isNew) {
        navigate(`/recipes/${saved.id}/edit`, { replace: true })
      } else {
        queryClient.invalidateQueries({ queryKey: ['recipe', id] })
      }
    },
  })

  const addStepMutation = useMutation({
    mutationFn: (data) => {
      const maxOrder = steps.reduce((max, s) => Math.max(max, s.order ?? 0), -1)
      return db.RecipeStep.create({ ...data, order: maxOrder + 1 })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps', id] })
      setAddingStep(false)
    },
  })

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, data }) => db.RecipeStep.update(stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps', id] })
      setEditingStepId(null)
    },
  })

  const deleteStepMutation = useMutation({
    mutationFn: (stepId) => db.RecipeStep.delete(stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps', id] })
      setDeleteStepId(null)
    },
  })

  const toggleParameterMutation = useMutation({
    mutationFn: (newParamIds) => db.Recipe.update(id, { parameter_ids: newParamIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipe', id] }),
  })

  const updateParamValueMutation = useMutation({
    mutationFn: (newValues) => db.Recipe.update(id, { parameter_values: newValues }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipe', id] }),
  })

  const handleToggleParameter = (paramId) => {
    const has = parameterIds.includes(paramId)
    const newIds = has ? parameterIds.filter((p) => p !== paramId) : [...parameterIds, paramId]
    const newValues = has ? parameterValues.filter((pv) => pv.parameter_id !== paramId) : [...parameterValues, { parameter_id: paramId, value_type: 'range', value: null, value_min: null, value_max: null }]
    toggleParameterMutation.mutate(newIds)
    updateParamValueMutation.mutate(newValues)
  }

  const handleParamValueUpdate = (paramId, field, value) => {
    const newValues = parameterValues.map((pv) => (pv.parameter_id === paramId ? { ...pv, [field]: field === 'value_type' ? value : value === '' ? null : parseFloat(value) } : pv))
    updateParamValueMutation.mutate(newValues)
  }

  const onDragEnd = (result) => {
    if (!result.destination) return
    const reordered = Array.from(displaySteps)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setLocalSteps(reordered)
    Promise.all(reordered.map((s, idx) => db.RecipeStep.update(s.id, { order: idx }))).then(() => {
      queryClient.invalidateQueries({ queryKey: ['steps', id] })
      setTimeout(() => setLocalSteps(null), 300)
    })
  }

  const handleBack = () => navigate(isNew ? '/recipes' : `/recipes/${id}`)

  if (id && recipeLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-heading font-bold">{isNew ? 'מתכון חדש' : recipe?.name || 'עריכת מתכון'}</h1>
        </div>
        {!isNew && (
          <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => setPrinting(true)}>
            <Printer className="w-3.5 h-3.5" />
            הדפס
          </Button>
        )}
        {!editor && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full flex-shrink-0">
            <Lock className="w-3 h-3" />
            צפייה בלבד
          </span>
        )}
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 max-w-md">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            disabled={t.key !== 'details' && isNew}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === t.key ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.key === 'steps' && steps.length > 0 && <span className="mr-1.5 text-xs text-muted-foreground">({steps.length})</span>}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="space-y-4 bg-card border border-border rounded-2xl p-5 shadow-soft">
          <div>
            <Label className="mb-1 block">שם מתכון *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: עוגת שוקולד" disabled={!editor} />
          </div>
          <div>
            <Label className="mb-1 block">תיאור</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור קצר..." disabled={!editor} />
          </div>
          <div>
            <Label className="mb-1 block">קישור לתמונה</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." disabled={!editor} dir="ltr" />
          </div>
          <div>
            <Label className="mb-1 block">קטגוריה</Label>
            <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? null : v)} disabled={!editor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא קטגוריה</SelectItem>
                {recipeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">כמות בסיס</Label>
              <Input type="number" value={baseQuantity} onChange={(e) => setBaseQuantity(e.target.value)} disabled={!editor} />
            </div>
            <div>
              <Label className="mb-1 block">יחידת בסיס</Label>
              <Input value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} disabled={!editor} />
            </div>
          </div>
          {editor && (
            <Button onClick={() => saveDetailsMutation.mutate()} disabled={!name || saveDetailsMutation.isPending} className="w-full">
              {saveDetailsMutation.isPending ? 'שומר...' : isNew ? 'צור מתכון והמשך לשלבים' : 'שמור פרטים'}
            </Button>
          )}
        </div>
      )}

      {tab === 'steps' && (
        <div className="space-y-2">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="steps" isDropDisabled={!editor}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {displaySteps.map((step, idx) => (
                    <Draggable key={step.id} draggableId={step.id} index={idx} isDragDisabled={!editor || editingStepId === step.id}>
                      {(dragProvided) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                          {editingStepId === step.id ? (
                            <StepRowEditor
                              step={step}
                              stepIndex={idx}
                              recipeId={id}
                              onSave={(data) => updateStepMutation.mutate({ stepId: step.id, data })}
                              onClose={() => setEditingStepId(null)}
                            />
                          ) : (
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card shadow-soft">
                              <div {...dragProvided.dragHandleProps} className={`text-muted-foreground/40 flex-shrink-0 ${editor ? 'cursor-grab' : 'invisible'}`}>
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-secondary text-secondary-foreground">{idx + 1}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STEP_TYPE_COLORS[step.type]}`}>
                                {step.type === 'ingredient_addition' ? 'רכיב' : step.type === 'wait_time' ? 'המתנה' : 'פעולה'}
                              </span>
                              <span className="flex-1 min-w-0 truncate text-sm font-medium">{getStepDisplayTitle(step)}</span>
                              {step.type === 'ingredient_addition' && step.base_quantity && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {step.base_quantity} {step.unit}
                                </span>
                              )}
                              {editor && (
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingStepId(step.id)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteStepId(step.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {displaySteps.length === 0 && !addingStep && <p className="text-center text-muted-foreground py-10 text-sm">אין שלבים עדיין</p>}

          {addingStep ? (
            <StepRowEditor recipeId={id} onSave={(data) => addStepMutation.mutate(data)} onClose={() => setAddingStep(false)} />
          ) : (
            editor && (
              <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => setAddingStep(true)}>
                <Plus className="w-4 h-4" />
                הוסף שלב
              </Button>
            )
          )}
        </div>
      )}

      {tab === 'parameters' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {allParameters.map((p) => {
              const active = parameterIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  disabled={!editor}
                  onClick={() => handleToggleParameter(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors disabled:cursor-not-allowed ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {p.name}
                </button>
              )
            })}
            {allParameters.length === 0 && <p className="text-sm text-muted-foreground">אין פרמטרים מוגדרים במערכת</p>}
          </div>

          {parameterValues.map((pv) => {
            const param = allParameters.find((p) => p.id === pv.parameter_id)
            if (!param) return null
            return <ParamValueEditor key={pv.parameter_id} param={param} pv={pv} onUpdate={(field, value) => handleParamValueUpdate(pv.parameter_id, field, value)} />
          })}
        </div>
      )}

      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שלב</AlertDialogTitle>
            <AlertDialogDescription>האם למחוק שלב זה?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteStepMutation.mutate(deleteStepId)} className="bg-destructive hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {printing && <PrintRecipe recipeId={id} onClose={() => setPrinting(false)} />}
    </div>
  )
}
