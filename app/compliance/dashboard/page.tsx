'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader } from '@/components/dashboard-components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  CheckCircle,
  Download,
  Shield,
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  timestamp: string;
  ip_address: string;
  changes: any;
}

interface ComplianceMetrics {
  totalAuditEntries: number;
  usersActive: number;
  criticalEvents: number;
  averageResponseTime: number;
}

export default function ComplianceOfficerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    totalAuditEntries: 0,
    usersActive: 0,
    criticalEvents: 0,
    averageResponseTime: 0,
  });
  const [searchUserId, setSearchUserId] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/auth/login');
          return;
        }
        setUser(authUser);

        // Load audit logs
        await loadAuditLogs();
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const loadAuditLogs = async () => {
    try {
      const response = await fetch(`/api/audit-logs?limit=200`);
      const data = await response.json();
      if (data.logs) {
        setAuditLogs(data.logs);
        // Calculate metrics
        calculateMetrics(data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const calculateMetrics = (logs: AuditLog[]) => {
    const uniqueUsers = new Set(logs.map((log) => log.user_id)).size;
    const criticalActions = logs.filter((log) =>
      ['emergency.override', 'access.denied', 'user.deactivated'].includes(
        log.action
      )
    ).length;

    setMetrics({
      totalAuditEntries: logs.length,
      usersActive: uniqueUsers,
      criticalEvents: criticalActions,
      averageResponseTime: 0,
    });
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesUserId = !searchUserId || log.user_id.includes(searchUserId);
    const matchesAction =
      selectedAction === 'all' || log.action.startsWith(selectedAction);
    return matchesUserId && matchesAction;
  });

  const exportAuditReport = () => {
    const csv =
      'User ID,Action,Table,Record ID,Timestamp,IP Address\n' +
      filteredLogs
        .map(
          (log) =>
            `"${log.user_id}","${log.action}","${log.table_name}","${log.record_id}","${log.timestamp}","${log.ip_address}"`
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Compliance Officer Dashboard"
        subtitle="Monitor system audit logs and compliance events"
        email={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Audit Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAuditEntries}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.usersActive}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Unique user actions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Critical Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.criticalEvents}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Emergency/Access events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <span className="text-sm font-medium">Operational</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">All systems normal</p>
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Viewer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>Real-time activity monitoring</CardDescription>
              </div>
              <Button onClick={exportAuditReport} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Search User ID</label>
                <Input
                  placeholder="Enter user ID..."
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Action Type</label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                >
                  <option value="all">All Actions</option>
                  <option value="patient">Patient</option>
                  <option value="prescription">Prescription</option>
                  <option value="medical_record">Medical Record</option>
                  <option value="lab">Lab</option>
                  <option value="inventory">Inventory</option>
                  <option value="user">User Management</option>
                  <option value="emergency">Emergency/Critical</option>
                </select>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Timestamp</th>
                    <th className="text-left p-3 font-medium">User ID</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Table</th>
                    <th className="text-left p-3 font-medium">Record ID</th>
                    <th className="text-left p-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.slice(0, 50).map((log) => (
                      <tr
                        key={log.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 text-xs font-mono">
                          {log.user_id.substring(0, 8)}...
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-xs">{log.table_name}</td>
                        <td className="p-3 text-xs font-mono">
                          {log.record_id?.substring(0, 8)}...
                        </td>
                        <td className="p-3 text-xs font-mono">
                          {log.ip_address || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredLogs.length > 50 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 50 of {filteredLogs.length} entries. Export to see all.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
