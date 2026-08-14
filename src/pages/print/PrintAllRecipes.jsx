import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { Printer, ChevronRight, FileText } from 'lucide-react'
import { db } from '@/api/db'
import { Button } from '@/components/ui/button'
import RecipePrintSection from '@/components/print/RecipePrintSection'
import PrintModal from '@/components/print/PrintModal'
import BookViewer from '@/components/print/BookViewer'
import FeedbackWidget from '@/components/FeedbackWidget'
import { exportHtmlToWord } from '@/lib/exportWord'

// onClose lets this be opened as an in-app modal (see Recipes.jsx); without
// it, reads from the route (/print/recipes) and renders as a full standalone
// page instead, matching PrintRecipe's shareable-link pattern.
// Each recipe prints at its own base quantity (no target-volume scaling) -
// this is a reference book, not tied to any specific production run.
export default function PrintAllRecipes({ onClose }) {
  const navigate = useNavigate()
  const isModal = !!onClose
  const printRootRef = useRef(null)

  const exportWord = () => exportHtmlToWord(printRootRef.current.innerHTML, 'ספר מתכונים')

  const { data: recipes = [] } = useQuery({ queryKey: ['recipes'], queryFn: () => db.Recipe.list('name') })
  const { data: parameters = [] } = useQuery({ queryKey: ['parameters'], queryFn: () => db.Parameter.list() })
  const { data: allSteps = [] } = useQuery({
    queryKey: ['steps-for-all-recipes', recipes.map((r) => r.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(recipes.map((r) => db.RecipeStep.filter({ recipe_id: r.id }, 'order')))
      return results.flat()
    },
    enabled: recipes.length > 0,
  })

  const actions = (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={exportWord}>
        <FileText className="w-3.5 h-3.5" />
        ייצוא ל-Word
      </Button>
      <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
        <Printer className="w-3.5 h-3.5" />
        הדפס
      </Button>
    </>
  )

  const stepsByRecipe = Object.fromEntries(recipes.map((r) => [r.id, allSteps.filter((s) => s.recipe_id === r.id)]))

  const content = (
    <>
      <div className="print:hidden">
        <BookViewer recipes={recipes} stepsByRecipe={stepsByRecipe} parameters={parameters} />
      </div>
      {/* Flat, paginated markup used only for window.print()/Word export - see
          index.css's sr-only/print rules for how this stays invisible on
          screen but becomes the entire visible page when printing. */}
      <div id="print-root" ref={printRootRef} className="sr-only print:not-sr-only max-w-2xl mx-auto p-8 text-foreground bg-background">
        {recipes.map((recipe, i) => (
          <RecipePrintSection key={recipe.id} recipe={recipe} steps={stepsByRecipe[recipe.id]} parameters={parameters} pageBreakBefore={i > 0} />
        ))}
      </div>
    </>
  )

  if (isModal) {
    return (
      <PrintModal onClose={onClose} title="ספר מתכונים" actions={actions}>
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
        <span className="flex-1 font-semibold text-sm">ספר מתכונים</span>
        {actions}
      </div>
      {content}
      <FeedbackWidget />
    </div>
  )
}
