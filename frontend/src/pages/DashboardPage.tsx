import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  // Mock data - in real app, this would come from API
  const stats = [
    { name: 'Total Campaigns', value: '12', change: '+2', changeType: 'positive' },
    { name: 'Active Leads', value: '1,234', change: '+12%', changeType: 'positive' },
    { name: 'Qualified Leads', value: '456', change: '+8%', changeType: 'positive' },
    { name: 'Scoring Models', value: '8', change: '+1', changeType: 'positive' },
  ];

  const quickActions = [
    {
      name: 'Create Campaign',
      description: 'Start a new lead generation campaign',
      href: '/campaigns/new',
      icon: ChartBarIcon,
    },
    {
      name: 'Import Leads',
      description: 'Upload leads from CSV or manual entry',
      href: '/leads/import',
      icon: DocumentTextIcon,
    },
    {
      name: 'Create Scoring Model',
      description: 'Build a new AI-powered scoring model',
      href: '/scoring/new',
      icon: CogIcon,
    },
    {
      name: 'Manage Teams',
      description: 'Organize your team structure',
      href: '/teams',
      icon: UserGroupIcon,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to the Universal Lead Scoring Platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className="flex items-baseline">
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="card p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <action.icon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{action.name}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <PlusIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="card">
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    New campaign "Dental Equipment Q1 2024" created
                  </p>
                  <p className="text-sm text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    150 leads imported from CSV file
                  </p>
                  <p className="text-sm text-gray-500">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    Scoring model "Dental Practice v2" updated
                  </p>
                  <p className="text-sm text-gray-500">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 