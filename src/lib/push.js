import { supabase } from '@/lib/supabaseClient'
import { t, getLang } from '@/lib/i18n'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  return reg ? reg.pushManager.getSubscription() : null
}

// Registers the service worker (if needed), asks for notification permission,
// subscribes to Web Push, and saves the subscription so the scheduled
// notifier function can reach this device even when the app isn't open.
export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error(t('דפדפן זה לא תומך בהתראות Push'))

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(t('ההרשאה להתראות נדחתה'))

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const json = subscription.toJSON()
  // Plain insert (matched against our RLS policies) rather than upsert -
  // Postgres's ON CONFLICT DO UPDATE path under RLS is finicky, so we just
  // clear any stale row for this endpoint first and insert fresh.
  await supabase.from('push_subscriptions').delete().eq('endpoint', json.endpoint)
  const { error } = await supabase.from('push_subscriptions').insert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, lang: getLang() })
  if (error) throw error
  return subscription
}

// Keeps this device's subscription in the current UI language so timer
// notifications arrive in it (called once at startup).
export async function syncPushLanguage() {
  try {
    const sub = await getPushSubscription()
    if (sub) await supabase.from('push_subscriptions').update({ lang: getLang() }).eq('endpoint', sub.endpoint)
  } catch {
    // best effort
  }
}

export async function unsubscribeFromPush() {
  const sub = await getPushSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
