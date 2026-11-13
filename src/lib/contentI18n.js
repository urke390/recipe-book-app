import { supabase, isEditor } from '@/lib/supabaseClient'
import { getLang } from '@/lib/i18n'

// Translation of *user content* (recipe names, steps, units, categories,
// parameters...) - as opposed to t(), which covers the app's own UI strings.
//
// The database keeps content in its source language (Hebrew). A shared
// content_translations table maps each distinct source string to Spanish.
// When the UI language is Spanish, rows are translated on the way out of
// src/api/db.js, and on the way back in any value the user left untouched is
// mapped back to its Hebrew source, so viewing/editing in Spanish never
// overwrites the Hebrew original. Strings with no translation yet are shown
// transliterated, and editors' devices ask the translate-content edge
// function to translate them (it also runs right after each save).

const HEB = /[֐-׿]/

/** Text columns per table that hold user content. */
export const CONTENT_FIELDS = {
  recipes: ['name', 'notes', 'base_unit'],
  recipe_steps: ['title', 'instructions', 'ingredient_name', 'unit', 'parameter_name', 'category_name', 'notes'],
  units: ['name'],
  recipe_categories: ['name'],
  parameters: ['name', 'unit'],
  production_sessions: ['recipe_name'],
  app_branding: ['title'],
}

const active = getLang() === 'es'
const map = new Map() // hebrew source -> spanish
const reverse = new Map() // displayed text -> hebrew source

export const contentTranslationActive = () => active

export async function loadContentTranslations() {
  if (!active) return
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('content_translations').select('source, es').range(from, from + PAGE - 1)
    if (error) {
      console.warn('[contentI18n] could not load translations:', error.message)
      return
    }
    for (const r of data) map.set(r.source, r.es)
    if (data.length < PAGE) return
  }
}

// --- Transliteration fallback (Hebrew -> Latin, Spanish-friendly spelling) --

const GERESH = { 'ג': 'y', 'צ': 'ch', 'ץ': 'ch', 'ז': 'zh', 'ת': 't' }
function translitWord(w) {
  const chars = [...w.replace(/[֑-ׇ]/g, '')] // strip niqqud/cantillation
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    const next = chars[i + 1]
    const first = i === 0
    const last = i === chars.length - 1 || !HEB.test(next || '')
    if ((next === "'" || next === '׳') && GERESH[c]) {
      out += GERESH[c]
      i++
      continue
    }
    switch (c) {
      case 'א': out += first || last ? 'a' : ''; break
      case 'ב': out += first ? 'b' : 'v'; break
      case 'ג': out += 'g'; break
      case 'ד': out += 'd'; break
      case 'ה': out += last ? 'a' : 'h'; break
      case 'ו':
        if (next === 'ו') { out += 'v'; i++ } else out += first ? 'v' : 'o'
        break
      case 'ז': out += 'z'; break
      case 'ח': out += 'j'; break
      case 'ט': out += 't'; break
      case 'י':
        if (next === 'י') { out += 'y'; i++ } else out += first ? 'y' : 'i'
        break
      case 'כ': out += first ? 'k' : 'j'; break
      case 'ך': out += 'j'; break
      case 'ל': out += 'l'; break
      case 'מ': case 'ם': out += 'm'; break
      case 'נ': case 'ן': out += 'n'; break
      case 'ס': out += 's'; break
      case 'ע': out += 'a'; break
      case 'פ': out += first ? 'p' : 'f'; break
      case 'ף': out += 'f'; break
      case 'צ': case 'ץ': out += 'tz'; break
      case 'ק': out += 'k'; break
      case 'ר': out += 'r'; break
      case 'ש': out += 'sh'; break
      case 'ת': out += 't'; break
      case '״': out += '"'; break
      case '׳': break
      default: out += c
    }
  }
  return out
}

export function transliterate(text) {
  const s = text.replace(/[֐-׿'׳״]+/g, (w) => translitWord(w))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// --- Auto-translation of missing strings -----------------------------------

const pending = new Set()
const requested = new Set()
let timer = null
let onTranslated = null

/** Called (e.g. to refetch queries) after new translations arrive. */
export function setOnContentTranslated(fn) {
  onTranslated = fn
}

async function flush() {
  timer = null
  const texts = [...pending]
  pending.clear()
  if (!texts.length) return
  const { data: sess } = await supabase.auth.getSession()
  if (!isEditor(sess.session)) return // only editors may trigger translation
  let added = 0
  for (let i = 0; i < texts.length; i += 80) {
    const { data, error } = await supabase.functions.invoke('translate-content', { body: { texts: texts.slice(i, i + 80) } })
    if (error || !data?.translations) {
      console.warn('[contentI18n] auto-translation unavailable:', error?.message || data?.error)
      return
    }
    for (const r of data.translations) {
      map.set(r.source, r.es)
      added++
    }
  }
  if (added && onTranslated) onTranslated()
}

/** Queue Hebrew strings for translation (no-op for already translated ones). */
export function requestTranslation(texts) {
  for (const s of texts) {
    if (typeof s !== 'string' || !HEB.test(s) || map.has(s) || requested.has(s)) continue
    requested.add(s)
    pending.add(s)
  }
  if (pending.size && !timer) timer = setTimeout(flush, 800)
}

// --- Public API -------------------------------------------------------------

/** Translate one content string for display. */
export function tc(text) {
  if (!active || typeof text !== 'string' || !HEB.test(text)) return text
  let shown = map.get(text)
  if (shown == null) {
    if (active) requestTranslation([text])
    shown = transliterate(text)
  }
  reverse.set(shown, text)
  return shown
}

/** Translated copy of a DB row (or the row itself in Hebrew mode). */
export function translateRow(table, row) {
  const fields = CONTENT_FIELDS[table]
  if (!active || !fields || !row) return row
  const out = { ...row }
  for (const f of fields) if (typeof out[f] === 'string') out[f] = tc(out[f])
  return out
}

/** Maps displayed (translated) values the user didn't change back to the Hebrew source before writing. */
export function untranslateValues(table, values) {
  const fields = CONTENT_FIELDS[table]
  if (!active || !fields || !values) return values
  const out = { ...values }
  for (const f of fields) if (typeof out[f] === 'string' && reverse.has(out[f])) out[f] = reverse.get(out[f])
  return out
}

/** Hebrew source of a displayed string (identity if unknown). */
export const untranslate = (text) => (typeof text === 'string' && reverse.has(text) ? reverse.get(text) : text)

/** After a save: make sure every new content string gets a translation. */
export function translateSavedRow(table, row) {
  const fields = CONTENT_FIELDS[table]
  if (!fields || !row) return
  requestTranslation(fields.map((f) => row[f]))
}
