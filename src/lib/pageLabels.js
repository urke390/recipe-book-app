import { t } from '@/lib/i18n'
// Friendly Hebrew label for a route, used so a feedback note shows *what*
// page it was left on in human terms, not just the raw path.
const PATTERNS = [
  [/^\/recipes\/new/, t('מתכון חדש')],
  [/^\/recipes\/quick/, t('מתכון חדש (אשף)')],
  [/^\/recipes\/[^/]+\/edit/, t('עריכת מתכון')],
  [/^\/recipes\/[^/]+/, t('צפייה במתכון')],
  [/^\/recipes/, t('מתכונים')],
  [/^\/production\/[^/]+/, t('מעקב ייצור')],
  [/^\/production/, t('ייצור מודרך')],
  [/^\/settings\/recipe-categories/, t('קטגוריות מתכונים')],
  [/^\/parameters/, t('פרמטרים')],
  [/^\/units/, t('יחידות מידה')],
  [/^\/alert-sound/, t('התראות')],
  [/^\/settings\/edit-code/, t('קוד עריכה')],
  [/^\/settings\/feedback/, t('הערות ומשוב')],
  [/^\/print\/recipe/, t('הדפסת מתכון')],
  [/^\/print\/recipes/, t('הדפסת ספר מתכונים')],
]

export function getPageLabel(pathname) {
  const match = PATTERNS.find(([re]) => re.test(pathname))
  return match ? match[1] : pathname
}
