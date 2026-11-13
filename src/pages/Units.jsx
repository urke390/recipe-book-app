import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2, Ruler, Lock } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { t } from '@/lib/i18n'

function UnitDialog({ unit, onSave, onClose }) {
  const [name, setName] = useState(unit?.name || '')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{unit ? t('עריכת יחידת מידה') : t('יחידת מידה חדשה')}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="mb-1 block">{t('שם *')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('לדוגמה: כוס')} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('ביטול')}
          </Button>
          <Button onClick={() => onSave(name.trim())} disabled={!name.trim()}>
            {t('שמור')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Manages the `units` table backing every unit picker in the app
// (StepRowEditor's ingredient/step unit select) - a plain text field on
// recipe_steps, not a foreign key, so renaming or deleting a unit here
// never breaks an existing recipe's already-stored value.
export default function Units() {
  const { toast } = useToast()
  const { editor } = useEditor()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: units = [], isLoading } = useQuery({ queryKey: ['units'], queryFn: () => db.Unit.list('order') })

  const saveMutation = useMutation({
    mutationFn: (name) => (dialog?.id ? db.Unit.update(dialog.id, { name }) : db.Unit.create({ name, order: units.length })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      setDialog(null)
      toast({ title: t('היחידה נשמרה') })
    },
    onError: (err) => toast({ title: t('שגיאה בשמירה'), description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => db.Unit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      setDeleteId(null)
      toast({ title: t('היחידה נמחקה') })
    },
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Ruler className="w-6 h-6 text-primary" />
            {t('יחידות מידה')}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('היחידות הזמינות לבחירה ברכיבים ובשלבי מתכון')}</p>
        </div>
        {editor ? (
          <Button onClick={() => setDialog('new')} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('יחידה חדשה')}
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3" />
            {t('צפייה בלבד')}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : units.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl shadow-soft">
          <Ruler className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground font-medium">{t('אין יחידות מידה עדיין')}</p>
          {editor && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setDialog('new')}>
              <Plus className="w-4 h-4" />
              {t('הוסף יחידה ראשונה')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {units.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-2 shadow-soft hover:shadow-card transition-shadow">
              <span className="flex-1 min-w-0 truncate font-medium text-sm">{u.name}</span>
              {editor && (
                <div className="flex gap-0.5 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog(u)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && <UnitDialog unit={dialog !== 'new' ? dialog : null} onSave={(name) => saveMutation.mutate(name)} onClose={() => setDialog(null)} />}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('מחיקת יחידת מידה')}</AlertDialogTitle>
            <AlertDialogDescription>{t('מתכונים ורכיבים שכבר משתמשים ביחידה הזו ימשיכו להציג אותה כטקסט - רק לא תופיע יותר ברשימת הבחירה.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('ביטול')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive hover:bg-destructive/90">
              {t('מחק')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
