import { useEffect, useState } from 'react'
import { Bell, Smartphone, BellRing, BellOff } from 'lucide-react'
import SoundSettings from '@/components/SoundSettings'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { isPushSupported, getPushSubscription, subscribeToPush, unsubscribeFromPush } from '@/lib/push'

function PushSettings() {
  const { toast } = useToast()
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = isPushSupported()

  useEffect(() => {
    if (!supported) return
    getPushSubscription().then((sub) => setSubscribed(!!sub))
  }, [supported])

  const handleToggle = async () => {
    setBusy(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        setSubscribed(false)
        toast({ title: 'התראות כובו במכשיר זה' })
      } else {
        await subscribeToPush()
        setSubscribed(true)
        toast({ title: 'התראות הופעלו במכשיר זה' })
      }
    } catch (e) {
      toast({ title: 'שגיאה', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft space-y-3">
      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-primary" />
        התראות למכשיר הזה
      </h3>
      <p className="text-sm text-muted-foreground">
        כשמופעל, המכשיר הזה יקבל התראה גם אם האפליקציה סגורה או המסך כבוי - כשטיימר ייצור מסתיים. יש להפעיל בנפרד בכל מכשיר שרוצים שיקבל התראות.
      </p>
      {!supported ? (
        <p className="text-sm text-warning">הדפדפן הזה לא תומך בהתראות Push (ב-iPhone יש להוסיף את האתר למסך הבית תחילה).</p>
      ) : (
        <Button onClick={handleToggle} disabled={busy} variant={subscribed ? 'outline' : 'default'} className="gap-2">
          {subscribed ? (
            <>
              <BellOff className="w-4 h-4" />
              כבה התראות במכשיר זה
            </>
          ) : (
            <>
              <BellRing className="w-4 h-4" />
              הפעל התראות במכשיר זה
            </>
          )}
        </Button>
      )}
    </div>
  )
}

export default function AlertSound() {
  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto w-full space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          התראות
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">צליל והתראות בסיום טיימר ייצור</p>
      </div>
      <PushSettings />
      <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
        <SoundSettings />
      </div>
    </div>
  )
}
