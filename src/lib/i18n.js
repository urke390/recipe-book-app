import es from '@/locales/es'

// Minimal gettext-style i18n. The Hebrew source string is the lookup key, so
// Hebrew needs no dictionary and any string missing from a translation falls
// back to Hebrew instead of breaking. The language is read once at module
// load and switching reloads the page, which lets t() be a plain function
// usable anywhere (components, module-level constants, toasts, lib code).

export const LANGUAGES = [
  { code: 'he', label: 'עברית', dir: 'rtl', locale: 'he-IL' },
  { code: 'es', label: 'Español', dir: 'ltr', locale: 'es-ES' },
]

const DICTIONARIES = { es }
const STORAGE_KEY = 'app_lang'

function readLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGUAGES.some((l) => l.code === saved)) return saved
  } catch {
    // storage blocked - fall back to default
  }
  return 'he'
}

const lang = readLang()
const info = LANGUAGES.find((l) => l.code === lang)
const dict = DICTIONARIES[lang]

if (typeof document !== 'undefined') {
  document.documentElement.lang = lang
  document.documentElement.dir = info.dir
}

export const getLang = () => lang
export const isRTL = () => info.dir === 'rtl'
/** BCP-47 locale for dates/number formatting. */
export const getLocale = () => info.locale

export function setLang(code) {
  if (code === lang) return
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // ignore
  }
  window.location.reload()
}

const warned = new Set()

/**
 * Translate a Hebrew source string. `vars` fills `{name}` placeholders:
 * t('שלב {n} מתוך {total}', { n: 2, total: 5 })
 */
export function t(he, vars) {
  let s = he
  if (dict) {
    const tr = dict[he]
    if (tr != null) s = tr
    else if (import.meta.env.DEV && !warned.has(he)) {
      warned.add(he)
      console.warn(`[i18n] missing ${lang} translation:`, he)
    }
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
  return s
}
