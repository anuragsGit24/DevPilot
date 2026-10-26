import React, { useState, useEffect } from 'react';
import { useProjectData } from '@/app/providers/ProjectDataProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Misc';
import { formatDate } from '@/lib/date';
import { Shield, Download, Filter, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
import { api, type ApiAuditLog } from '@/lib/api';

interface LogItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
}

export function AuditLogsPage() {
  const { activities } = useProjectData();
  const { toast } = useToast();

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const serverLogs = await api.listAuditLogs();
      if (serverLogs && serverLogs.length > 0) {
        setLogs(
          serverLogs.map((l: ApiAuditLog) => ({
            id: l.id,
            timestamp: l.created_at,
            userName: l.details && (l.details as any).email ? String((l.details as any).email) : 'System / User',
            userRole: l.details && (l.details as any).role ? String((l.details as any).role) : 'enterprise',
            action: l.action,
            entityType: l.entity_type || undefined,
            entityId: l.entity_id || undefined,
            entityTitle: l.entity_title || undefined,
          })),
        );
      } else {
        // Fallback to local activities
        setLogs(
          activities.map((act) => ({
            id: act.id,
            timestamp: act.timestamp,
            userName: act.userName || 'Unknown',
            userRole: act.userRole || 'analyst',
            action: act.action,
            entityType: act.entityType || act.resourceType,
            entityId: act.entityId || act.resourceId,
            entityTitle: act.entityTitle || act.resourceName,
          })),
        );
      }
    } catch {
      setLogs(
        activities.map((act) => ({
          id: act.id,
          timestamp: act.timestamp,
          userName: act.userName || 'Unknown',
          userRole: act.userRole || 'analyst',
          action: act.action,
          entityType: act.entityType || act.resourceType,
          entityId: act.entityId || act.resourceId,
          entityTitle: act.entityTitle || act.resourceName,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [activities]);

  const filteredLogs = logs.filter((act) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (act.userName ?? '').toLowerCase().includes(searchLower) ||
      (act.action ?? '').toLowerCase().includes(searchLower) ||
      (act.entityTitle ?? '').toLowerCase().includes(searchLower) ||
      (act.entityId ?? '').toLowerCase().includes(searchLower);
    const matchesType = typeFilter === 'all' || act.entityType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportCsv = () => {
    const header = 'Timestamp,User,Role,Action,EntityType,EntityId,EntityTitle\n';
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.timestamp}","${l.userName || ''}","${l.userRole || ''}","${l.action || ''}","${l.entityType || ''}","${l.entityId || ''}","${l.entityTitle || ''}"`,
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchAuditLogs}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCsv}
          >
            Export Audit CSV
          </Button>
        </div>
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
              <option value="user">User & Identity</option>
              <option value="project">Project</option>
              <option value="artifact">Artifact</option>
              <option value="requirement">Requirement</option>
              <option value="user_story">User Story</option>
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
                      {(log.entityType || 'general').replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-blue-600">
                      <FileText size={12} />
                      <span className="font-semibold">{log.entityId || log.id}</span>
                      {log.entityTitle && (
                        <span className="text-slate-500 font-sans truncate max-w-[200px]">
                          — {log.entityTitle}
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
