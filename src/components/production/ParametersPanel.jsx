import { useQuery } from '@tanstack/react-query'
import { Thermometer } from 'lucide-react'
import { db } from '@/api/db'

export default function ParametersPanel({ parameterIds = [], parameterValues = [], inline = false, stacked = false }) {
  const { data: allParameters = [] } = useQuery({ queryKey: ['parameters'], queryFn: () => db.Parameter.list('name') })

  const params = allParameters.filter((p) => parameterIds.includes(p.id))
  if (params.length === 0) return null

  const paramValue = (p) => {
    const pv = parameterValues.find((v) => v.parameter_id === p.id)
    const isSingle = pv?.value_type === 'single'
    const hasValue = pv && (isSingle ? pv.value != null && pv.value !== '' : (pv.value_min != null && pv.value_min !== '') || (pv.value_max != null && pv.value_max !== ''))
    return { pv, isSingle, hasValue }
  }

  if (stacked) {
    return (
      <>
        <div className="flex items-center gap-1 mb-1">
          <Thermometer className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">פרמטרים</span>
        </div>
        {params.map((p) => {
          const { pv, isSingle, hasValue } = paramValue(p)
          return (
            <div key={p.id} className="bg-white border border-amber-200 rounded-xl px-3 py-2 shadow-sm text-center">
              <p className="text-xs text-amber-700 font-medium">{p.name}</p>
              {hasValue ? (
                <p className="text-base font-bold text-foreground" dir="ltr">
                  {isSingle ? `${pv.value}` : `${pv.value_min ?? '?'}–${pv.value_max ?? '?'}`}
                  {p.unit ? <span className="text-xs font-normal text-muted-foreground"> {p.unit}</span> : null}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">ללא ערך</p>
              )}
            </div>
          )
        })}
      </>
    )
  }

  if (inline) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Thermometer className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        {params.map((p) => {
          const { pv, isSingle, hasValue } = paramValue(p)
          return (
            <span key={p.id} className="text-xs text-amber-800">
              <span className="font-medium">{p.name}:</span>
              {hasValue ? <span className="font-bold mr-0.5"> {isSingle ? `${pv.value}` : `${pv.value_min ?? '?'}–${pv.value_max ?? '?'}`}{p.unit ? ` ${p.unit}` : ''}</span> : <span className="text-amber-600 mr-0.5"> —</span>}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mx-4 mb-4">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Thermometer className="w-4 h-4 text-amber-700 flex-shrink-0" />
        <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">פרמטרים</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {params.map((p) => {
          const { pv, isSingle, hasValue } = paramValue(p)
          return (
            <div key={p.id} className="bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-sm shadow-sm">
              <span className="text-amber-700 font-medium">{p.name}:</span>
              {hasValue ? (
                <span className="font-bold text-foreground mr-1">
                  {isSingle ? `${pv.value}` : `${pv.value_min ?? '?'} – ${pv.value_max ?? '?'}`}
                  {p.unit ? ` ${p.unit}` : ''}
                </span>
              ) : (
                <span className="text-muted-foreground mr-1 text-xs">ללא ערך</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
