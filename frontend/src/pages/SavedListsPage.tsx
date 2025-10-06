import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import discoveryService, { type SavedCustomerListSummary } from '../services/discoveryService';
import { useNotifications } from '../contexts/NotificationContext';

const SavedListsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [lists, setLists] = useState<SavedCustomerListSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await discoveryService.listSavedLists();
      setLists(Array.isArray(data) ? data : []);
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to load lists', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePin = async (id: string, pinned: boolean) => {
    try {
      setBusyId(id);
      const updated = await discoveryService.updateSavedList(id, { pinned: !pinned });
      setLists(prev => prev.map(l => (l.id === id ? { ...l, pinned: updated.pinned, updatedAt: updated.updatedAt, expiresAt: updated.expiresAt } : l)));
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to update list', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteList = async (id: string, name: string) => {
    const ok = window.confirm(`Delete saved list "${name}"?`);
    if (!ok) return;
    try {
      setBusyId(id);
      await discoveryService.deleteSavedList(id);
      setLists(prev => prev.filter(l => l.id !== id));
      addNotification({ type: 'success', title: 'Deleted', message: `Deleted "${name}"` });
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to delete list', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Saved Lists</h1>
        <p className="text-gray-600 mt-1">Your saved customer lists. Pinned lists are retained and shown first.</p>
      </div>

      {loading ? (
        <div className="flex items-center space-x-3 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-gray-600">Loading lists…</div>
        </div>
      ) : lists.length === 0 ? (
        <div className="p-6 bg-white rounded-lg shadow text-center text-gray-600">
          No saved lists yet. Save results from AI Discovery to see them here.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pinned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Vertical</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captured</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lists.map(list => (
                <tr key={list.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${list.pinned ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {list.pinned ? 'Pinned' : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 cursor-pointer" onClick={() => navigate(`/discovery/saved-lists/${list.id}`)}>
                    {list.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{list.industry}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{list.productVertical || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(list.capturedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(list.updatedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => togglePin(list.id, list.pinned)}
                      disabled={busyId === list.id}
                      className="px-3 py-1 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {list.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => deleteList(list.id, list.name)}
                      disabled={busyId === list.id}
                      className="px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => navigate(`/discovery/saved-lists/${list.id}`)}
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      View
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

export default SavedListsPage;


