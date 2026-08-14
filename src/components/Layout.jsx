import { Link, useLocation, Outlet } from 'react-router-dom'
import { BookOpen, ChefHat, Tag, Sliders, Ruler, Settings, Bell, KeyRound, MessageSquareText, Palette, Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { db } from '@/api/db'
import { useEditor } from '@/hooks/useEditor'
import { useBranding } from '@/hooks/useBranding'
import EditCodeDialog from '@/components/EditCodeDialog'
import FeedbackWidget from '@/components/FeedbackWidget'
import GlobalTimerWatcher from '@/components/GlobalTimerWatcher'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const navItems = [
  { path: '/recipes', label: 'מתכונים', icon: BookOpen },
  { path: '/production', label: 'ייצור מודרך', icon: ChefHat },
]

const settingsItems = [
  { path: '/settings/recipe-categories', label: 'קטגוריות מתכונים', icon: Tag },
  { path: '/parameters', label: 'פרמטרים', icon: Sliders },
  { path: '/units', label: 'יחידות מידה', icon: Ruler },
  { path: '/alert-sound', label: 'צליל התראה', icon: Bell },
]

export default function Layout() {
  const location = useLocation()
  const { editor } = useEditor()
  const { branding } = useBranding()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const visibleSettingsItems = editor
    ? [
        ...settingsItems,
        { path: '/settings/edit-code', label: 'קוד עריכה', icon: KeyRound },
        { path: '/settings/feedback', label: 'הערות ומשוב', icon: MessageSquareText },
        { path: '/settings/branding', label: 'עיצוב', icon: Palette },
      ]
    : settingsItems

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions-count'],
    queryFn: () => db.ProductionSession.filter({ status: 'active' }),
    refetchInterval: 10000,
  })

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header
        className="hidden md:flex items-center justify-center px-6 h-16 z-50 shadow-sm flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))' }}
      >
        <nav className="flex items-center gap-2 w-full max-w-5xl">
          <span className="font-heading font-bold text-white text-lg ml-4 flex items-center gap-2">{branding.title}</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  active ? 'bg-white/25 text-white shadow' : 'text-white/80 hover:bg-white/15'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <div className="mr-auto flex items-center gap-2">
            <EditCodeDialog />
            <div className="relative">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium text-white ${
                  settingsOpen ? 'bg-white/25' : 'hover:bg-white/15'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>הגדרות</span>
              </button>
              {settingsOpen && (
                <div className="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-lg border border-border py-2 z-50 min-w-44">
                  {visibleSettingsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSettingsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-muted text-sm transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="md:hidden flex-shrink-0 z-50 flex items-center justify-between px-4 h-14 shadow-md"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="font-heading font-bold text-sm text-white">{branding.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <EditCodeDialog />
            {activeSessions.length > 0 && (
              <Link to="/production">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 bg-white/30 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {activeSessions.length} פעיל
                </span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-lg text-white/90 hover:bg-white/15 transition-colors"
              title="תפריט"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col pb-20 md:pb-0">
          <Outlet />
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-20 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-72 flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">{branding.title}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-4">
            {visibleSettingsItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <FeedbackWidget />
      <GlobalTimerWatcher />
    </div>
  )
}
