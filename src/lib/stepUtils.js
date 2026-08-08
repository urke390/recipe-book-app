export const STEP_TYPE_LABELS = {
  ingredient_addition: 'הוספת רכיב',
  wait_time: 'זמן המתנה',
  action: 'פעולה',
  parameter_display: 'פרמטר',
}

export const STEP_TYPE_COLORS = {
  ingredient_addition: 'bg-blue-100 text-blue-800 border-blue-200',
  wait_time: 'bg-amber-100 text-amber-800 border-amber-200',
  action: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  parameter_display: 'bg-violet-100 text-violet-800 border-violet-200',
}

export function formatDurationDisplay(minutes) {
  if (!minutes) return ''
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} ימים`
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} שעות`
  return `${minutes} דקות`
}

export function getStepDisplayTitle(step) {
  if (step.title) return step.title
  switch (step.type) {
    case 'ingredient_addition':
      if (!step.ingredient_name) return 'הוספת רכיב'
      if (step.category_name && step.category_name !== step.ingredient_name) return `${step.category_name} — ${step.ingredient_name}`
      return step.ingredient_name
    case 'wait_time':
      if (!step.duration_minutes) return 'זמן המתנה'
      return `המתן ${formatDurationDisplay(step.duration_minutes)}`
    case 'action':
      return 'פעולה'
    case 'parameter_display':
      return step.parameter_name || 'פרמטר'
    default:
      return 'שלב'
  }
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const UNITS = ['גרם', 'ק"ג', 'מ"ל', 'ליטר', 'יחידה', 'כפית', 'כף', 'כוס']
