// Supabase Edge Function: translate-content
//
// Translates new Hebrew user content (recipe names, steps, units...) to
// Spanish with Claude and stores the result in content_translations, so
// devices using the Spanish UI show it translated. Called by editors' devices
// right after saving content, and for any untranslated string they display
// (src/lib/contentI18n.js). Names that have no Spanish equivalent (brands,
// proper names) are transliterated to Latin letters instead.
//
// Deploy:  supabase functions deploy translate-content
// Secret:  supabase secrets set ANTHROPIC_API_KEY=...
// Without the secret the function answers 503 and the app falls back to
// automatic transliteration for untranslated strings.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const HEB = /[֐-׿]/
const MAX_TEXTS = 100
const MAX_LEN = 2000

const SYSTEM = `You translate content of a family recipe book app (home cooking, baking, and some dairy production) from Hebrew to Spanish (Spain).
The strings are recipe names, ingredient names, preparation step titles and instructions, units of measure, categories and measured parameters.
Rules:
- Translate naturally, using standard Spanish cooking terminology (e.g. instructions in impersonal form: "Se mezcla", "Hornear 20 minutos"; תבנית 26 = molde de 26; תרבית = cultivo; התססה = fermentación).
- Family names in recipe titles are transliterated (סבתא רותי = abuela Ruti, דודה רבקה = tía Rivka).
- Keep numbers, percentages, temperatures, units like °C / pH / ml, punctuation and line breaks exactly as they are.
- Names with no Spanish equivalent (brand or product names, people, Hebrew-specific product names) are transliterated to Latin letters with Spanish-friendly spelling instead of translated.
- Keep the same tone and length; do not add explanations.
Return every input string exactly once, unchanged in "source", with its Spanish version in "es".`

const SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { source: { type: 'string' }, es: { type: 'string' } },
        required: ['source', 'es'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!jwt) return json({ error: 'missing auth' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || userData?.user?.app_metadata?.role !== 'editor') return json({ error: 'editor only' }, 403)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'translation not configured' }, 503)

  const body = await req.json().catch(() => ({}))
  const texts = [...new Set<string>((Array.isArray(body?.texts) ? body.texts : []).filter((s: unknown) => typeof s === 'string' && HEB.test(s) && s.length <= MAX_LEN))].slice(0, MAX_TEXTS)
  if (!texts.length) return json({ translations: [] })

  // Skip anything already translated (e.g. by hand) - only fill gaps.
  const { data: existing } = await admin.from('content_translations').select('source, es').in('source', texts)
  const have = new Map((existing || []).map((r) => [r.source, r.es]))
  const missing = texts.filter((s) => !have.has(s))

  const result = [...have].map(([source, es]) => ({ source, es }))
  if (missing.length) {
    const client = new Anthropic({ apiKey })
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(missing) }],
    })
    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422)

    const text = response.content.find((b) => b.type === 'text')
    let parsed: { translations?: { source: string; es: string }[] } = {}
    try {
      parsed = JSON.parse(text && 'text' in text ? text.text : '{}')
    } catch {
      return json({ error: 'bad model output' }, 502)
    }
    const wanted = new Set(missing)
    const rows = (parsed.translations || [])
      .filter((r) => wanted.has(r.source) && typeof r.es === 'string' && r.es.trim())
      .map((r) => ({ source: r.source, es: r.es.trim(), origin: 'auto' }))
    if (rows.length) {
      const { error } = await admin.from('content_translations').upsert(rows, { onConflict: 'source', ignoreDuplicates: true })
      if (error) return json({ error: error.message }, 500)
    }
    result.push(...rows.map(({ source, es }) => ({ source, es })))
  }

  return json({ translations: result })
})
