import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Pencil, ChefHat, Printer } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import ParametersPanel from '@/components/production/ParametersPanel'
import StartGuidedProductionModal from '@/components/StartGuidedProductionModal'
import PrintRecipe from '@/pages/print/PrintRecipe'
import { getStepDisplayTitle, STEP_TYPE_COLORS } from '@/lib/stepUtils'

// Read-only recipe view: ingredients, steps and parameters for reading
// through a recipe. Entering guided production only happens via the
// explicit button here, never as a side effect of viewing.
export default function RecipeView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { editor } = useEditor()
  const [starting, setStarting] = useState(false)
  const [printing, setPrinting] = useState(false)

  const { data: recipe, isLoading: recipeLoading, isError } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => db.Recipe.get(id),
  })

  const { data: steps = [] } = useQuery({
    queryKey: ['steps', id],
    queryFn: () => db.RecipeStep.filter({ recipe_id: id }, 'order'),
    enabled: !!recipe,
  })

  if (recipeLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !recipe) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto w-full text-center py-24">
        <p className="text-muted-foreground font-medium">המתכון לא נמצא</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/recipes')}>
          חזרה למתכונים
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/recipes')}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-heading font-bold">{recipe.name}</h1>
          {recipe.description && <p className="text-sm text-muted-foreground mt-0.5">{recipe.description}</p>}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => setPrinting(true)}>
          <Printer className="w-3.5 h-3.5" />
          הדפס
        </Button>
        {editor && (
          <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={() => navigate(`/recipes/${id}/edit`)}>
            <Pencil className="w-3.5 h-3.5" />
            ערוך
          </Button>
        )}
      </div>

      {recipe.image_url && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-soft">
          <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 shadow-soft mb-6">
        <p className="text-sm text-muted-foreground">
          כמות בסיס: <span className="font-medium text-foreground">{recipe.base_quantity} {recipe.base_unit}</span>
        </p>
      </div>

      <ParametersPanel parameterIds={recipe.parameter_ids} parameterValues={recipe.parameter_values} />

      <div className="mb-8">
        <h2 className="text-lg font-heading font-bold mb-3">שלבי הכנה</h2>
        {steps.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">אין שלבים עדיין</p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, idx) => (
              <li key={step.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card shadow-soft">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-secondary text-secondary-foreground">{idx + 1}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STEP_TYPE_COLORS[step.type]}`}>
                  {step.type === 'ingredient_addition' ? 'רכיב' : step.type === 'wait_time' ? 'המתנה' : 'פעולה'}
                </span>
                <span className="flex-1 min-w-0 text-sm font-medium">
                  {getStepDisplayTitle(step)}
                  {step.instructions && <span className="text-muted-foreground font-normal"> ({step.instructions})</span>}
                </span>
                {step.type === 'ingredient_addition' && step.base_quantity && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {step.base_quantity} {step.unit}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <Button size="lg" className="w-full gap-2 shadow-soft" onClick={() => setStarting(true)}>
        <ChefHat className="w-5 h-5" />
        התחל ייצור מודרך
      </Button>

      {starting && (
        <StartGuidedProductionModal
          recipe={recipe}
          onClose={(session) => {
            setStarting(false)
            if (session) navigate(`/production/${session.id}`)
          }}
        />
      )}

      {printing && <PrintRecipe recipeId={id} onClose={() => setPrinting(false)} />}
    </div>
  )
}
