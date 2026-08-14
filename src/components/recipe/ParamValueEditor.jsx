import { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'

// onChange (a full recipe save) used to fire on every keystroke, which meant
// every character typed waited on a round-trip to the server and the
// query-refetch it triggered - typing felt slow or like characters were
// getting dropped. Typing now only updates local state; the save only
// happens on blur or via the +/- buttons (a single discrete change each).
function StepperInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])

  const num = parseFloat(draft) || 0
  const adjust = (delta) => {
    const newVal = Math.round((num + delta) * 10) / 10
    const next = newVal === 0 ? '' : String(newVal)
    setDraft(next)
    onChange(next)
  }

  return (
    <div className="flex items-center border border-input rounded-xl overflow-hidden h-10 bg-background">
      <button type="button" onClick={() => adjust(-0.5)} className="px-3 h-full text-muted-foreground hover:bg-secondary transition-colors flex-shrink-0">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== (value ?? '')) onChange(draft)
        }}
        placeholder={placeholder}
        className="flex-1 text-center text-sm font-semibold bg-transparent focus:outline-none min-w-[2.5rem]"
        dir="ltr"
      />
      <button type="button" onClick={() => adjust(0.5)} className="px-3 h-full text-muted-foreground hover:bg-secondary transition-colors flex-shrink-0">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function ParamValueEditor({ param, pv, onUpdate }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">
          {param.name}
          {param.unit ? <span className="font-normal text-xs text-muted-foreground"> ({param.unit})</span> : ''}
        </span>
        <div className="flex rounded-lg overflow-hidden text-xs border border-input">
          <button
            onClick={() => onUpdate('value_type', 'single')}
            className={`px-3 py-1 transition-colors ${pv.value_type === 'single' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary text-muted-foreground'}`}
          >
            ערך יחיד
          </button>
          <button
            onClick={() => onUpdate('value_type', 'range')}
            className={`px-3 py-1 transition-colors ${pv.value_type !== 'single' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary text-muted-foreground'}`}
          >
            טווח
          </button>
        </div>
      </div>

      {pv.value_type === 'single' ? (
        <StepperInput value={pv.value ?? ''} onChange={(v) => onUpdate('value', v)} placeholder="ערך" />
      ) : (
        <div className="flex items-center gap-2">
          <StepperInput value={pv.value_min ?? ''} onChange={(v) => onUpdate('value_min', v)} placeholder="מינימום" />
          <span className="text-sm text-muted-foreground flex-shrink-0">–</span>
          <StepperInput value={pv.value_max ?? ''} onChange={(v) => onUpdate('value_max', v)} placeholder="מקסימום" />
        </div>
      )}
    </div>
  )
}
