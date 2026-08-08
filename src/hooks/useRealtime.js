import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Keeps a single row in sync via Supabase Realtime - every device viewing the
// same id sees updates from any other device within ~1s, no polling.
export function useRealtimeRow(table, id) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const instanceIdRef = useRef(Math.random().toString(36).slice(2))

  useEffect(() => {
    if (!id) {
      setRow(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (active) {
          setRow(data || null)
          setLoading(false)
        }
      })

    const channel = supabase
      .channel(`row-${table}-${id}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `id=eq.${id}` }, (payload) => {
        if (payload.eventType === 'DELETE') setRow(null)
        else setRow(payload.new)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [table, id])

  return { row, loading, setRow }
}

// Keeps a filtered list of rows in sync (e.g. all production_sessions with
// status=active) via Realtime, seeded with an initial fetch. setRows is
// exposed because Supabase's realtime filter is evaluated against the row's
// NEW value - once an update moves a row OUT of the filter (e.g. status
// changes away from 'active'), the server never sends that update to this
// subscription at all, so a row a caller just closed themselves needs to be
// removed from local state manually instead of waiting for a realtime event
// that will never arrive.
export function useRealtimeList(table, filterColumn, filterValue) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const instanceIdRef = useRef(Math.random().toString(36).slice(2))

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from(table)
      .select('*')
      .eq(filterColumn, filterValue)
      .then(({ data }) => {
        if (active) {
          setRows(data || [])
          setLoading(false)
        }
      })

    const channel = supabase
      .channel(`list-${table}-${filterColumn}-${filterValue}-${instanceIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `${filterColumn}=eq.${filterValue}` }, (payload) => {
        setRows((prev) => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new]
          if (payload.eventType === 'UPDATE') return prev.map((r) => (r.id === payload.new.id ? payload.new : r))
          if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== payload.old.id)
          return prev
        })
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [table, filterColumn, filterValue])

  return { rows, loading, setRows }
}
