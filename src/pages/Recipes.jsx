import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Trash2, Copy, Search, BookOpen, MoreVertical, Pencil, Lock, Printer, LayoutGrid, List, GripVertical, Check, X, ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import PrintAllRecipes from '@/pages/print/PrintAllRecipes'

function RecipeCategoryDialog({ category, onSave, onClose }) {
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
          <Button onClick={() => onSave(name)} disabled={!name.trim()}>
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Recipes() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { editor } = useEditor()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [showPrintAll, setShowPrintAll] = useState(false)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('recipes_view_mode') || 'grid')
  const [reordering, setReordering] = useState(false)
  const [localOrder, setLocalOrder] = useState(null) // optimistic order while a drag's persist mutation is in flight
  const [sortDir, setSortDir] = useState(null) // null (custom order) | 'asc' | 'desc' (alphabetical)
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [categoryDialog, setCategoryDialog] = useState(null) // null | 'new' | category row
  const [deleteCategoryId, setDeleteCategoryId] = useState(null)

  useEffect(() => localStorage.setItem('recipes_view_mode', viewMode), [viewMode])

  const { data: recipes = [], isLoading } = useQuery({ queryKey: ['recipes'], queryFn: () => db.Recipe.list('order') })
  const { data: categories = [] } = useQuery({ queryKey: ['recipe_categories'], queryFn: () => db.RecipeCategory.list('name') })

  const filtered = useMemo(() => {
    let base = localOrder || recipes
    if (activeCategoryId) base = base.filter((r) => r.category_id === activeCategoryId)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      base = base.filter((r) => r.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
    }
    if (sortDir) {
      base = [...base].sort((a, b) => (sortDir === 'asc' ? 1 : -1) * (a.name || '').localeCompare(b.name || '', 'he'))
    }
    return base
  }, [recipes, localOrder, search, activeCategoryId, sortDir])

  const cycleSort = () => {
    setReordering(false)
    setSortDir((d) => (d === null ? 'asc' : d === 'asc' ? 'desc' : null))
  }

  const saveCategoryMutation = useMutation({
    mutationFn: (name) => (categoryDialog?.id ? db.RecipeCategory.update(categoryDialog.id, { name }) : db.RecipeCategory.create({ name })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_categories'] })
      setCategoryDialog(null)
      toast({ title: 'הקטגוריה נשמרה' })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => db.RecipeCategory.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['recipe_categories'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      if (activeCategoryId === id) setActiveCategoryId(null)
      setDeleteCategoryId(null)
      toast({ title: 'הקטגוריה נמחקה' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const steps = await db.RecipeStep.filter({ recipe_id: id })
      await Promise.all(steps.map((s) => db.RecipeStep.delete(s.id)))
      await db.Recipe.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast({ title: 'המתכון נמחק' })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async (recipe) => {
      const { id, created_at, ...data } = recipe
      const newRecipe = await db.Recipe.create({ ...data, name: `${data.name} (עותק)` })
      const steps = await db.RecipeStep.filter({ recipe_id: id }, 'order')
      await Promise.all(steps.map(({ id: sid, created_at: ca, ...step }) => db.RecipeStep.create({ ...step, recipe_id: newRecipe.id })))
      return newRecipe
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast({ title: 'המתכון שוכפל בהצלחה' })
    },
  })

  const onDragEnd = (result) => {
    if (!result.destination || search.trim()) return
    const reordered = Array.from(recipes)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setLocalOrder(reordered)
    Promise.all(reordered.map((r, idx) => db.Recipe.update(r.id, { order: idx }))).then(() => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      setLocalOrder(null)
    })
  }

  const openRecipe = (recipe) => navigate(`/recipes/${recipe.id}`)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">מתכונים</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card shadow-soft text-foreground' : 'text-muted-foreground'}`}
              title="תצוגת סמלים"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card shadow-soft text-foreground' : 'text-muted-foreground'}`}
              title="תצוגת רשימה"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button
            variant={sortDir ? 'default' : 'outline'}
            size="icon"
            onClick={cycleSort}
            title={sortDir === 'asc' ? 'מסודר א-ת (לחץ להפוך ת-א)' : sortDir === 'desc' ? 'מסודר ת-א (לחץ לביטול המיון)' : 'מיין לפי א-ב'}
          >
            {sortDir === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : sortDir === 'desc' ? <ArrowUpAZ className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
          </Button>
          {editor && (
            <Button
              variant={reordering ? 'default' : 'outline'}
              size="icon"
              onClick={() => {
                setSortDir(null)
                setReordering((v) => !v)
              }}
              title={reordering ? 'סיים סידור מחדש' : 'שנה את סדר המתכונים'}
              disabled={!!search.trim()}
            >
              {reordering ? <Check className="w-4 h-4" /> : <GripVertical className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setShowPrintAll(true)}>
            <Printer className="w-4 h-4" />
            ספר מתכונים
          </Button>
          {editor ? (
            <Button className="gap-2 shadow-soft" onClick={() => navigate('/recipes/new')}>
              <Plus className="w-4 h-4" />
              מתכון חדש
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Lock className="w-3 h-3" />
              צפייה בלבד
            </span>
          )}
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש מתכון..." className="pr-9" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setActiveCategoryId(null)}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            !activeCategoryId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'
          }`}
        >
          הכל
        </button>
        {categories.map((c) => (
          <div key={c.id} className="group relative">
            <button
              onClick={() => setActiveCategoryId(c.id === activeCategoryId ? null : c.id)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                activeCategoryId === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'
              } ${editor ? 'pl-6' : ''}`}
            >
              {c.name}
            </button>
            {editor && (
              <span className="absolute left-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCategoryDialog(c)
                  }}
                  className="p-0.5 rounded-full hover:bg-black/10"
                  title="שינוי שם"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteCategoryId(c.id)
                  }}
                  className="p-0.5 rounded-full hover:bg-black/10"
                  title="מחיקה"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>
        ))}
        {editor && (
          <button
            onClick={() => setCategoryDialog('new')}
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/50 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            קטגוריה
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl shadow-soft">
          <BookOpen className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground font-medium text-lg">{recipes.length === 0 ? 'אין מתכונים עדיין' : 'לא נמצאו מתכונים תואמים'}</p>
          {editor && recipes.length === 0 && (
            <Button variant="outline" className="mt-5 gap-2" onClick={() => navigate('/recipes/new')}>
              <Plus className="w-4 h-4" />
              צור מתכון ראשון
            </Button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="recipes" isDropDisabled={!reordering} direction={viewMode === 'grid' ? 'horizontal' : 'vertical'}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={viewMode === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3' : 'space-y-2'}
              >
                {filtered.map((recipe, i) => (
                  <Draggable key={recipe.id} draggableId={recipe.id} index={i} isDragDisabled={!reordering}>
                    {(dragProvided, snapshot) =>
                      viewMode === 'grid' ? (
                        <motion.div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          layout
                          onClick={() => !reordering && openRecipe(recipe)}
                          className={`rounded-xl group relative flex flex-col items-center text-center border border-border bg-card shadow-soft transition-all duration-200 p-2.5 ${
                            reordering ? '' : 'cursor-pointer'
                          } ${snapshot.isDragging ? 'shadow-card-hover' : 'hover:shadow-card-hover hover:-translate-y-0.5'}`}
                        >
                          {reordering ? (
                            <div {...dragProvided.dragHandleProps} className="absolute top-1 right-1 p-1 rounded-full bg-muted cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          ) : (
                            editor && (
                              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button onClick={(e) => e.stopPropagation()} className="rounded-full bg-card hover:bg-muted p-1 shadow-md border border-border flex items-center justify-center">
                                      <MoreVertical className="w-3.5 h-3.5 text-foreground" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-40" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onClick={() => navigate(`/recipes/${recipe.id}/edit`)} className="gap-2">
                                      <Pencil className="w-4 h-4" />
                                      <span>עריכה</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => duplicateMutation.mutate(recipe)} className="gap-2">
                                      <Copy className="w-4 h-4" />
                                      <span>שכפול</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeleteId(recipe.id)} className="gap-2 text-destructive focus:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                      <span>מחיקה</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )
                          )}

                          <h3 className="font-heading font-semibold text-xs leading-tight w-full py-2 line-clamp-3 min-h-[3em] flex items-center justify-center">{recipe.name}</h3>
                        </motion.div>
                      ) : (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 shadow-soft ${snapshot.isDragging ? 'shadow-card-hover' : ''}`}
                        >
                          {reordering && (
                            <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground flex-shrink-0">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !reordering && openRecipe(recipe)}>
                            <p className="font-semibold text-sm truncate">{recipe.name}</p>
                            {recipe.description && <p className="text-xs text-muted-foreground truncate">{recipe.description}</p>}
                          </div>
                          {!reordering && editor && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center flex-shrink-0">
                                  <MoreVertical className="w-4 h-4 text-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40">
                                <DropdownMenuItem onClick={() => navigate(`/recipes/${recipe.id}/edit`)} className="gap-2">
                                  <Pencil className="w-4 h-4" />
                                  <span>עריכה</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateMutation.mutate(recipe)} className="gap-2">
                                  <Copy className="w-4 h-4" />
                                  <span>שכפול</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteId(recipe.id)} className="gap-2 text-destructive focus:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                  <span>מחיקה</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      )
                    }
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {showPrintAll && <PrintAllRecipes onClose={() => setShowPrintAll(false)} />}

      {categoryDialog && (
        <RecipeCategoryDialog
          category={categoryDialog !== 'new' ? categoryDialog : null}
          onSave={(name) => saveCategoryMutation.mutate(name)}
          onClose={() => setCategoryDialog(null)}
        />
      )}

      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קטגוריה</AlertDialogTitle>
            <AlertDialogDescription>המתכונים בקטגוריה זו לא יימחקו, אך יישארו ללא קטגוריה.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCategoryMutation.mutate(deleteCategoryId)} className="bg-destructive hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מתכון</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח? פעולה זו תמחק את המתכון וכל שלביו ולא ניתן לשחזרה.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(deleteId)
                setDeleteId(null)
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
