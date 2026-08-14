import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2, Tag, ChevronLeft, Lock } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'

function CategoryDialog({ category, onSave, onClose, units }) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [isSelfIngredient, setIsSelfIngredient] = useState(false)
  const [unit, setUnit] = useState('גרם')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? 'עריכת כותרת' : 'כותרת חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1 block">שם כותרת *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: מחמצת" />
          </div>
          <div>
            <Label className="mb-1 block">תיאור</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור קצר..." />
          </div>
          {!category && (
            <>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={isSelfIngredient} onChange={(e) => setIsSelfIngredient(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">הכותרת היא הרכיב</span>
              </label>
              {isSelfIngredient && (
                <div>
                  <Label className="mb-1 block">יחידת מידה לרכיב</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.name}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={() => onSave({ name, description, isSelfIngredient, unit })} disabled={!name}>
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IngredientDialog({ ingredient, categoryId, onSave, onClose, units }) {
  const [name, setName] = useState(ingredient?.name || '')
  const [description, setDescription] = useState(ingredient?.description || '')
  const [defaultUnit, setDefaultUnit] = useState(ingredient?.default_unit || 'גרם')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{ingredient ? 'עריכת רכיב' : 'רכיב חדש'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1 block">שם רכיב *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: CH-3" />
          </div>
          <div>
            <Label className="mb-1 block">תיאור</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור קצר..." />
          </div>
          <div>
            <Label className="mb-1 block">יחידת מידה</Label>
            <Select value={defaultUnit} onValueChange={setDefaultUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={() => onSave({ name, description, default_unit: defaultUnit, category_id: categoryId })} disabled={!name}>
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Categories() {
  const { toast } = useToast()
  const { editor } = useEditor()
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [catDialog, setCatDialog] = useState(null)
  const [ingDialog, setIngDialog] = useState(null)
  const [deleteType, setDeleteType] = useState(null)

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => db.Category.list('name') })
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => db.Unit.list('order') })
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', selectedCategoryId],
    queryFn: () => db.Ingredient.filter({ category_id: selectedCategoryId }, 'name'),
    enabled: !!selectedCategoryId,
  })

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  const saveCatMutation = useMutation({
    mutationFn: ({ name, description }) => (catDialog?.id ? db.Category.update(catDialog.id, { name, description }) : db.Category.create({ name, description })),
    onSuccess: async (savedCat, variables) => {
      if (variables.isSelfIngredient) {
        await db.Ingredient.create({ name: variables.name, category_id: savedCat.id, default_unit: variables.unit })
        queryClient.invalidateQueries({ queryKey: ['ingredients', savedCat.id] })
      }
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setCatDialog(null)
      toast({ title: 'הכותרת נשמרה' })
    },
  })

  const deleteCatMutation = useMutation({
    mutationFn: async (id) => {
      const ings = await db.Ingredient.filter({ category_id: id })
      await Promise.all(ings.map((i) => db.Ingredient.delete(i.id)))
      return db.Category.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (selectedCategoryId === deleteType?.id) setSelectedCategoryId(null)
      setDeleteType(null)
      toast({ title: 'הכותרת נמחקה' })
    },
  })

  const saveIngMutation = useMutation({
    mutationFn: (data) => (ingDialog?.id ? db.Ingredient.update(ingDialog.id, data) : db.Ingredient.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', selectedCategoryId] })
      setIngDialog(null)
      toast({ title: 'הרכיב נשמר' })
    },
  })

  const deleteIngMutation = useMutation({
    mutationFn: (id) => db.Ingredient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients', selectedCategoryId] })
      setDeleteType(null)
      toast({ title: 'הרכיב נמחק' })
    },
  })

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            כותרות ורכיבים
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">ניהול קטגוריות ורכיבים למתכונים</p>
        </div>
        {!editor && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3" />
            צפייה בלבד
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/40">
            <h2 className="font-semibold">כותרות ({categories.length})</h2>
            {editor && (
              <Button size="sm" className="gap-1 text-xs" onClick={() => setCatDialog('new')}>
                <Plus className="w-3.5 h-3.5" />
                הוסף
              </Button>
            )}
          </div>
          <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">אין כותרות עדיין</p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                    selectedCategoryId === cat.id ? 'bg-primary/10 border-r-2 border-primary' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cat.name}</p>
                    {cat.description && <p className="text-xs text-muted-foreground truncate">{cat.description}</p>}
                  </div>
                  {selectedCategoryId === cat.id && <ChevronLeft className="w-4 h-4 text-primary" />}
                  {editor && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCatDialog(cat)
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteType({ type: 'cat', id: cat.id })
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/40">
            <h2 className="font-semibold">
              {selectedCategory ? `רכיבים — ${selectedCategory.name}` : 'רכיבים'}
              {selectedCategory && ` (${ingredients.length})`}
            </h2>
            {editor && selectedCategoryId && (
              <Button size="sm" className="gap-1 text-xs" onClick={() => setIngDialog('new')}>
                <Plus className="w-3.5 h-3.5" />
                הוסף
              </Button>
            )}
          </div>
          <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
            {!selectedCategoryId ? (
              <p className="text-center text-muted-foreground py-8 text-sm">בחר כותרת כדי לראות רכיבים</p>
            ) : ingredients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">אין רכיבים בכותרת זו</p>
            ) : (
              ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{ing.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ing.default_unit}
                      {ing.description && ` • ${ing.description}`}
                    </p>
                  </div>
                  {editor && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIngDialog(ing)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteType({ type: 'ing', id: ing.id })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {catDialog && <CategoryDialog category={catDialog !== 'new' ? catDialog : null} units={units} onSave={(data) => saveCatMutation.mutate(data)} onClose={() => setCatDialog(null)} />}
      {ingDialog && (
        <IngredientDialog
          ingredient={ingDialog !== 'new' ? ingDialog : null}
          categoryId={selectedCategoryId}
          units={units}
          onSave={(data) => saveIngMutation.mutate(data)}
          onClose={() => setIngDialog(null)}
        />
      )}

      <AlertDialog open={!!deleteType} onOpenChange={() => setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteType?.type === 'cat' ? 'מחיקת כותרת' : 'מחיקת רכיב'}</AlertDialogTitle>
            <AlertDialogDescription>{deleteType?.type === 'cat' ? 'פעולה זו תמחק את הכותרת וכל הרכיבים שבה.' : 'האם למחוק רכיב זה?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteType?.type === 'cat' ? deleteCatMutation.mutate(deleteType.id) : deleteIngMutation.mutate(deleteType.id)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
