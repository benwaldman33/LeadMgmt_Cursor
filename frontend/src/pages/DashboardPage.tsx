import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import ActivityFeed from '../components/ActivityFeed';
import LiveActivityFeed from '../components/LiveActivityFeed';
import { MetricsCard } from '../components/dashboard/MetricsCard';
import { TrendsChart } from '../components/dashboard/TrendsChart';
import { PerformanceTable } from '../components/dashboard/PerformanceTable';
import RealTimeMetrics from '../components/dashboard/RealTimeMetrics';
import { AdvancedChart } from '../components/dashboard/AdvancedChart';
import { AnalyticsService } from '../services/analyticsService';
import type { DashboardMetrics, LeadTrends, CampaignPerformance, TeamPerformance } from '../services/analyticsService';
import { useNotifications } from '../contexts/NotificationContext';

const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<LeadTrends | null>(null);
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [metricsData, trendsData, campaignsData, teamsData] = await Promise.all([
          AnalyticsService.getDashboardMetrics(),
          AnalyticsService.getLeadTrends(30),
          AnalyticsService.getCampaignPerformance(),
          AnalyticsService.getTeamPerformance(),
        ]);

        setMetrics(metricsData);
        setTrends(trendsData);
        setCampaignPerformance(campaignsData);
        setTeamPerformance(teamsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load dashboard data'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [addNotification]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to the Universal Lead Scoring Platform
        </p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricsCard
            title="Total Leads"
            value={metrics.totalLeads}
            icon={<DocumentTextIcon className="h-6 w-6" />}
            color="blue"
          />
          <MetricsCard
            title="Qualified Leads"
            value={metrics.qualifiedLeads}
            subtitle={`${metrics.conversionRate}% conversion rate`}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="green"
          />
          <MetricsCard
            title="Average Score"
            value={metrics.averageScore}
            format="percentage"
            icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
            color="purple"
          />
          <MetricsCard
            title="Active Campaigns"
            value={metrics.totalCampaigns}
            icon={<ChartBarIcon className="h-6 w-6" />}
            color="orange"
          />
        </div>
      )}

      {/* Real-Time Metrics */}
      {metrics && (
        <div className="mb-8">
          <RealTimeMetrics
            metrics={[
              {
                title: 'Leads Today',
                value: metrics.realTimeMetrics?.leadsToday || 0,
                change: 5
              },
              {
                title: 'Qualified Today',
                value: metrics.realTimeMetrics?.qualifiedToday || 0,
                change: 2
              },
              {
                title: 'Avg Score Today',
                value: metrics.realTimeMetrics?.averageScoreToday || 0,
                change: 2
              },
              {
                title: 'Conversion Rate',
                value: metrics.conversionRate,
                change: 1.5
              }
            ]}
          />
        </div>
      )}

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

      {/* Analytics Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Lead Trends Chart */}
        {trends && (
          <TrendsChart
            data={trends}
            title="Lead Trends (Last 30 Days)"
            type="daily"
          />
        )}

        {/* Campaign Performance */}
        {campaignPerformance.length > 0 && (
          <PerformanceTable
            title="Top Campaign Performance"
            data={campaignPerformance.map(campaign => ({
              name: campaign.campaignName,
              value: campaign.totalLeads,
              change: campaign.qualifiedLeads,
              trend: 'up' as const,
              format: 'number' as const,
              industry: campaign.industry,
            }))}
          />
        )}
      </div>

      {/* Advanced Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <AdvancedChart
          title="Lead Status Distribution"
          type="pie"
          data={[
            { label: 'Raw', value: metrics?.totalLeads ? Math.floor(metrics.totalLeads * 0.3) : 0 },
            { label: 'Scored', value: metrics?.totalLeads ? Math.floor(metrics.totalLeads * 0.4) : 0 },
            { label: 'Qualified', value: metrics?.qualifiedLeads || 0 },
            { label: 'Delivered', value: metrics?.totalLeads ? Math.floor(metrics.totalLeads * 0.1) : 0 }
          ]}
          colorScheme="blue"
          height={300}
        />
        
        <AdvancedChart
          title="Score Distribution"
          type="bar"
          data={[
            { label: '80-100', value: 25 },
            { label: '60-79', value: 45 },
            { label: '40-59', value: 30 },
            { label: '20-39', value: 15 },
            { label: '0-19', value: 5 }
          ]}
          colorScheme="green"
          height={300}
        />
        
        <AdvancedChart
          title="Conversion Funnel"
          type="funnel"
          data={[
            { label: 'Raw Leads', value: metrics?.totalLeads || 0 },
            { label: 'Scored', value: metrics?.totalLeads ? Math.floor(metrics.totalLeads * 0.7) : 0 },
            { label: 'Qualified', value: metrics?.qualifiedLeads || 0 },
            { label: 'Delivered', value: metrics?.totalLeads ? Math.floor(metrics.totalLeads * 0.1) : 0 }
          ]}
          colorScheme="purple"
          height={300}
        />
      </div>

      {/* Team Performance and Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Performance */}
        {teamPerformance.length > 0 && (
          <PerformanceTable
            title="Team Performance"
            data={teamPerformance.map(team => ({
              name: team.teamName,
              value: team.totalLeads,
              change: team.qualifiedLeads,
              trend: 'up' as const,
              format: 'number' as const,
              memberCount: team.memberCount,
            }))}
          />
        )}

        {/* Live Activity Feed */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Live Activity Feed</h2>
          <LiveActivityFeed activities={[]} />
        </div>

        {/* Historical Activity Feed */}
        <ActivityFeed limit={8} />
      </div>
    </div>
  );
};

export default DashboardPage; 