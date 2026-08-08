// Supabase Edge Function: update-edit-code
//
// Lets an existing editor change the shared edit code from inside the app -
// no terminal needed. Requires the caller's JWT to already carry
// app_metadata.role === 'editor' (i.e. they already redeemed a code once);
// there is deliberately no "current code" re-entry, since an editor already
// has full write access to everything regardless.
//
// Deploy: supabase functions deploy update-edit-code

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

  const { newCode } = await req.json().catch(() => ({}))
  if (!newCode || String(newCode).length < 4) {
    return new Response(JSON.stringify({ error: 'הקוד חייב להיות לפחות 4 תווים' }), { status: 400, headers: corsHeaders })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData?.user || userData.user.app_metadata?.role !== 'editor') {
    return new Response(JSON.stringify({ error: 'אין לך הרשאת עריכה' }), { status: 403, headers: corsHeaders })
  }

  const hash = await sha256Hex(newCode)
  const { error } = await admin.from('app_secrets').upsert({ id: true, edit_code_hash: hash })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
