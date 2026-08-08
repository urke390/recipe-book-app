import { useState } from 'react'
import { Volume2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const ALARM_SOUNDS = [
  { id: 'beep', label: 'ביפ קצר', description: 'צפצוף קצר וחד' },
  { id: 'bell', label: 'פעמון', description: 'צלצול פעמון עדין' },
  { id: 'alarm', label: 'אזעקה', description: 'ביפים חוזרים מהירים' },
  { id: 'chime', label: 'צלצול נעים', description: 'מנגינה קצרה ונעימה' },
]

export function getAlarmSoundId() {
  return localStorage.getItem('alarm_sound_id') || 'beep'
}

export function setAlarmSoundId(id) {
  localStorage.setItem('alarm_sound_id', id)
}

export function playAlarmById(id) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    if (id === 'beep') {
      ;[0, 0.35, 0.7].forEach((t) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'square'
        osc.frequency.value = 1000
        gain.gain.setValueAtTime(0.3, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 0.25)
      })
    } else if (id === 'bell') {
      ;[0, 1.2, 2.4].forEach((t) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 660
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 1.0)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 1.0)
      })
    } else if (id === 'alarm') {
      ;[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4].forEach((t) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sawtooth'
        osc.frequency.value = t % 0.4 < 0.2 ? 880 : 660
        gain.gain.setValueAtTime(0.3, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 0.15)
      })
    } else if (id === 'chime') {
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.25)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.6)
        osc.start(ctx.currentTime + i * 0.25)
        osc.stop(ctx.currentTime + i * 0.25 + 0.6)
      })
    }
  } catch (e) {
    // Web Audio unavailable - fail silently, the visual alert still shows
  }
}

export default function SoundSettings() {
  const [selected, setSelected] = useState(getAlarmSoundId())

  const handleSelect = (id) => {
    setSelected(id)
    setAlarmSoundId(id)
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-primary" />
        צליל התראה
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {ALARM_SOUNDS.map((sound) => (
          <div
            key={sound.id}
            onClick={() => handleSelect(sound.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
              selected === sound.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{sound.label}</p>
              <p className="text-xs text-muted-foreground">{sound.description}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                playAlarmById(sound.id)
              }}
              title="השמע דוגמה"
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected === sound.id ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
