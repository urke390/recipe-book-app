// Friendly Hebrew label for a route, used so a feedback note shows *what*
// page it was left on in human terms, not just the raw path.
const PATTERNS = [
  [/^\/recipes\/new/, 'מתכון חדש'],
  [/^\/recipes\/[^/]+\/edit/, 'עריכת מתכון'],
  [/^\/recipes\/[^/]+/, 'צפייה במתכון'],
  [/^\/recipes/, 'מתכונים'],
  [/^\/production\/[^/]+/, 'מעקב ייצור'],
  [/^\/production/, 'ייצור מודרך'],
  [/^\/categories/, 'כותרות ורכיבים'],
  [/^\/parameters/, 'פרמטרים'],
  [/^\/alert-sound/, 'התראות'],
  [/^\/settings\/edit-code/, 'קוד עריכה'],
  [/^\/settings\/feedback/, 'הערות ומשוב'],
  [/^\/print\/recipe/, 'הדפסת מתכון'],
  [/^\/print\/recipes/, 'הדפסת ספר מתכונים'],
]

export function getPageLabel(pathname) {
  const match = PATTERNS.find(([re]) => re.test(pathname))
  return match ? match[1] : pathname
}
