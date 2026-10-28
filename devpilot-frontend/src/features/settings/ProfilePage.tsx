import React from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Misc';
import { ROLE_LABELS, ROLE_COLORS, ROLE_CAPABILITIES, ALL_CAPABILITIES } from '@/types/permissions';
import { formatDate } from '@/lib/date';
import {
  User, Shield, Key, CheckCircle2, XCircle,
} from 'lucide-react';
import type { UserRole } from '@/types/domain';
import { AppearanceSettings } from '@/features/settings/AppearanceSettings';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const userCapabilities = ROLE_CAPABILITIES[user.role] || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Last signed in: {user.lastLogin ? formatDate(user.lastLogin, 'dd MMM yyyy, HH:mm') : 'Active session'}
        </div>
      </div>

      <AppearanceSettings />

      {/* RBAC Capabilities Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Active Role Permissions ({ROLE_LABELS[user.role]})
              </h2>
              <p className="text-2xs text-slate-500">Declared capability tokens for this session</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {ALL_CAPABILITIES.map((cap) => {
              const hasAccess = userCapabilities.includes(cap);
              return (
                <div
                  key={cap}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    hasAccess
                      ? 'bg-slate-50 border-slate-200 text-slate-800'
                      : 'bg-white/40 border-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="font-mono text-2xs">{cap}</span>
                  {hasAccess ? (
                    <CheckCircle2 size={15} className="text-green-600" />
                  ) : (
                    <XCircle size={15} className="text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
