import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { db } from '@/api/db'
import { t } from '@/lib/i18n'

import { tc } from '@/lib/contentI18n'

const DEFAULT_TITLE = 'ספר מתכונים ביתי'
// The title is user content: translated via content_translations, with the
// built-in default also covered by the UI dictionary.
const displayTitleOf = (title) => (title === DEFAULT_TITLE ? t(DEFAULT_TITLE) : tc(title))

export const DEFAULT_BRANDING = { title: DEFAULT_TITLE, primary_color: '152 48% 30%', background_color: '40 33% 97%' }

// Singleton row (app_branding) driving the app title and the two colors
// that matter most for the app's look: --primary (header/buttons/active
// states) and --background (the general page background) - both already
// referenced everywhere via Tailwind's `primary`/`background` classes, so
// overriding the CSS custom properties at the root is enough to repaint the
// whole app without touching component code.
export function useBranding() {
  const queryClient = useQueryClient()
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: () => db.Branding.get(true) })

  useEffect(() => {
    const b = branding || DEFAULT_BRANDING
    document.documentElement.style.setProperty('--primary', b.primary_color)
    document.documentElement.style.setProperty('--ring', b.primary_color)
    document.documentElement.style.setProperty('--background', b.background_color)
    document.title = displayTitleOf(b.title)
  }, [branding])

  const updateMutation = useMutation({
    mutationFn: (data) => db.Branding.update(true, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branding'] }),
  })

  const b = branding || DEFAULT_BRANDING
  return { branding: b, displayTitle: displayTitleOf(b.title), updateBranding: updateMutation.mutate, isUpdating: updateMutation.isPending }
}
