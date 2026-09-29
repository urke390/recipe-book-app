import * as React from 'react'

import { cn } from '@/lib/utils'

// Single-line-looking text field that grows downward to fit its content, so
// long step text (common in action steps) stays fully visible while editing -
// a plain <input> cut it off, especially on a phone. Also re-fits whenever
// the text can re-wrap without the value changing: width changes (rotating a
// phone, resizing the window) and the web font finishing loading - measuring
// with the fallback font left the last line hidden.
const AutoTextarea = React.forwardRef(({ value, className, ...props }, forwardedRef) => {
  const ref = React.useRef(null)
  React.useImperativeHandle(forwardedRef, () => ref.current)

  const fit = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [])

  React.useLayoutEffect(fit, [value, fit])

  React.useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return
    let lastWidth = ref.current.offsetWidth
    const ro = new ResizeObserver(() => {
      const w = ref.current?.offsetWidth
      if (w !== lastWidth) {
        lastWidth = w
        fit()
      }
    })
    ro.observe(ref.current)
    const fonts = document.fonts
    fonts?.ready.then(fit)
    fonts?.addEventListener?.('loadingdone', fit)
    return () => {
      ro.disconnect()
      fonts?.removeEventListener?.('loadingdone', fit)
    }
  }, [fit])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn(
        'block w-full min-h-[1.75rem] resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-1 text-base leading-snug shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      {...props}
    />
  )
})
AutoTextarea.displayName = 'AutoTextarea'

export { AutoTextarea }
