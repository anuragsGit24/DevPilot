import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {theme === 'dark' ? <Moon size={18} className="text-blue-600" /> : <Sun size={18} className="text-amber-500" />}
          <div>
            <h2 className="text-base font-semibold text-slate-900">Appearance</h2>
            <p className="text-2xs text-slate-500">Choose the display theme for DevPilot on this device.</p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800" aria-live="polite">
              {theme === 'dark' ? 'Dark mode is on' : 'Light mode is on'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Your preference is saved automatically and will be restored next time.</p>
          </div>
          <Button
            variant="secondary"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
