import { useNavigate } from 'react-router-dom'
import { ChefHat, ChevronLeft } from 'lucide-react'
import { useRealtimeList } from '@/hooks/useRealtime'
import { Button } from '@/components/ui/button'

// Lists production_sessions currently in progress ("ייצור מודרך") - no date
// scheduling, no multi-day carry-over. Sessions can only be created from
// RecipeView's "התחל ייצור מודרך" button; this page just lists and navigates.
export default function GuidedProductionList() {
  const navigate = useNavigate()
  const { rows: sessions, loading } = useRealtimeList('production_sessions', 'status', 'active')

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-6">ייצור מודרך</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl shadow-soft">
          <ChefHat className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground font-medium text-lg">אין ייצורים פעילים כרגע</p>
          <Button variant="outline" className="mt-5" onClick={() => navigate('/recipes')}>
            לך למתכונים כדי להתחיל ייצור
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => navigate(`/production/${session.id}`)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 shadow-soft hover:shadow-card-hover transition-shadow text-right"
            >
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{session.recipe_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {session.production_mode === 'cycles' && session.total_vats > 1 ? `אצווה ${session.vat_number}/${session.total_vats}` : `${session.vat_volume ?? ''}`.trim()}
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
