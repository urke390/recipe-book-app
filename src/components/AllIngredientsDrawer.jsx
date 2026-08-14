import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'

// Read-only list of every ingredient in the recipe (scaled), for glancing at
// everything needed without stepping through the whole guided flow - sits
// next to AllStepsDrawer's "כל השלבים" button.
export default function AllIngredientsDrawer({ steps, scaleFactor }) {
  const [open, setOpen] = useState(false)
  const ingredientSteps = steps.filter((s) => s.type === 'ingredient_addition')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <ClipboardList className="w-3.5 h-3.5" />
          כל הרכיבים
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>כל הרכיבים ({ingredientSteps.length})</SheetTitle>
        </SheetHeader>
        <div className="space-y-1.5 mt-4">
          {ingredientSteps.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl p-3 border border-border bg-card">
              <span className="text-sm font-medium">{s.ingredient_name || s.title}</span>
              {s.base_quantity != null && (
                <span className="text-sm text-muted-foreground flex-shrink-0 tabular-nums">
                  {(s.base_quantity * (scaleFactor || 1)).toFixed(1)} {s.unit}
                </span>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
