import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2, Sliders, Lock } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { t } from '@/lib/i18n'

function ParameterDialog({ parameter, onSave, onClose }) {
  const [name, setName] = useState(parameter?.name || '')
  const [unit, setUnit] = useState(parameter?.unit || '')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{parameter ? t('עריכת פרמטר') : t('פרמטר חדש')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1 block">{t('שם פרמטר *')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('לדוגמה: טמפרטורת תנור')} />
          </div>
          <div>
            <Label className="mb-1 block">{t('יחידת מידה')}</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t('לדוגמה: °C')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('ביטול')}
          </Button>
          <Button onClick={() => onSave({ name, unit })} disabled={!name}>
            {t('שמור')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Parameters() {
  const { toast } = useToast()
  const { editor } = useEditor()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: parameters = [], isLoading } = useQuery({ queryKey: ['parameters'], queryFn: () => db.Parameter.list('name') })

  const saveMutation = useMutation({
    mutationFn: (data) => (dialog?.id ? db.Parameter.update(dialog.id, data) : db.Parameter.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parameters'] })
      setDialog(null)
      toast({ title: t('הפרמטר נשמר') })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => db.Parameter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parameters'] })
      setDeleteId(null)
      toast({ title: t('הפרמטר נמחק') })
    },
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" />
            {t('פרמטרים')}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('פרמטרים קבועים המוצגים במהלך הייצור')}</p>
        </div>
        {editor ? (
          <Button onClick={() => setDialog('new')} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('פרמטר חדש')}
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
      ) : parameters.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl shadow-soft">
          <Sliders className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground font-medium">{t('אין פרמטרים עדיין')}</p>
          <p className="text-muted-foreground text-sm mt-1">{t('הוסף פרמטרים כגון טמפרטורות ו-pH')}</p>
          {editor && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setDialog('new')}>
              <Plus className="w-4 h-4" />
              {t('הוסף פרמטר ראשון')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parameters.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-soft hover:shadow-card transition-shadow">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{p.unit || t('ללא יחידת מידה')}</p>
              </div>
              {editor && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog(p)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && <ParameterDialog parameter={dialog !== 'new' ? dialog : null} onSave={(data) => saveMutation.mutate(data)} onClose={() => setDialog(null)} />}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('מחיקת פרמטר')}</AlertDialogTitle>
            <AlertDialogDescription>{t('האם למחוק פרמטר זה?')}</AlertDialogDescription>
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
