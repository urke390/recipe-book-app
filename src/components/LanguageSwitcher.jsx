import { Languages } from 'lucide-react'
import { LANGUAGES, getLang, setLang } from '@/lib/i18n'

// Per-device UI language toggle. Recipe content (names, steps, units the
// users typed) is data and stays in whatever language it was written in.
export default function LanguageSwitcher() {
  const current = getLang()
  return (
    <div className="flex items-center gap-2 py-1">
      <Languages className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 flex-1">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            onClick={() => setLang(l.code)}
            className={`flex-1 px-2 py-1 text-xs font-semibold rounded-md transition-all ${
              current === l.code ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
