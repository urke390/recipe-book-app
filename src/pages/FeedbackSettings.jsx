import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, Check, X, Trash2, Pencil, RotateCcw } from 'lucide-react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPageLabel } from '@/lib/pageLabels'

function formatRelative(iso) {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'עכשיו'
  if (diffMin < 60) return `לפני ${diffMin} דק'`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `לפני ${diffH} שע'`
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
}

const STATUS_LABEL = { open: 'פתוח', done: 'טופל', dismissed: 'נדחה' }
const STATUS_VARIANT = { open: 'warning', done: 'success', dismissed: 'secondary' }

// Defined at module scope (not inside FeedbackSettings) on purpose: a
// component re-created on every parent render gets a new identity each time,
// so React tears down and remounts it - including the <textarea> - on every
// keystroke. That's what was causing the cursor to reset to the start of the
// field after each character instead of just adding the fixing letter where
// you were typing.
function NoteRow({
  n,
  isEditing,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  saving,
  onSetStatus,
  onDelete,
  onNavigate,
  isReopening,
  reopenDraft,
  onReopenDraftChange,
  onStartReopen,
  onCancelReopen,
  onSubmitReopen,
  reopening,
  editingReasonIdx,
  reasonDraft,
  onReasonDraftChange,
  onStartEditReason,
  onCancelEditReason,
  onSaveEditReason,
  savingReason,
}) {
  const reopenHistory = n.meta?.reopen_history || []
  const busy = isEditing || isReopening || editingReasonIdx != null
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-soft flex gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <button onClick={() => onNavigate(n.path)} className="text-xs font-semibold text-primary hover:underline">
            {n.meta?.page_label || getPageLabel(n.path)}
          </button>
          {n.meta?.element?.label && <span className="text-xs text-muted-foreground">· {n.meta.element.label}</span>}
          <Badge variant={STATUS_VARIANT[n.status]}>{STATUS_LABEL[n.status]}</Badge>
          <span className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              dir="rtl"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={!draft.trim() || saving} onClick={onSaveEdit}>
                שמור
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelEdit}>
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{n.note}</p>
        )}

        {!isEditing && reopenHistory.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {reopenHistory.map((r, idx) =>
              editingReasonIdx === idx ? (
                <div key={idx} className="space-y-1.5">
                  <textarea
                    autoFocus
                    dir="rtl"
                    value={reasonDraft}
                    onChange={(e) => onReasonDraftChange(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" disabled={!reasonDraft.trim() || savingReason} onClick={onSaveEditReason}>
                      שמור
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelEditReason}>
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex items-start gap-1">
                  <p className="flex-1 text-xs text-warning bg-warning/10 rounded-md px-2 py-1.5 whitespace-pre-wrap">
                    <span className="font-semibold">הטיפול לא היה מספיק: </span>
                    {r.reason}
                    <span className="opacity-60"> · {formatRelative(r.at)}</span>
                  </p>
                  {!busy && (
                    <button onClick={() => onStartEditReason(idx, r.reason)} className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="ערוך את הסיבה">
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {isReopening && (
          <div className="space-y-2 mt-2">
            <textarea
              autoFocus
              dir="rtl"
              value={reopenDraft}
              onChange={(e) => onReopenDraftChange(e.target.value)}
              rows={3}
              placeholder="מה לא היה טוב בטיפול הקודם?"
              className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={!reopenDraft.trim() || reopening} onClick={onSubmitReopen}>
                פתח מחדש
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelReopen}>
                ביטול
              </Button>
            </div>
          </div>
        )}
      </div>
      {!busy && (
        <div className="flex flex-col gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onStartEdit} title="ערוך">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {n.status === 'open' && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => onSetStatus('done')} title="סמן כטופל">
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onSetStatus('dismissed')} title="דחה">
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {n.status === 'done' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-warning" onClick={onStartReopen} title="הטיפול לא היה טוב - פתח מחדש">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} title="מחק">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default function FeedbackSettings() {
  const navigate = useNavigate()
  const { editor, ready } = useEditor()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [reopeningId, setReopeningId] = useState(null)
  const [reopenDraft, setReopenDraft] = useState('')
  const [editingReason, setEditingReason] = useState(null) // { noteId, idx }
  const [reasonDraft, setReasonDraft] = useState('')

  const { data: notes = [], isLoading } = useQuery({ queryKey: ['feedback-notes'], queryFn: () => db.FeedbackNote.list('-created_at') })

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }) => db.FeedbackNote.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback-notes'] }),
  })

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, note }) => db.FeedbackNote.update(id, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-notes'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => db.FeedbackNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback-notes'] }),
  })

  // Marks a "done" note as not actually resolved: reopens it (back to the
  // open list) and keeps the reason attached so the next attempt has the
  // context for what was wrong with the previous fix, instead of losing it.
  const reopenMutation = useMutation({
    mutationFn: ({ id, reason, meta }) =>
      db.FeedbackNote.update(id, {
        status: 'open',
        meta: { ...meta, reopen_history: [...(meta?.reopen_history || []), { reason, at: new Date().toISOString() }] },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-notes'] })
      setReopeningId(null)
      setReopenDraft('')
    },
  })

  // Edits a single reopen_history entry's reason text in place - the reason
  // is the actual up-to-date description of what's still wrong, so it needs
  // to be fixable the same way the main note is, not permanently locked in
  // once submitted.
  const reasonUpdateMutation = useMutation({
    mutationFn: ({ id, meta, idx, reason }) => {
      const history = [...(meta?.reopen_history || [])]
      history[idx] = { ...history[idx], reason }
      return db.FeedbackNote.update(id, { meta: { ...meta, reopen_history: history } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-notes'] })
      setEditingReason(null)
    },
  })

  const startEdit = (n) => {
    setEditingId(n.id)
    setDraft(n.note)
  }

  const startReopen = (n) => {
    setReopeningId(n.id)
    setReopenDraft('')
  }

  if (ready && !editor) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto w-full text-center py-24">
        <p className="text-muted-foreground">צריך להיות במצב עריכה כדי לראות את המשוב.</p>
      </div>
    )
  }

  const open = notes.filter((n) => n.status === 'open')
  const other = notes.filter((n) => n.status !== 'open')

  const renderRow = (n) => (
    <NoteRow
      key={n.id}
      n={n}
      isEditing={editingId === n.id}
      draft={draft}
      onDraftChange={setDraft}
      onStartEdit={() => startEdit(n)}
      onCancelEdit={() => setEditingId(null)}
      onSaveEdit={() => updateNoteMutation.mutate({ id: n.id, note: draft.trim() })}
      saving={updateNoteMutation.isPending}
      onSetStatus={(status) => setStatusMutation.mutate({ id: n.id, status })}
      onDelete={() => deleteMutation.mutate(n.id)}
      onNavigate={navigate}
      isReopening={reopeningId === n.id}
      reopenDraft={reopenDraft}
      onReopenDraftChange={setReopenDraft}
      onStartReopen={() => startReopen(n)}
      onCancelReopen={() => setReopeningId(null)}
      onSubmitReopen={() => reopenMutation.mutate({ id: n.id, reason: reopenDraft.trim(), meta: n.meta })}
      reopening={reopenMutation.isPending}
      editingReasonIdx={editingReason?.noteId === n.id ? editingReason.idx : null}
      reasonDraft={reasonDraft}
      onReasonDraftChange={setReasonDraft}
      onStartEditReason={(idx, reason) => {
        setEditingReason({ noteId: n.id, idx })
        setReasonDraft(reason)
      }}
      onCancelEditReason={() => setEditingReason(null)}
      onSaveEditReason={() => reasonUpdateMutation.mutate({ id: n.id, meta: n.meta, idx: editingReason.idx, reason: reasonDraft.trim() })}
      savingReason={reasonUpdateMutation.isPending}
    />
  )

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <MessageSquareText className="w-6 h-6 text-primary" />
          הערות ומשוב
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">הערות שהשארת תוך כדי שימוש באפליקציה, עם העמוד מצורף אוטומטית</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl shadow-soft text-muted-foreground text-sm">אין הערות עדיין — לחץ על כפתור ההערה הצף בכל עמוד כדי להוסיף אחת</div>
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">פתוחות ({open.length})</h2>
              {open.map(renderRow)}
            </div>
          )}
          {other.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">טופלו / נדחו</h2>
              {other.map(renderRow)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
