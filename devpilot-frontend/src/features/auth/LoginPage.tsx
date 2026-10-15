import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/permissions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DEMO_USERS } from '@/mocks/seed-data/project-retail-banking';
import { Lock, Mail, Eye, EyeOff, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/types/domain';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('pm@devpilot.demo');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch {
      setError('An unexpected error occurred during demo login');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (userRole: UserRole) => {
    const targetUser = DEMO_USERS.find((u) => u.role === userRole);
    if (targetUser) {
      setEmail(targetUser.email);
      setPassword('demo123');
      setError(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-dialog border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to DevPilot</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in with an enterprise demo persona to explore</p>
      </div>

      <div className="p-8 space-y-6">
        {/* Quick Persona Switcher Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Select Demo Persona</span>
            <span className="text-2xs font-normal text-slate-400">Pre-fills credentials</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_USERS.filter((u) => u.active).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectDemoUser(u.role)}
                className={`flex flex-col text-left p-2 rounded-lg border text-xs transition-all ${
                  email.toLowerCase() === u.email.toLowerCase()
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold truncate">{u.name.split(' ')[0]}</span>
                <span className="text-2xs text-slate-500 truncate">{ROLE_LABELS[u.role]}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Corporate Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail size={16} />}
            placeholder="e.g. pm@devpilot.demo"
          />

          <div className="space-y-1">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<Lock size={16} />}
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              placeholder="••••••••"
            />
            <div className="flex justify-end pt-1">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center py-2.5 mt-2"
            loading={loading}
            iconRight={<ArrowRight size={16} />}
          >
            Authenticate Session
          </Button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <UserCheck size={14} className="text-green-600" />
          <span>Demo Authentication Active</span>
        </div>
        <span className="font-mono text-2xs text-slate-400">v2.0-beta</span>
      </div>
    </div>
  );
}
