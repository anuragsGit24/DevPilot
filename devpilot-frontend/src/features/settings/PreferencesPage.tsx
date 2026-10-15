import { AppearanceSettings } from '@/features/settings/AppearanceSettings';

export function PreferencesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Preferences</h1>
        <p className="text-sm text-slate-500 mt-1">Personalize how DevPilot looks on this device.</p>
      </div>
      <AppearanceSettings />
    </div>
  );
}
