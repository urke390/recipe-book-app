import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { db } from '@/api/db'

export const DEFAULT_BRANDING = { title: 'ספר מתכונים ביתי', primary_color: '152 48% 30%', background_color: '40 33% 97%' }

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
    document.title = b.title
  }, [branding])

  const updateMutation = useMutation({
    mutationFn: (data) => db.Branding.update(true, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branding'] }),
  })

  return { branding: branding || DEFAULT_BRANDING, updateBranding: updateMutation.mutate, isUpdating: updateMutation.isPending }
}
