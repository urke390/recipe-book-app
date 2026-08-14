import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { ensureAnonSession } from '@/lib/supabaseClient'
import { useBranding } from '@/hooks/useBranding'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import Recipes from '@/pages/Recipes'
import RecipeView from '@/pages/RecipeView'
import RecipeEditor from '@/pages/RecipeEditor'
import GuidedProductionList from '@/pages/GuidedProductionList'
import ProductionRunner from '@/pages/ProductionRunner'
import Categories from '@/pages/Categories'
import Parameters from '@/pages/Parameters'
import Units from '@/pages/Units'
import AlertSound from '@/pages/AlertSound'
import EditCodeSettings from '@/pages/EditCodeSettings'
import FeedbackSettings from '@/pages/FeedbackSettings'
import PrintRecipe from '@/pages/print/PrintRecipe'
import PrintAllRecipes from '@/pages/print/PrintAllRecipes'
import Branding from '@/pages/Branding'

// Applies the app_branding row's colors/title as soon as it loads,
// regardless of which route is active (including /print/* routes, which
// live outside <Layout>) - has no visual output of its own.
function BrandingEffect() {
  useBranding()
  return null
}

function App() {
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    ensureAnonSession().finally(() => setSessionReady(true))
  }, [])

  // Every data query needs the anonymous session's JWT to pass RLS - render
  // nothing else until it's established, otherwise the first fetches go out
  // unauthenticated and RLS silently returns empty results.
  if (!sessionReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingEffect />
      <Router>
        <Routes>
          <Route path="/print/recipe/:id" element={<PrintRecipe />} />
          <Route path="/print/recipes" element={<PrintAllRecipes />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/recipes" replace />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/recipes/new" element={<RecipeEditor />} />
            <Route path="/recipes/:id" element={<RecipeView />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditor />} />
            <Route path="/production" element={<GuidedProductionList />} />
            <Route path="/production/:sessionId" element={<ProductionRunner />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/parameters" element={<Parameters />} />
            <Route path="/units" element={<Units />} />
            <Route path="/alert-sound" element={<AlertSound />} />
            <Route path="/settings/edit-code" element={<EditCodeSettings />} />
            <Route path="/settings/feedback" element={<FeedbackSettings />} />
            <Route path="/settings/branding" element={<Branding />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
