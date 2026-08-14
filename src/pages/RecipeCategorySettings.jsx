import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2, Tag, Lock } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'

function CategoryDialog({ category, onSave, onClose }) {
  const [name, setName] = useState(category?.name || '')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="mb-1 block">שם קטגוריה *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: עוגות" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={() => onSave(name.trim())} disabled={!name.trim()}>
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Manages the `recipe_categories` table used to filter recipes on the
// Recipes page - creation/editing/deletion lives here in Settings, the
// Recipes page itself only shows the filter chips.
export default function RecipeCategorySettings() {
  const { toast } = useToast()
  const { editor } = useEditor()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: categories = [], isLoading } = useQuery({ queryKey: ['recipe_categories'], queryFn: () => db.RecipeCategory.list('name') })

  const saveMutation = useMutation({
    mutationFn: (name) => (dialog?.id ? db.RecipeCategory.update(dialog.id, { name }) : db.RecipeCategory.create({ name })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_categories'] })
      setDialog(null)
      toast({ title: 'הקטגוריה נשמרה' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => db.RecipeCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_categories'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      setDeleteId(null)
      toast({ title: 'הקטגוריה נמחקה' })
    },
  })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            קטגוריות מתכונים
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">הקטגוריות הזמינות לסינון מתכונים</p>
        </div>
        {editor ? (
          <Button onClick={() => setDialog('new')} className="gap-2">
            <Plus className="w-4 h-4" />
            קטגוריה חדשה
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3" />
            צפייה בלבד
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl shadow-soft">
          <Tag className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground font-medium">אין קטגוריות עדיין</p>
          {editor && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setDialog('new')}>
              <Plus className="w-4 h-4" />
              הוסף קטגוריה ראשונה
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {categories.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-2 shadow-soft hover:shadow-card transition-shadow">
              <span className="flex-1 min-w-0 truncate font-medium text-sm">{c.name}</span>
              {editor && (
                <div className="flex gap-0.5 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog(c)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog && <CategoryDialog category={dialog !== 'new' ? dialog : null} onSave={(name) => saveMutation.mutate(name)} onClose={() => setDialog(null)} />}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קטגוריה</AlertDialogTitle>
            <AlertDialogDescription>המתכונים בקטגוריה זו לא יימחקו, אך יישארו ללא קטגוריה.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
