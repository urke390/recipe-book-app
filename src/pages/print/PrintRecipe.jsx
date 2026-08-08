import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, ChevronRight } from 'lucide-react'
import { db } from '@/api/db'
import { Button } from '@/components/ui/button'
import RecipePrintSection from '@/components/print/RecipePrintSection'
import PrintModal from '@/components/print/PrintModal'
import FeedbackWidget from '@/components/FeedbackWidget'

// recipeId/volume props let this be opened as an in-app modal (see onClose);
// without them it reads from the route (/print/recipe/:id) and renders as a
// full standalone page instead, so the same content stays independently
// shareable/linkable.
export default function PrintRecipe({ recipeId: recipeIdProp, volume: volumeProp, onClose }) {
  const { id: idParam } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const id = recipeIdProp || idParam
  const volume = volumeProp ?? (searchParams.get('volume') ? parseFloat(searchParams.get('volume')) : null)
  const isModal = !!onClose

  const { data: recipe } = useQuery({ queryKey: ['recipe', id], queryFn: () => db.Recipe.get(id) })
  const { data: steps = [] } = useQuery({ queryKey: ['steps', id], queryFn: () => db.RecipeStep.filter({ recipe_id: id }, 'order') })
  const { data: parameters = [] } = useQuery({ queryKey: ['parameters'], queryFn: () => db.Parameter.list() })

  if (!recipe) {
    return isModal ? null : (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const scaleFactor = volume ? volume / recipe.base_quantity : 1

  const content = (
    <div id="print-root" className="max-w-2xl mx-auto p-8 text-foreground bg-background">
      <RecipePrintSection recipe={recipe} steps={steps} parameters={parameters} vatScales={[scaleFactor]} volume={volume} />
    </div>
  )

  if (isModal) {
    return (
      <PrintModal
        onClose={onClose}
        title="תצוגה להדפסה"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            הדפס
          </Button>
        }
      >
        {content}
      </PrintModal>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print sticky top-0 bg-card border-b border-border p-3 flex items-center gap-2 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        <span className="flex-1 font-semibold text-sm">תצוגה להדפסה</span>
        <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="w-3.5 h-3.5" />
          הדפס
        </Button>
      </div>
      {content}
      <FeedbackWidget />
    </div>
  )
}
