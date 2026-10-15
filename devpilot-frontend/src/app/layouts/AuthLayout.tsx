import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sparkles, Shield, Info } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">DevPilot</span>
            <span className="ml-2 text-2xs uppercase tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Barclays Collaboration
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <Shield size={14} className="text-blue-400" />
          <span>Role-Based Enterprise SDLC Platform</span>
        </div>
      </header>

      {/* Center Form Card */}
      <main className="my-auto py-8 flex justify-center z-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="text-center text-xs text-slate-500 z-10 border-t border-slate-800/80 pt-6 mt-6">
        <div className="flex items-center justify-center gap-1.5 text-amber-400/90 mb-1">
          <Info size={14} />
          <span className="font-medium">Academic Project Demonstration</span>
        </div>
        <p className="text-slate-400 max-w-md mx-auto">
          Built for the Barclays Academic Student Collaboration. Uses synthetic mock data and client-side role emulation. No real credentials or bank networks are accessed.
        </p>
      </footer>
    </div>
  );
}
