import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/permissions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, Eye, EyeOff, UserCheck, AlertCircle, ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';
import type { UserRole } from '@/types/domain';

const DEMO_USERS = [
  { id: 'demo-admin', name: 'Eleanor Vance', email: 'admin@devpilot.demo', role: 'admin' as UserRole },
  { id: 'demo-pm', name: 'James Whitfield', email: 'pm@devpilot.demo', role: 'project_manager' as UserRole },
  { id: 'demo-ba', name: 'Sarah Chen', email: 'ba@devpilot.demo', role: 'business_analyst' as UserRole },
  { id: 'demo-dev', name: 'Marcus Rodriguez', email: 'dev@devpilot.demo', role: 'developer' as UserRole },
  { id: 'demo-qa', name: 'Priya Sharma', email: 'qa@devpilot.demo', role: 'tester' as UserRole },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, isDemoMode } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('business_analyst');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const result = await register(name, email, password, role);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Registration failed');
        }
      } else {
        const result = await login(email, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Authentication failed');
        }
      }
    } catch {
      setError('An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (userRole: UserRole) => {
    const targetUser = DEMO_USERS.find((u) => u.role === userRole);
    if (targetUser) {
      setEmail(targetUser.email);
      setPassword(userRole === 'admin' ? 'admin123' : 'user123');
      setError(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-dialog border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-100 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isRegistering ? 'Create DevPilot Account' : 'Welcome to DevPilot'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isRegistering
            ? 'Provision your user profile with role-based access'
            : 'Enterprise AI specification & requirement engineering'}
        </p>
      </div>

      <div className="p-8 space-y-6">
        {/* Quick Persona Switcher Bar (only when in login mode) */}
        {!isRegistering && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Select Demo Persona</span>
              <span className="text-2xs font-normal text-slate-400">Development accounts only</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_USERS.map((u) => (
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
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <>
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Alex Morgan"
              />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Enterprise Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="form-input text-xs w-full py-2 px-3 rounded-lg border border-slate-300"
                >
                  <option value="business_analyst">Business Analyst (BRD Ingestion, Stories)</option>
                  <option value="project_manager">Project Manager (Sprints, Planning)</option>
                  <option value="developer">Developer (Specs, Architecture)</option>
                  <option value="tester">Quality Assurance / Tester (AC, Tests)</option>
                  <option value="admin">Administrator (Full System)</option>
                </select>
              </div>
            </>
          )}

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
              hint={isRegistering ? 'Minimum 8 characters' : undefined}
            />
            {!isRegistering && (
              <div className="flex justify-end pt-1">
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center py-2.5 mt-2"
            loading={loading}
            iconRight={isRegistering ? <UserPlus size={16} /> : <ArrowRight size={16} />}
          >
            {isRegistering ? 'Register & Sign In' : 'Authenticate Session'}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {isRegistering
                ? 'Already have an account? Sign in here'
                : 'Need a new account? Register here'}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Info */}
      <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Real Session Auth & RBAC Active</span>
        </div>
        <span className="font-mono text-2xs text-slate-400">v2.0-secure</span>
      </div>
    </div>
  );
}
