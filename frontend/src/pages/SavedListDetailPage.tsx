import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import discoveryService from '../services/discoveryService';
import { useNotifications } from '../contexts/NotificationContext';

const SavedListDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotifications();

  const [list, setList] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await discoveryService.getSavedList(id);
      setList(data);
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to load list', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const togglePin = async () => {
    if (!list) return;
    try {
      setBusy(true);
      const updated = await discoveryService.updateSavedList(list.id, { pinned: !list.pinned });
      setList((prev: any) => ({ ...prev, pinned: updated.pinned, updatedAt: updated.updatedAt, expiresAt: updated.expiresAt }));
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to update list', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  const deleteList = async () => {
    if (!list) return;
    const ok = window.confirm(`Delete saved list "${list.name}"?`);
    if (!ok) return;
    try {
      setBusy(true);
      await discoveryService.deleteSavedList(list.id);
      addNotification({ type: 'success', title: 'Deleted', message: `Deleted "${list.name}"` });
      navigate('/discovery/saved-lists');
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Failed to delete list', message: e?.response?.data?.error || 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-3 py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-gray-600">Loading list…</div>
      </div>
    );
  }

  if (!list) {
    return <div className="text-gray-600">List not found.</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
          <p className="text-gray-600 mt-1">
            {list.industry}{list.productVertical ? ` · ${list.productVertical}` : ''}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Captured: {new Date(list.capturedAt).toLocaleString()} · Updated: {new Date(list.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="space-x-2">
          <button
            onClick={togglePin}
            disabled={busy}
            className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {list.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={deleteList}
            disabled={busy}
            className="px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.items?.map((item: any, idx: number) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.rank ?? idx + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    {item.url}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeof item.relevanceScore === 'number' ? `${Math.round(item.relevanceScore * 100)}%` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.companyType || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SavedListDetailPage;


