import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ChevronRight, ChevronLeft, CheckCircle, XCircle, RefreshCw, Printer } from 'lucide-react'
import { db } from '@/api/db'
import { useRealtimeRow, useRealtimeList } from '@/hooks/useRealtime'
import { useServerTimer, stepTimerFields } from '@/hooks/useServerTimer'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import ParametersPanel from '@/components/production/ParametersPanel'
import TimerDisplay from '@/components/production/TimerDisplay'
import AllStepsDrawer from '@/components/AllStepsDrawer'
import AllIngredientsDrawer from '@/components/AllIngredientsDrawer'
import CyclesNav from '@/components/production/CyclesNav'
import PrintRecipe from '@/pages/print/PrintRecipe'
import { getStepDisplayTitle } from '@/lib/stepUtils'

function StepContent({ step, scaleFactor, timer, consecutiveIngredients = [] }) {
  const ingredientSteps = step.type === 'ingredient_addition' ? [step, ...consecutiveIngredients] : []

  return (
    <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-card min-h-48 flex flex-col items-center text-center">
        {step.type === 'ingredient_addition' ? (
          <>
            <h2 className="text-2xl font-heading font-bold mb-6">הוסף רכיבים</h2>
            <div className="w-full flex flex-wrap gap-3">
              {ingredientSteps.map((ing, idx) => {
                const ingCalcQty = ing.base_quantity ? ing.base_quantity * scaleFactor : null
                return (
                  <div key={ing.id || idx} className="rounded-2xl px-6 py-4 border border-border shadow-soft flex-1 min-w-48">
                    <p className="text-sm text-muted-foreground mb-2">{ing.ingredient_name || ing.title}</p>
                    <p className="text-4xl font-bold text-primary tabular-nums">{ingCalcQty?.toFixed(1)}</p>
                    <p className="text-lg font-semibold text-foreground mt-1">{ing.unit}</p>
                    {scaleFactor !== 1 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ({ing.base_quantity} {ing.unit} × {scaleFactor.toFixed(2)})
                      </p>
                    )}
                    {ing.category_name && <p className="text-xs text-muted-foreground mt-2">קטגוריה: {ing.category_name}</p>}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-heading font-bold mb-6">{getStepDisplayTitle(step)}</h2>

            {step.type === 'wait_time' && timer.remaining != null && (
              <div className="w-full flex items-center gap-6 justify-center">
                <TimerDisplay remaining={timer.remaining} total={timer.total} inline />
                {step.instructions && (
                  <div className="flex-1 text-right">
                    <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">{step.instructions}</p>
                  </div>
                )}
              </div>
            )}

            {step.type === 'parameter_display' && (
              <div className="bg-violet-50 border border-violet-200 rounded-2xl px-8 py-5 w-full shadow-soft">
                <p className="text-violet-700 font-semibold text-lg mb-2">{step.parameter_name}</p>
                {(step.parameter_value_min != null || step.parameter_value_max != null) && (
                  <p className="text-violet-900 font-bold text-4xl">
                    {step.parameter_value_min != null && step.parameter_value_max != null ? `${step.parameter_value_min} – ${step.parameter_value_max}` : step.parameter_value_min ?? step.parameter_value_max}
                  </p>
                )}
              </div>
            )}

            {step.instructions && step.type !== 'wait_time' && step.type !== 'ingredient_addition' && (
              <div className="mt-6 w-full bg-secondary/40 rounded-2xl p-5 border border-border shadow-soft text-center">
                <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">{step.instructions}</p>
              </div>
            )}

            {step.notes && (
              <div className="mt-3 w-full bg-warning/10 border border-warning/30 rounded-xl p-4 shadow-soft">
                <p className="text-sm text-warning">{step.notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ProductionRunner() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCancel, setShowCancel] = useState(false)
  const [printing, setPrinting] = useState(false)

  const { row: session, loading: sessionLoading, setRow: setSession } = useRealtimeRow('production_sessions', sessionId)
  const { rows: allActiveSessions } = useRealtimeList('production_sessions', 'status', 'active')

  const { data: steps = [] } = useQuery({
    queryKey: ['steps', session?.recipe_id],
    queryFn: () => db.RecipeStep.filter({ recipe_id: session.recipe_id }, 'order'),
    enabled: !!session?.recipe_id,
  })

  const { data: recipe } = useQuery({
    queryKey: ['recipe', session?.recipe_id],
    queryFn: () => db.Recipe.get(session.recipe_id),
    enabled: !!session?.recipe_id,
  })

  const remaining = useServerTimer(session?.step_started_at, session?.step_duration_seconds)
  const timer = { remaining, total: session?.step_duration_seconds }

  const visibleSteps = steps.filter((s) => {
    if (s.is_final_step && session?.production_mode === 'cycles' && session?.vat_number < session?.total_vats) return false
    return true
  })

  const isCyclesMode = session?.production_mode === 'cycles'
  const isLastVat = !isCyclesMode || session?.vat_number >= session?.total_vats
  const currentCycleScaleFactor = (() => {
    if (!isCyclesMode) return session?.scale_factor ?? 1
    if (isLastVat && session?.total_production_volume) {
      const base = recipe?.base_quantity || 4
      const rem = Math.round((session.total_production_volume % base) * 100) / 100
      return rem > 0 ? rem / base : 1
    }
    return 1
  })()

  const currentIndex = session?.current_step_index ?? 0
  const scaleFactor = currentCycleScaleFactor

  const allVatsMarkedDone = isCyclesMode && session?.total_vats > 1 && (session?.completed_vats || []).length >= session?.total_vats
  const finalStep = allVatsMarkedDone ? steps.find((s) => s.is_final_step) : null
  const currentStep = allVatsMarkedDone ? finalStep || visibleSteps[visibleSteps.length - 1] : visibleSteps[currentIndex]

  const consecutiveIngredients = (() => {
    if (!currentStep || currentStep.type !== 'ingredient_addition') return []
    const result = []
    for (let i = currentIndex + 1; i < visibleSteps.length; i++) {
      if (visibleSteps[i].type === 'ingredient_addition') result.push(visibleSteps[i])
      else break
    }
    return result
  })()

  const navigateMutation = useMutation({
    mutationFn: (newIndex) =>
      db.ProductionSession.update(sessionId, {
        current_step_index: newIndex,
        steps_completed: [...(session?.steps_completed || []), ...(currentIndex < newIndex ? [currentIndex] : [])],
        ...stepTimerFields(visibleSteps[newIndex]),
      }),
    // Apply the write's own response locally instead of waiting for it to
    // echo back through Realtime - that round trip (write, then wait for the
    // postgres_changes event) was adding a full extra network hop of delay
    // to every "next step" tap, felt as sluggish step transitions. Other
    // viewers of the same session still get the update via Realtime as before.
    onSuccess: (data) => setSession(data),
  })

  const advanceCycleMutation = useMutation({
    mutationFn: async () => {
      const base = recipe?.base_quantity || 4
      const nextVat = session.vat_number + 1
      const isNextLast = nextVat >= session.total_vats
      const rem = session.total_production_volume ? Math.round((session.total_production_volume % base) * 100) / 100 : 0
      const nextVatVol = isNextLast && rem > 0 ? rem : base
      const nextScaleFactor = isNextLast && rem > 0 ? rem / base : 1
      // Read completed_vats fresh from the DB instead of from React's session
      // state, which can be stale - markVatCompleteMutation (CyclesNav's
      // checkboxes) is a separate mutation that can fire close to this one,
      // and both used to derive their new array from whatever they thought
      // the current value was, silently dropping whichever update lost the
      // race (e.g. system showing 3/8 batches done when 7 were actually marked).
      const latest = await db.ProductionSession.get(sessionId)
      const completedVats = [...(latest.completed_vats || [])]
      if (!completedVats.includes(session.vat_number)) completedVats.push(session.vat_number)
      return db.ProductionSession.update(sessionId, {
        vat_number: nextVat,
        vat_volume: nextVatVol,
        scale_factor: nextScaleFactor,
        current_step_index: 0,
        steps_completed: [],
        completed_vats: completedVats,
        ...stepTimerFields(visibleSteps[0]),
      })
    },
    onSuccess: (data) => setSession(data),
  })

  // No production_history table in this app - completing or cancelling a
  // guided production just removes the session row.
  const completeMutation = useMutation({
    mutationFn: () => db.ProductionSession.delete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions-count'] })
      navigate('/production')
    },
  })

  const markVatCompleteMutation = useMutation({
    mutationFn: async (vatNum) => {
      // See advanceCycleMutation - reads completed_vats fresh to avoid the
      // same lost-update race between the two mutations.
      const latest = await db.ProductionSession.get(sessionId)
      const current = latest.completed_vats || []
      const updated = current.includes(vatNum) ? current.filter((v) => v !== vatNum) : [...current, vatNum]
      return db.ProductionSession.update(sessionId, { completed_vats: updated })
    },
    onSuccess: (data) => setSession(data),
  })

  const cancelMutation = useMutation({
    mutationFn: () => db.ProductionSession.delete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions-count'] })
      navigate('/production')
    },
  })

  const handleNext = () => {
    const skipCount = currentStep?.type === 'ingredient_addition' ? consecutiveIngredients.length : 0
    const newIndex = currentIndex + 1 + skipCount
    if (newIndex >= visibleSteps.length) {
      if (isCyclesMode && !isLastVat) {
        advanceCycleMutation.mutate()
        return
      }
      completeMutation.mutate()
      return
    }
    navigateMutation.mutate(newIndex)
  }

  const handlePrev = () => {
    if (currentIndex > 0) navigateMutation.mutate(currentIndex - 1)
  }

  // sessionLoading covers the initial fetch; !session also covers a session
  // that was just completed/cancelled (deleted) - useRealtimeRow sets row to
  // null on DELETE, and a stale link to an already-finished session lands
  // here too, so one "not found" message covers both cases.
  if (sessionLoading || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-6">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">הייצור הזה נסגר או שאינו קיים</p>
        <Button onClick={() => navigate('/production')}>חזרה לייצור מודרך</Button>
      </div>
    )
  }

  if (visibleSteps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">אין שלבים במתכון זה</p>
        <Button onClick={() => completeMutation.mutate()}>סיים ייצור</Button>
      </div>
    )
  }

  const isLastStep = allVatsMarkedDone || currentIndex >= visibleSteps.length - 1

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-2 z-10 shadow-soft">
        <Button variant="ghost" size="icon" onClick={() => navigate('/production')} className="flex-shrink-0">
          <ChevronRight className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          {allActiveSessions.length > 1 && (
            <div className="flex gap-1 overflow-x-auto pb-2 mb-2 border-b border-border no-scrollbar">
              {allActiveSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/production/${s.id}`)}
                  className={`flex-shrink-0 text-sm px-4 py-1.5 rounded-full font-semibold transition-colors ${s.id === sessionId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {s.recipe_name}
                </button>
              ))}
            </div>
          )}
          <h1 className="font-bold text-sm truncate">{session.recipe_name}</h1>
          {isCyclesMode && session.total_vats > 1 && (
            <p className="text-xs text-muted-foreground">
              אצווה {session.vat_number}/{session.total_vats}
            </p>
          )}
        </div>
        <AllStepsDrawer steps={visibleSteps} currentIndex={currentIndex} scaleFactor={scaleFactor} onSelectStep={(idx) => navigateMutation.mutate(idx)} />
        <AllIngredientsDrawer steps={visibleSteps} scaleFactor={scaleFactor} />
        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setPrinting(true)} title="הדפס">
          <Printer className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive flex-shrink-0" onClick={() => setShowCancel(true)}>
          <XCircle className="w-5 h-5" />
        </Button>
      </div>

      {isCyclesMode && session.total_vats > 1 && (
        <CyclesNav totalVats={session.total_vats} currentVat={session.vat_number} completedVats={session.completed_vats || []} onMarkComplete={(vatNum) => markVatCompleteMutation.mutate(vatNum)} />
      )}
      {allVatsMarkedDone && (
        <div className="bg-success/10 border-b border-success/30 px-4 py-2 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
          <p className="text-sm text-success font-semibold">כל האצוות הושלמו — בצע את הפעולה האחרונה וסיים ייצור</p>
        </div>
      )}
      <div className="h-1.5 bg-muted">
        <div className="h-1.5 bg-primary transition-all duration-300" style={{ width: `${((currentIndex + 1) / visibleSteps.length) * 100}%` }} />
      </div>
      <div className="px-4 pt-3 text-center">
        <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
          שלב {currentIndex + 1} מתוך {visibleSteps.length}
        </span>
      </div>
      {recipe?.parameter_ids?.length > 0 && (
        <div className="px-0 pt-3">
          <ParametersPanel parameterIds={recipe.parameter_ids} parameterValues={recipe.parameter_values || []} />
        </div>
      )}
      {currentStep && <StepContent step={currentStep} scaleFactor={scaleFactor} timer={timer} consecutiveIngredients={consecutiveIngredients} />}

      <div className="sticky bottom-0 bg-card border-t border-border p-4 mt-auto">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button variant="outline" className="flex-1 h-14 text-base" onClick={handlePrev} disabled={currentIndex === 0}>
            <ChevronRight className="w-5 h-5 ml-1" />
            קודם
          </Button>
          {isLastStep ? (
            isCyclesMode && !isLastVat ? (
              <Button className="flex-1 h-14 text-base bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => advanceCycleMutation.mutate()} disabled={advanceCycleMutation.isPending}>
                <RefreshCw className="w-5 h-5" />
                סיים אצווה {session.vat_number}
              </Button>
            ) : (
              <Button className="flex-1 h-14 text-base bg-success hover:bg-success/90 text-success-foreground gap-2" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                <CheckCircle className="w-5 h-5" />
                {isCyclesMode ? `סיום ייצור (אצווה ${session.vat_number})` : 'סיים ייצור'}
              </Button>
            )
          ) : (
            <Button className="flex-1 h-14 text-base gap-2" onClick={handleNext} disabled={navigateMutation.isPending}>
              הבא
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>עצירת ייצור</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך לעצור את הייצור? הייצור יימחק ולא ניתן לשחזרו.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>המשך ייצור</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
              עצור ייצור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {printing && (
        <PrintRecipe
          recipeId={session.recipe_id}
          volume={isCyclesMode ? session.total_production_volume : session.vat_volume}
          onClose={() => setPrinting(false)}
        />
      )}
    </div>
  )
}
