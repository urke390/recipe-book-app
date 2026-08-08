// Supabase Edge Function: redeem-edit-code
//
// The frontend never gets to decide "I am an editor" - it POSTs the shared
// code here, and only this server-side function (using the service role
// key, which never reaches the browser) is allowed to stamp the calling
// anonymous user's app_metadata.role = 'editor'. RLS policies check that
// claim, so writes remain blocked for anyone who hasn't entered the code,
// even if they call the Supabase REST API directly.
//
// The code itself lives in the app_secrets table (as a SHA-256 hash, never
// plaintext) rather than a static deploy-time secret, so an editor can
// change it later via update-edit-code without redeploying anything.
//
// Deploy: supabase functions deploy redeem-edit-code
// One-time seed: set the first code via the in-app settings page once you
// already have editor access on at least one device (see update-edit-code).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sha256Hex } from '../_shared/hash.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')
  if (!jwt) return new Response(JSON.stringify({ error: 'missing auth' }), { status: 401, headers: corsHeaders })

  const { code } = await req.json().catch(() => ({}))
  if (!code) return new Response(JSON.stringify({ error: 'invalid code' }), { status: 403, headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: secretRow } = await admin.from('app_secrets').select('edit_code_hash').eq('id', true).maybeSingle()
  if (!secretRow) {
    // No code has ever been set yet - fall back to the original deploy-time
    // secret so first-time setup still works before anyone has used the
    // in-app settings page to seed app_secrets.
    const fallback = Deno.env.get('EDIT_CODE')
    if (!fallback || code !== fallback) {
      return new Response(JSON.stringify({ error: 'invalid code' }), { status: 403, headers: corsHeaders })
    }
  } else {
    const hash = await sha256Hex(code)
    if (hash !== secretRow.edit_code_hash) {
      return new Response(JSON.stringify({ error: 'invalid code' }), { status: 403, headers: corsHeaders })
    }
  }

  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401, headers: corsHeaders })
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userData.user.id, {
    app_metadata: { role: 'editor' },
  })
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
