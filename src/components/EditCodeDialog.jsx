import { useState } from 'react'
import { Lock, Unlock, LogOut } from 'lucide-react'
import { db } from '@/api/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useEditor } from '@/hooks/useEditor'
import { useToast } from '@/components/ui/use-toast'

// Small lock/unlock button for the header. Anyone can browse the app; this
// is the only place the shared edit code is entered, once per device - and,
// once entered, the only place to leave editor mode again on that device.
export default function EditCodeDialog() {
  const { toast } = useToast()
  const { editor, redeem, logout, error } = useEditor()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const ok = await redeem(code)
    setBusy(false)
    if (ok) {
      setOpen(false)
      setCode('')
    }
  }

  const performLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      toast({ title: 'יצאת ממצב עריכה' })
    } finally {
      setLoggingOut(false)
    }
  }

  // Exiting editor mode mints this device a fresh anonymous identity, which
  // would orphan any production session it currently owns (guided
  // production is per-device, see 0011_personal_production_sessions.sql) -
  // rather than leaving a dead, inaccessible row behind, warn and let the
  // user choose to actually delete it or stay logged in instead.
  const handleLogout = async () => {
    const active = await db.ProductionSession.filter({ status: 'active' })
    if (active.length > 0) {
      setConfirmExit(true)
      return
    }
    await performLogout()
  }

  const handleConfirmExit = async () => {
    setLoggingOut(true)
    try {
      const active = await db.ProductionSession.filter({ status: 'active' })
      await Promise.all(active.map((s) => db.ProductionSession.delete(s.id)))
      await logout()
      toast({ title: 'יצאת ממצב עריכה', description: 'הייצור המודרך הפעיל נמחק' })
    } finally {
      setLoggingOut(false)
      setConfirmExit(false)
    }
  }

  if (editor) {
    return (
      <>
        <span className="flex items-center gap-1.5 text-xs text-white/80">
          <Unlock className="w-3.5 h-3.5" />
          עריכה פעילה
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="צא ממצב עריכה"
            className="mr-0.5 rounded-md p-1 hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </span>

        <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>יציאה ממצב עריכה</AlertDialogTitle>
              <AlertDialogDescription>יש לך ייצור מודרך פעיל במכשיר הזה. יציאה ממצב עריכה תמחק אותו לצמיתות.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>המשך במצב עריכה</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmExit} disabled={loggingOut} className="bg-destructive hover:bg-destructive/90">
                צא בכל זאת
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/15 transition-colors"
      >
        <Lock className="w-4 h-4" />
        מצב עריכה
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>הזן קוד עריכה</DialogTitle>
              <DialogDescription>צפייה פתוחה לכולם; עריכה ותפעול ייצור דורשים את הקוד המשותף.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                autoFocus
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="קוד עריכה"
              />
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy || !code}>
                {busy ? 'בודק...' : 'אשר'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
