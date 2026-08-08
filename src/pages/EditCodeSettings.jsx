import { useState } from 'react'
import { KeyRound, Eye, EyeOff } from 'lucide-react'
import { useEditor } from '@/hooks/useEditor'
import { updateEditCode } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export default function EditCodeSettings() {
  const { toast } = useToast()
  const { editor, ready } = useEditor()
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newCode !== confirmCode) {
      toast({ title: 'הקודים לא תואמים', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await updateEditCode(newCode)
      toast({ title: 'קוד העריכה עודכן' })
      setNewCode('')
      setConfirmCode('')
    } catch (err) {
      toast({ title: 'שגיאה', description: err.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  if (ready && !editor) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto w-full text-center py-24">
        <p className="text-muted-foreground">צריך להיות במצב עריכה כדי לשנות את הקוד.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary" />
          קוד עריכה
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">הקוד המשותף שפותח הרשאת עריכה וניהול ייצור בכל מכשיר</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 shadow-soft space-y-4">
        <div>
          <Label className="mb-1 block">קוד חדש</Label>
          <div className="relative">
            <Input type={show ? 'text' : 'password'} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="לפחות 4 תווים" dir="ltr" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label className="mb-1 block">אימות קוד חדש</Label>
          <Input type={show ? 'text' : 'password'} value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="הקלד שוב לאימות" dir="ltr" />
        </div>
        <Button type="submit" className="w-full" disabled={busy || newCode.length < 4}>
          {busy ? 'מעדכן...' : 'עדכן קוד'}
        </Button>
        <p className="text-xs text-muted-foreground">
          מכשירים שכבר קיבלו הרשאת עריכה בעבר יישארו עם ההרשאה גם אחרי השינוי — הקוד החדש נדרש רק במכשירים שירצו להצטרף מעכשיו.
        </p>
      </form>
    </div>
  )
}
