import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import discoveryService, { type DiscoverySessionSummary } from '../services/discoveryService';
import { useNotifications } from '../contexts/NotificationContext';

const DiscoverySessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [sessions, setSessions] = useState<DiscoverySessionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await discoveryService.listSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to load sessions', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const togglePin = async (id: string, pinned: boolean) => {
    try {
      setUpdatingId(id);
      const updated = await discoveryService.updateSession(id, { pinned: !pinned });
      setSessions(prev => prev.map(s => (s.id === id ? { ...s, pinned: updated.pinned, expiresAt: updated.expiresAt, updatedAt: updated.updatedAt } : s)));
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to update session', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setUpdatingId(null);
    }
  };

  const openSession = (id: string) => {
    navigate(`/ai-discovery?sessionId=${encodeURIComponent(id)}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
        <p className="text-gray-600 mt-1">Pinned sessions appear first, followed by your recent sessions.</p>
      </div>

      {loading ? (
        <div className="flex items-center space-x-3 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-gray-600">Loading sessions…</div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-6 bg-white rounded-lg shadow text-center text-gray-600">
          No sessions yet. Start a new one from AI Discovery.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pinned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Vertical</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Autosaved</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map(session => (
                <tr key={session.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${session.pinned ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {session.pinned ? 'Pinned' : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.industry}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.productVertical || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(session.updatedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.lastAutoSavedAt ? new Date(session.lastAutoSavedAt).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => togglePin(session.id, session.pinned)}
                      disabled={updatingId === session.id}
                      className="px-3 py-1 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      title={session.pinned ? 'Unpin' : 'Pin'}
                    >
                      {session.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => openSession(session.id)}
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DiscoverySessionsPage;


