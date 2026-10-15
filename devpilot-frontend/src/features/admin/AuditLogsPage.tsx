import React, { useState } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Misc';
import { formatDate } from '@/lib/date';
import { Shield, Download, Filter, FileText } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';

export function AuditLogsPage() {
  const { activities } = useProjectData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredLogs = activities.filter((act) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (act.userName ?? '').toLowerCase().includes(searchLower) ||
      (act.action ?? '').toLowerCase().includes(searchLower) ||
      ((act.entityTitle ?? '')).toLowerCase().includes(searchLower) ||
      ((act.entityId ?? '')).toLowerCase().includes(searchLower) ||
      ((act.resourceName ?? '')).toLowerCase().includes(searchLower);
    const matchesType = typeFilter === 'all' || act.entityType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportCsv = () => {
    const header = 'Timestamp,User,Role,Action,EntityType,EntityId,EntityTitle\n';
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.timestamp}","${l.userName || ''}","${l.userRole || ''}","${l.action || ''}","${l.entityType || l.resourceType || ''}","${l.entityId || l.resourceId || ''}","${l.entityTitle || l.resourceName || ''}"`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ variant: 'success', title: 'Audit Trail Exported', description: 'Downloaded CSV file.' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security & Governance Audit Trail (UC-13)</h1>
            <p className="text-xs text-slate-500">Immutable ledger recording all pipeline interactions, reviews, and status changes</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<Download size={14} />}
          onClick={handleExportCsv}
        >
          Export Audit CSV
        </Button>
      </div>

      {/* Filter and Table */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <SearchInput
              placeholder="Search by user, action, or artifact ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Filter size={14} className="text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-input text-xs py-1.5 px-3 rounded-lg"
            >
              <option value="all">All Entity Types</option>
              <option value="project">Project</option>
              <option value="requirement">Requirement</option>
              <option value="user_story">User Story</option>
              <option value="acceptance_criteria">Criteria</option>
              <option value="test_case">Test Case</option>
              <option value="prompt">Prompt</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="w-44">Timestamp</th>
                <th>Author / User</th>
                <th>Action Taken</th>
                <th className="w-32">Entity Type</th>
                <th>Target Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="text-2xs font-mono text-slate-500">
                    {formatDate(log.timestamp, 'dd MMM yyyy, HH:mm:ss')}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={log.userName} size="xs" />
                      <span className="text-xs font-semibold text-slate-800">{log.userName}</span>
                      <span className="text-2xs text-slate-400">({log.userRole})</span>
                    </div>
                  </td>
                  <td className="text-xs font-medium text-slate-900">{log.action}</td>
                  <td>
                    <Badge variant="outline" size="xs" className="capitalize">
                      {(log.entityType || log.resourceType || 'general').replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-blue-600">
                      <FileText size={12} />
                      <span className="font-semibold">{log.entityId || log.resourceId || log.id}</span>
                      {(log.entityTitle || log.resourceName) && (
                        <span className="text-slate-500 font-sans truncate max-w-[200px]">
                          — {log.entityTitle || log.resourceName}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
