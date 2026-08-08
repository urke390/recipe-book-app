import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY - copy .env.example to .env.local and fill them in.')
}

export const supabase = createClient(url, anonKey)

// Every visitor gets an invisible anonymous session - there is no signup/login
// screen. Write access is granted separately by redeeming the shared edit
// code, which flips a `role: editor` claim on this same anonymous user.
let anonReadyPromise = null
export function ensureAnonSession() {
  if (!anonReadyPromise) {
    anonReadyPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) throw error
      }
    })()
  }
  return anonReadyPromise
}

export function isEditor(session) {
  return session?.user?.app_metadata?.role === 'editor'
}

// Signs this device out of its editor-flagged anonymous session and
// immediately starts a fresh, non-editor one - the app still needs *some*
// session to read data (viewing stays open to everyone), it just won't carry
// the editor claim until the code is entered again on this device.
export async function exitEditorMode() {
  await supabase.auth.signOut()
  anonReadyPromise = null
  await ensureAnonSession()
}

export async function redeemEditCode(code) {
  const { data, error } = await supabase.functions.invoke('redeem-edit-code', {
    body: { code },
  })
  if (error) throw error
  // The edge function updates app_metadata server-side; refresh the local
  // session so the new role claim is reflected in the JWT immediately.
  await supabase.auth.refreshSession()
  return data
}

// Only callable by a device that's already an editor (the function itself
// re-checks this server-side too).
export async function updateEditCode(newCode) {
  const { data, error } = await supabase.functions.invoke('update-edit-code', {
    body: { newCode },
  })
  if (error) throw error
  return data
}
