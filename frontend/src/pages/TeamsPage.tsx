import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamsAPI } from '../services/api';

interface Team {
  id: string;
  name: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await teamsAPI.getAll();
      setTeams(response.teams || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg font-semibold mb-4">{error}</div>
        <button
          onClick={fetchTeams}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <Link
          to="/teams/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Create Team
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No teams found. Create your first team to get started.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">All Teams</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {teams.map((team) => (
              <div key={team.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{team.name}</h4>
                    <p className="text-sm text-gray-500">{team.industry}</p>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(team.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/teams/${team.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
