import { useEffect, useState } from 'react'
import { supabase, ensureAnonSession, isEditor, redeemEditCode, exitEditorMode } from '@/lib/supabaseClient'

// Tracks whether *this device* currently holds write access (has redeemed the
// shared edit code). The real gate is server-side RLS - this hook only
// drives the UI (hiding edit controls, showing the "enter code" prompt).
export function useEditor() {
  const [ready, setReady] = useState(false)
  const [editor, setEditor] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let unsub = () => {}
    ensureAnonSession()
      .then(() => supabase.auth.getSession())
      .then(({ data }) => {
        setEditor(isEditor(data.session))
        setReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEditor(isEditor(session))
    })
    unsub = () => sub.subscription.unsubscribe()
    return unsub
  }, [])

  const redeem = async (code) => {
    setError(null)
    try {
      await redeemEditCode(code)
      const { data } = await supabase.auth.getSession()
      const ok = isEditor(data.session)
      setEditor(ok)
      if (!ok) setError('הקוד שגוי')
      return ok
    } catch (e) {
      // Surface the real failure (network/CORS/server error) instead of
      // always blaming the code - that swallowed a real bug during setup.
      setError(e?.message === 'invalid code' ? 'הקוד שגוי' : `שגיאה: ${e?.message || 'לא ידועה'}`)
      return false
    }
  }

  const logout = async () => {
    setError(null)
    // onAuthStateChange (registered above) picks up the sign-out and the
    // fresh anonymous sign-in automatically, so editor flips to false on its
    // own - no need to setEditor here.
    await exitEditorMode()
  }

  return { ready, editor, redeem, logout, error }
}
