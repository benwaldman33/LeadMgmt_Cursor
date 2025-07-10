import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import axios from 'axios';

interface Config {
  id: string;
  key: string;
  value: string;
  description?: string;
  isEncrypted: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { fullName: string; email: string };
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  user?: { fullName: string; email: string };
  createdAt: string;
}

interface SystemStats {
  users: number;
  leads: number;
  campaigns: number;
  scoringModels: number;
  integrations: number;
  auditLogs: number;
  configurations: number;
}

const AdminPanelPage: React.FC = () => {
  const { user, token } = useAuth();
  const { addNotification } = useNotifications();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    key: '',
    value: '',
    description: '',
    category: '',
    isEncrypted: false
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [configRes, auditRes, statsRes] = await Promise.all([
        axios.get('/api/admin/config', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setConfigs(configRes.data.data);
      setAuditLogs(auditRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load admin data' });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (config: Config) => {
    setEditingKey(config.key);
    setForm({
      key: config.key,
      value: '', // Don't prefill sensitive value
      description: config.description || '',
      category: config.category || '',
      isEncrypted: config.isEncrypted
    });
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm('Delete this config?')) return;
    try {
      await axios.delete(`/api/admin/config/${key}`, { headers: { Authorization: `Bearer ${token}` } });
      addNotification({ type: 'success', title: 'Deleted', message: 'Config deleted' });
      fetchAll();
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete config' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.key || !form.value) {
      addNotification({ type: 'error', title: 'Error', message: 'Key and value are required' });
      return;
    }
    try {
      await axios.post('/api/admin/config', form, { headers: { Authorization: `Bearer ${token}` } });
      addNotification({ type: 'success', title: 'Saved', message: 'Config saved' });
      setForm({ key: '', value: '', description: '', category: '', isEncrypted: false });
      setEditingKey(null);
      fetchAll();
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to save config' });
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-8 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
        <p className="text-red-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-3xl font-bold mb-6">Administration Panel</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* System Stats */}
          {stats && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} className="bg-gray-100 rounded p-4 text-center">
                  <div className="text-lg font-semibold">{k.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-2xl font-bold">{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Config Table */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-2">System Configuration</h3>
            <table className="min-w-full bg-white border rounded">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Key</th>
                  <th className="border px-2 py-1">Value</th>
                  <th className="border px-2 py-1">Description</th>
                  <th className="border px-2 py-1">Category</th>
                  <th className="border px-2 py-1">Encrypted</th>
                  <th className="border px-2 py-1">Created By</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.key} className="border-t">
                    <td className="border px-2 py-1 font-mono">{config.key}</td>
                    <td className="border px-2 py-1 truncate max-w-xs">{config.isEncrypted ? '[ENCRYPTED]' : config.value}</td>
                    <td className="border px-2 py-1">{config.description}</td>
                    <td className="border px-2 py-1">{config.category}</td>
                    <td className="border px-2 py-1 text-center">{config.isEncrypted ? 'Yes' : 'No'}</td>
                    <td className="border px-2 py-1">{config.createdBy?.fullName || ''}</td>
                    <td className="border px-2 py-1">
                      <button className="text-blue-600 hover:underline mr-2" onClick={() => handleEdit(config)}>Edit</button>
                      <button className="text-red-600 hover:underline" onClick={() => handleDelete(config.key)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Config Form */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">{editingKey ? 'Edit Config' : 'Add Config'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium">Key</label>
                <input name="key" value={form.key} onChange={handleFormChange} className="input-field w-full" disabled={!!editingKey} />
              </div>
              <div>
                <label className="block text-sm font-medium">Value</label>
                <input name="value" value={form.value} onChange={handleFormChange} className="input-field w-full" type="password" autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <input name="description" value={form.description} onChange={handleFormChange} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Category</label>
                <input name="category" value={form.category} onChange={handleFormChange} className="input-field w-full" />
              </div>
              <div className="flex items-center">
                <input name="isEncrypted" type="checkbox" checked={form.isEncrypted} onChange={handleFormChange} className="mr-2" />
                <label className="text-sm">Encrypted</label>
              </div>
              <div>
                <button type="submit" className="btn btn-primary w-full">{editingKey ? 'Update' : 'Add'}</button>
                {editingKey && (
                  <button type="button" className="btn btn-secondary w-full mt-2" onClick={() => { setEditingKey(null); setForm({ key: '', value: '', description: '', category: '', isEncrypted: false }); }}>Cancel</button>
                )}
              </div>
            </form>
          </div>

          {/* Audit Logs */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Recent Audit Logs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Action</th>
                    <th className="border px-2 py-1">Entity</th>
                    <th className="border px-2 py-1">Description</th>
                    <th className="border px-2 py-1">User</th>
                    <th className="border px-2 py-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="border px-2 py-1">{log.action}</td>
                      <td className="border px-2 py-1">{log.entityType}</td>
                      <td className="border px-2 py-1">{log.description}</td>
                      <td className="border px-2 py-1">{log.user?.fullName || ''}</td>
                      <td className="border px-2 py-1">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanelPage; 