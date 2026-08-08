import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Trash2, Copy, Search, BookOpen, MoreVertical, Pencil, Lock, Printer, LayoutGrid, List, GripVertical, Check } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import PrintAllRecipes from '@/pages/print/PrintAllRecipes'

// Curated tile gradients for recipes without a photo, paired with a simple
// glyph rather than mismatched emoji.
const TILE_GRADIENTS = [
  ['#F3C969', '#E8A33D'],
  ['#8FBF8A', '#5C9C63'],
  ['#E8B896', '#D18B5C'],
  ['#F0D08A', '#D9A441'],
  ['#A8C98A', '#79A65E'],
  ['#E3A6A0', '#C97A6E'],
]

function RecipeGlyph({ color }) {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
      <path d="M20 12c-3.5 0-6 3-6 6.5 0 3 1.8 5 4 6.3V50a2 2 0 0 0 4 0V24.8c2.2-1.3 4-3.3 4-6.3 0-3.5-2.5-6.5-6-6.5z" fill={color} fillOpacity="0.9" />
      <path d="M40 12v14c0 2.5-2 4-4.5 4.4V50a2 2 0 0 1-4 0V12h2v12h1.5V12h2v12H38V12h2z" fill={color} fillOpacity="0.9" />
    </svg>
  )
}

function RecipeTile({ recipe, index }) {
  const [from, to] = TILE_GRADIENTS[index % TILE_GRADIENTS.length]
  if (recipe.image_url) {
    return <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
  }
  return (
    <div className="h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <RecipeGlyph color="white" />
    </div>
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

  useEffect(() => localStorage.setItem('recipes_view_mode', viewMode), [viewMode])

  const { data: recipes = [], isLoading } = useQuery({ queryKey: ['recipes'], queryFn: () => db.Recipe.list('order') })

  const filtered = useMemo(() => {
    const base = localOrder || recipes
    if (!search.trim()) return base
    const q = search.trim().toLowerCase()
    return base.filter((r) => r.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
  }, [recipes, localOrder, search])

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
          {editor && (
            <Button
              variant={reordering ? 'default' : 'outline'}
              size="icon"
              onClick={() => setReordering((v) => !v)}
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

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש מתכון..." className="pr-9" />
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
                className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}
              >
                {filtered.map((recipe, i) => (
                  <Draggable key={recipe.id} draggableId={recipe.id} index={i} isDragDisabled={!reordering}>
                    {(dragProvided, snapshot) =>
                      viewMode === 'grid' ? (
                        <motion.div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          layout
                          className={`rounded-2xl group relative flex flex-col items-center text-center border border-border bg-card shadow-soft transition-all duration-200 p-4 ${
                            snapshot.isDragging ? 'shadow-card-hover' : 'hover:shadow-card-hover hover:-translate-y-0.5'
                          }`}
                        >
                          {reordering ? (
                            <div {...dragProvided.dragHandleProps} className="absolute top-2 right-2 p-1.5 rounded-full bg-muted cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                          ) : (
                            editor && (
                              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button onClick={(e) => e.stopPropagation()} className="rounded-full bg-card hover:bg-muted p-1.5 shadow-md border border-border flex items-center justify-center">
                                      <MoreVertical className="w-4 h-4 text-foreground" />
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

                          <h3
                            className="font-heading font-bold text-sm leading-tight cursor-pointer w-full px-5 line-clamp-2 min-h-[2.5em] flex items-center justify-center"
                            onClick={() => !reordering && openRecipe(recipe)}
                          >
                            {recipe.name}
                          </h3>

                          <div className="relative w-28 h-28 mt-3 mb-1 flex-shrink-0">
                            <div
                              className="w-full h-full rounded-full overflow-hidden shadow-card ring-4 ring-background cursor-pointer"
                              onClick={() => !reordering && openRecipe(recipe)}
                            >
                              <RecipeTile recipe={recipe} index={i} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>

                          {recipe.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{recipe.description}</p>}
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
                          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => !reordering && openRecipe(recipe)}>
                            <RecipeTile recipe={recipe} index={i} />
                          </div>
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
