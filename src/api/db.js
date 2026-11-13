import { supabase } from '@/lib/supabaseClient'
import { translateRow, untranslateValues, translateSavedRow } from '@/lib/contentI18n'

// Thin wrapper around supabase.from(table) giving each table a small
// consistent API (list/filter/get/create/update/delete) instead of
// repeating supabase-js query chains across every page component.
function parseSort(sort) {
  if (!sort) return null
  const desc = sort.startsWith('-')
  const column = desc ? sort.slice(1) : sort
  return { column, ascending: !desc }
}

// Content rows are translated for display when the UI is in Spanish, and
// mapped back to their Hebrew source on write - see src/lib/contentI18n.js.
function entity(table) {
  const tr = (row) => translateRow(table, row)
  return {
    async list(sort) {
      let q = supabase.from(table).select('*')
      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      const { data, error } = await q
      if (error) throw error
      return data.map(tr)
    },
    async filter(query = {}, sort) {
      let q = supabase.from(table).select('*').match(query)
      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      const { data, error } = await q
      if (error) throw error
      return data.map(tr)
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
      if (error) throw error
      return tr(data)
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(untranslateValues(table, values)).select().single()
      if (error) throw error
      translateSavedRow(table, data)
      return tr(data)
    },
    async update(id, values) {
      const { data, error } = await supabase.from(table).update(untranslateValues(table, values)).eq('id', id).select().single()
      if (error) throw error
      translateSavedRow(table, data)
      return tr(data)
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      return true
    },
  }
}

export const db = {
  Parameter: entity('parameters'),
  Unit: entity('units'),
  Recipe: entity('recipes'),
  RecipeCategory: entity('recipe_categories'),
  RecipeStep: entity('recipe_steps'),
  ProductionSession: entity('production_sessions'),
  FeedbackNote: entity('feedback_notes'),
  Branding: entity('app_branding'),
}
