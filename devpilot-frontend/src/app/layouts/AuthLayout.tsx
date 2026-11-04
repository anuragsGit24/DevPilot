import { Outlet } from 'react-router-dom';
import { Code2 } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col px-4 py-6 sm:p-10">
      <header className="flex items-center gap-2.5 max-w-7xl w-full mx-auto">
        <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center text-white"><Code2 size={20} /></div>
        <span className="text-lg font-semibold tracking-tight text-slate-900">DevPilot</span>
      </header>
      <main className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md"><Outlet /></div>
      </main>
      <footer className="text-center text-xs text-slate-500">DevPilot · Your development workspace</footer>
    </div>
  );
}
