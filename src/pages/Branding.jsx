import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { useEditor } from '@/hooks/useEditor'
import { useBranding } from '@/hooks/useBranding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

function hexToHslString(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function hslStringToHex(hslStr) {
  const [h, sPct, lPct] = hslStr.split(' ').map((v) => parseFloat(v))
  const s = sPct / 100
  const l = lPct / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rgb
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`
}

// "מיתוג" settings: the app title shown in the header, plus the two colors
// that matter most for the app's look (header/buttons color, page
// background) - requested via feedback notes instead of being hardcoded.
// Colors are edited as hex (native color input) but stored/applied as the
// "H S% L%" triplet the rest of the app's CSS already uses.
export default function Branding() {
  const { toast } = useToast()
  const { editor, ready } = useEditor()
  const { branding, updateBranding, isUpdating } = useBranding()

  const [title, setTitle] = useState(branding.title)
  const [primaryHex, setPrimaryHex] = useState(hslStringToHex(branding.primary_color))
  const [backgroundHex, setBackgroundHex] = useState(hslStringToHex(branding.background_color))

  useEffect(() => {
    setTitle(branding.title)
    setPrimaryHex(hslStringToHex(branding.primary_color))
    setBackgroundHex(hslStringToHex(branding.background_color))
  }, [branding.title, branding.primary_color, branding.background_color])

  const handleSave = () => {
    updateBranding(
      { title, primary_color: hexToHslString(primaryHex), background_color: hexToHslString(backgroundHex) },
      { onSuccess: () => toast({ title: 'העיצוב נשמר' }) },
    )
  }

  if (ready && !editor) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto w-full text-center py-24">
        <p className="text-muted-foreground">צריך להיות במצב עריכה כדי לשנות את העיצוב.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          עיצוב
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">שם האפליקציה וצבעי העמוד</p>
      </div>

      <div className="space-y-4 bg-card border border-border rounded-2xl p-5 shadow-soft">
        <div>
          <Label className="mb-1 block">שם האפליקציה</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ספר מתכונים ביתי" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block">צבע ניווט וכפתורים</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
              <span className="text-xs text-muted-foreground" dir="ltr">
                {primaryHex}
              </span>
            </div>
          </div>
          <div>
            <Label className="mb-1 block">צבע רקע כללי</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={backgroundHex} onChange={(e) => setBackgroundHex(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
              <span className="text-xs text-muted-foreground" dir="ltr">
                {backgroundHex}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={!title || isUpdating} className="w-full">
          {isUpdating ? 'שומר...' : 'שמור'}
        </Button>
      </div>
    </div>
  )
}
