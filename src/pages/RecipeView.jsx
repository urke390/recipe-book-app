import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Pencil, ChefHat, Printer } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import RecipeBookSpread from '@/components/print/RecipeBookSpread'
import StartGuidedProductionModal from '@/components/StartGuidedProductionModal'
import PrintRecipe from '@/pages/print/PrintRecipe'

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

  const { data: parameters = [] } = useQuery({ queryKey: ['parameters'], queryFn: () => db.Parameter.list() })

  // Goes back to wherever the user actually came from (scroll position,
  // active filter, etc. all preserved by the browser) instead of always
  // resetting to the default recipes view - only falls back to that
  // default when there's nowhere to go back to (e.g. a direct link).
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/recipes')
  }

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
      <div className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/95 backdrop-blur-sm flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={goBack}>
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

      <div className="mb-8">
        <RecipeBookSpread recipe={recipe} steps={steps} parameters={parameters} />
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
