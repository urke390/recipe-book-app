// Supabase Edge Function: notify-overdue-timers
//
// Runs on a schedule (via pg_cron, see supabase/migrations/0002_cron_notify.sql).
//
// Finds active production_sessions whose current wait_time step has just
// finished and sends a single Web Push - notified_at is set right after and
// never cleared until the step actually changes (advancing a step resets
// step_started_at/notified_at to null), so this fires exactly once per step,
// not a repeating nag.
//
// Deploy: supabase functions deploy notify-overdue-timers
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

async function sendPushToAll(supabase: ReturnType<typeof createClient>, subs: { endpoint: string; p256dh: string; auth: string }[], payload: Record<string, string>) {
  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload))
      sent++
    } catch (e) {
      // A dead/expired subscription - drop it so future runs don't keep retrying it.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }
  return sent
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth')

  // Overdue wait_time steps ---------------------------------------------------
  const { data: waitSessions, error: waitError } = await supabase
    .from('production_sessions')
    .select('id, recipe_name, step_started_at, step_duration_seconds, notified_at')
    .eq('status', 'active')
    .not('step_started_at', 'is', null)
    .not('step_duration_seconds', 'is', null)

  if (waitError) return new Response(JSON.stringify({ error: waitError.message }), { status: 500 })

  const now = Date.now()
  const dueWait = (waitSessions || []).filter((s) => {
    if (s.notified_at) return false // already sent once for this step
    const endsAt = new Date(s.step_started_at).getTime() + s.step_duration_seconds * 1000
    return endsAt <= now // just became overdue
  })

  let waitSent = 0
  for (const session of dueWait) {
    waitSent += await sendPushToAll(supabase, subs || [], { title: session.recipe_name || 'ספר מתכונים ביתי', body: 'הזמן הסתיים - חזרו לייצור', url: `/production/${session.id}` })
    await supabase.from('production_sessions').update({ notified_at: new Date().toISOString() }).eq('id', session.id)
  }

  return new Response(
    JSON.stringify({
      wait_checked: waitSessions?.length || 0,
      wait_due: dueWait.length,
      wait_sent: waitSent,
    })
  )
})
