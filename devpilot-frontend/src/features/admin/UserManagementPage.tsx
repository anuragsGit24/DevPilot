import React, { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Misc';
import { SearchInput, Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { DEMO_USERS } from '@/mocks/seed-data/project-retail-banking';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/permissions';
import { formatDate } from '@/lib/date';
import type { User, UserRole } from '@/types/domain';
import {
  Users, UserPlus, Lock, Unlock, Edit3,
  Shield, Check, Mail,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function UserManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>(DEMO_USERS);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);

  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    return (
      (u.name ?? '').toLowerCase().includes(searchLower) ||
      (u.email ?? '').toLowerCase().includes(searchLower) ||
      (u.role ?? '').toLowerCase().includes(searchLower)
    );
  });

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, active: !u.active };
          toast({
            variant: updated.active ? 'success' : 'warning',
            title: 'Account Status Updated',
            description: `${u.name} is now ${updated.active ? 'Active' : 'Locked'}.`,
          });
          return updated;
        }
        return u;
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise User Management (UC-13)</h1>
            <p className="text-xs text-slate-500">Configure role assignments, permissions, and security lockout states</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus size={14} />}
          onClick={() => setNewUserOpen(true)}
        >
          Provision User
        </Button>
      </div>

      {/* Search and Table */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <SearchInput
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredUsers.length} Users Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>User / Identity</th>
                <th>Role Assignment</th>
                <th className="w-28">Status</th>
                <th className="w-36">Last Active</th>
                <th className="w-32">Failed Logins</th>
                <th className="w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">{u.name}</div>
                        <div className="text-2xs text-slate-400 font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`text-2xs px-2.5 py-1 rounded-full font-semibold ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td>
                    <Badge variant={u.active ? 'success' : 'danger'} size="xs" dot>
                      {u.active ? 'Active' : 'Locked'}
                    </Badge>
                  </td>
                  <td className="text-2xs text-slate-500">
                    {u.lastLogin ? formatDate(u.lastLogin, 'dd MMM yyyy, HH:mm') : 'Never'}
                  </td>
                  <td>
                    <span className={`font-mono text-xs ${u.failedLoginCount > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                      {u.failedLoginCount}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                        title={u.active ? 'Lock Account' : 'Unlock Account'}
                      >
                        {u.active ? <Lock size={14} /> : <Unlock size={14} className="text-emerald-600" />}
                      </button>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Role Assignment"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit User Role Dialog */}
      <Dialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit Role: ${editingUser?.name}`}
        size="sm"
        footer={
          editingUser && (
            <>
              <Button variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? editingUser : u)));
                  toast({ variant: 'success', title: 'Role Updated', description: `${editingUser.name} is now ${ROLE_LABELS[editingUser.role]}.` });
                  setEditingUser(null);
                }}
              >
                Save
              </Button>
            </>
          )
        }
      >
        {editingUser && (
          <div className="space-y-4 py-2">
            <Input label="Name" value={editingUser.name} disabled />
            <Input label="Email" value={editingUser.email} disabled />
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Enterprise Role</label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                className="form-input text-xs w-full"
              >
                <option value="admin">Administrator (Full Access)</option>
                <option value="project_manager">Project Manager (Sprints, Export, Overview)</option>
                <option value="business_analyst">Business Analyst (BRD Ingestion, Stories)</option>
                <option value="developer">Developer (Artifacts, Specs, Architecture)</option>
                <option value="tester">Quality Assurance / Tester (AC, Test Cases)</option>
              </select>
            </div>
          </div>
        )}
      </Dialog>

      {/* Provision User Dialog */}
      <Dialog
        open={newUserOpen}
        onClose={() => setNewUserOpen(false)}
        title="Provision Enterprise User"
        size="md"
        footer={null}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            const newUser: User = {
              id: `usr-${Math.random().toString(36).slice(2, 6)}`,
              name: data.get('name') as string,
              email: data.get('email') as string,
              role: data.get('role') as UserRole,
              active: true,
              createdAt: new Date().toISOString(),
              failedLoginCount: 0,
            };
            setUsers((prev) => [...prev, newUser]);
            toast({ variant: 'success', title: 'User Provisioned', description: `${newUser.name} added.` });
            setNewUserOpen(false);
          }}
          className="space-y-4"
        >
          <Input label="Full Name" name="name" required placeholder="e.g. David Ross" />
          <Input label="Email Address" name="email" type="email" required placeholder="e.g. d.ross@devpilot.demo" />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
            <select name="role" className="form-input text-xs w-full">
              <option value="developer">Developer</option>
              <option value="tester">Tester</option>
              <option value="business_analyst">Business Analyst</option>
              <option value="project_manager">Project Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setNewUserOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Provision User</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
