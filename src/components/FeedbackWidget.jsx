import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquarePlus, MousePointerClick, X } from 'lucide-react'
import { db } from '@/api/db'
import { getPageLabel } from '@/lib/pageLabels'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

function describeElement(el) {
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const text = (el.innerText || '').trim().replace(/\s+/g, ' ')
  const label = el.getAttribute('aria-label') || el.getAttribute('title') || text.slice(0, 60) || el.tagName.toLowerCase()
  const classes = typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 8).join(' ') : ''
  return {
    tag: el.tagName.toLowerCase(),
    label,
    text: text.slice(0, 140),
    classes,
    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
  }
}

// Floating button + "inspector" picker: click it, hover highlights whatever's
// under the cursor, clicking an element captures a description of it (tag,
// visible text/label, classes, position) instead of just the page - so a
// note about one specific button/section is unambiguous without describing
// it in words. Escape skips picking and leaves a page-level note instead.
export default function FeedbackWidget() {
  const { toast } = useToast()
  const location = useLocation()
  const rootRef = useRef(null)
  const [picking, setPicking] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [hoverEl, setHoverEl] = useState(null)
  const [target, setTarget] = useState(null) // description of the picked element, or null for a general page note
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const pageLabel = getPageLabel(location.pathname)

  useEffect(() => {
    if (!picking) return

    const isOwn = (el) => el && rootRef.current && rootRef.current.contains(el)

    const onMove = (e) => {
      if (isOwn(e.target)) return
      setHoverEl(e.target)
    }
    const onClick = (e) => {
      if (isOwn(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      setTarget(describeElement(e.target))
      setPicking(false)
      setDialogOpen(true)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPicking(false)
        setTarget(null)
        setDialogOpen(true)
      }
    }

    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKeyDown, true)
    document.body.style.cursor = 'crosshair'
    return () => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('keydown', onKeyDown, true)
      document.body.style.cursor = ''
    }
  }, [picking])

  // The "click here" banner sits over the top of the screen, which can cover
  // the exact nav elements someone would want to pick - so it self-dismisses
  // after a couple seconds instead of staying up for the whole picking session.
  useEffect(() => {
    if (!picking) return
    setBannerVisible(true)
    const timer = setTimeout(() => setBannerVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [picking])

  const hoverRect = hoverEl?.getBoundingClientRect()

  const startPicking = () => {
    setTarget(null)
    setHoverEl(null)
    setPicking(true)
  }

  const cancelPicking = () => {
    setPicking(false)
    setHoverEl(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!note.trim()) return
    setBusy(true)
    try {
      await db.FeedbackNote.create({
        path: location.pathname + location.search,
        note: note.trim(),
        meta: {
          page_label: pageLabel,
          title: document.title,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          element: target,
        },
      })
      toast({ title: 'נשמר', description: 'נמשיך מזה בפעם הבאה' })
      setNote('')
      setTarget(null)
      setDialogOpen(false)
    } catch (err) {
      toast({ title: 'שגיאה בשמירה', description: err.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  // Stops pointerdown/mouseup/click from ever reaching `document`. Radix's
  // modal dialogs decide whether a click should dismiss them by watching for
  // exactly these event types landing on `document` - relying on their own
  // onPointerDownOutside/preventDefault composition turned out unreliable in
  // practice (it depends on internal deferred-event plumbing), but stopping
  // propagation here means Radix's listeners never see the click at all, so
  // there's nothing for them to dismiss on.
  const keepEventLocal = (e) => e.stopPropagation()

  return (
    <div
      ref={rootRef}
      data-feedback-widget
      onPointerDown={keepEventLocal}
      onPointerUp={keepEventLocal}
      onMouseDown={keepEventLocal}
      onMouseUp={keepEventLocal}
      onTouchStart={keepEventLocal}
      onTouchEnd={keepEventLocal}
      onClick={keepEventLocal}
    >
      {!picking && (
        <button
          onClick={startPicking}
          // Explicit pointer-events-auto matters here: Radix Dialog/Sheet set
          // `document.body.style.pointerEvents = 'none'` while modal, which
          // this button would otherwise inherit and become unclickable even
          // though it's visually on top (raised z-index alone isn't enough).
          className="fixed bottom-20 md:bottom-6 left-4 z-[60] w-12 h-12 rounded-full bg-foreground text-background shadow-card-hover flex items-center justify-center hover:scale-105 active:scale-95 transition-transform pointer-events-auto"
          title="סמן חלק במסך והשאר הערה"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>
      )}

      {picking && (
        <>
          {hoverRect && (
            <div
              className="fixed z-[9998] pointer-events-none border-2 border-primary bg-primary/10 rounded-sm transition-[top,left,width,height] duration-75"
              style={{ top: hoverRect.top, left: hoverRect.left, width: hoverRect.width, height: hoverRect.height }}
            />
          )}
          {bannerVisible && (
            <div className="fixed top-3 inset-x-0 z-[9999] flex justify-center pointer-events-none transition-opacity">
              <div className="pointer-events-auto bg-foreground text-background text-sm font-medium rounded-full shadow-card-hover px-4 py-2 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4" />
                <span>לחץ על החלק שברצונך להעיר עליו</span>
                <button onClick={cancelPicking} className="mr-1 rounded-full hover:bg-background/20 p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>הערה על "{pageLabel}"</DialogTitle>
              <DialogDescription>
                {target ? (
                  <>
                    מצורף: <span className="font-medium text-foreground">{target.label}</span> ({target.tag})
                  </>
                ) : (
                  'הערה כללית על העמוד (לא נבחר אלמנט ספציפי)'
                )}
              </DialogDescription>
            </DialogHeader>
            {!target && (
              <button type="button" onClick={() => { setDialogOpen(false); startPicking() }} className="text-xs text-primary hover:underline -mt-2 mb-1">
                רוצה לסמן אלמנט ספציפי במקום?
              </button>
            )}
            <textarea
              autoFocus
              dir="rtl"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="מה תרצה לשפר כאן?"
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <DialogFooter className="mt-3">
              <Button type="submit" disabled={busy || !note.trim()}>
                {busy ? 'שומר...' : 'שמור הערה'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
