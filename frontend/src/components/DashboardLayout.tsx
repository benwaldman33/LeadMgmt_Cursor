import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearch from './GlobalSearch';
import RealTimeNotifications from './RealTimeNotifications';
import { webSocketService } from '../services/websocketService';
import {
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  ChartPieIcon,
  CpuChipIcon,
  PuzzlePieceIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Campaigns', href: '/campaigns', icon: ChartBarIcon },
  { name: 'Leads', href: '/leads', icon: DocumentTextIcon },
  { name: 'Pipeline', href: '/pipeline', icon: PlayIcon },
  { name: 'Scoring Models', href: '/scoring', icon: CogIcon },
  { name: 'AI/ML Scoring', href: '/ai-scoring', icon: CpuChipIcon },
  { name: 'Web Scraping', href: '/web-scraping', icon: GlobeAltIcon },
  { name: 'Workflows', href: '/workflows', icon: Cog6ToothIcon },
  { name: 'Business Rules', href: '/business-rules', icon: ShieldCheckIcon },
  { name: 'Integrations', href: '/integrations', icon: PuzzlePieceIcon },
  { name: 'Teams', href: '/teams', icon: UserGroupIcon },
  { name: 'Reports', href: '/reports', icon: ChartPieIcon },
  { name: 'Audit Logs', href: '/audit-logs', icon: ClockIcon },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (token) {
      console.log('[WebSocket Debug] Connecting with token:', token);
      webSocketService.connect(token);
    } else {
      webSocketService.disconnect();
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [token]);

  const handleLogout = () => {
    webSocketService.disconnect();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-semibold text-gray-900">Lead Scoring</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            {/* Superadmin link */}
            {user?.role === 'SUPER_ADMIN' && (
              <Link
                to="/admin"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/admin'
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <CogIcon className="mr-3 h-5 w-5" />
                Admin Panel
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-semibold text-gray-900">Lead Scoring</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            {/* Superadmin link */}
            {user?.role === 'SUPER_ADMIN' && (
              <Link
                to="/admin"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/admin'
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <CogIcon className="mr-3 h-5 w-5" />
                Admin Panel
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1">
              <GlobalSearch 
                className="max-w-md"
                onResultClick={(result) => {
                  // Navigate based on result type
                  switch (result.type) {
                    case 'LEAD':
                      navigate(`/leads/${result.id}`);
                      break;
                    case 'CAMPAIGN':
                      navigate(`/campaigns/${result.id}`);
                      break;
                    case 'USER':
                      navigate(`/users/${result.id}`);
                      break;
                    case 'TEAM':
                      navigate(`/teams/${result.id}`);
                      break;
                    case 'SCORING_MODEL':
                      navigate(`/scoring/${result.id}`);
                      break;
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Real-time Notifications */}
              <RealTimeNotifications />
              
              {/* User menu */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{user?.fullName}</p>
                    <p className="text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 