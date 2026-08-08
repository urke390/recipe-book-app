import { Dialog, DialogContent } from '@/components/ui/dialog'

// Shared shell for showing a print/summary page as an in-app modal instead of
// navigating to a separate route. #print-root inside still works exactly the
// same for window.print() (index.css's @media print rules toggle visibility
// on the whole body, regardless of how deep #print-root is nested).
export default function PrintModal({ onClose, title, actions, children }) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="print-modal-content max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4 duration-300">
        <div className="no-print flex-shrink-0 flex items-center gap-2 border-b border-border px-4 py-3 pl-12 bg-card">
          <span className="flex-1 font-semibold text-sm truncate">{title}</span>
          {actions}
        </div>
        <div className="print-modal-body flex-1 overflow-y-auto bg-background">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
