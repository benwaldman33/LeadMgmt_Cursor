import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import EditCampaignPage from './pages/EditCampaignPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import LeadsPage from './pages/LeadsPage';
import CreateLeadPage from './pages/CreateLeadPage';
import EditLeadPage from './pages/EditLeadPage';
import ScoringModelsPage from './pages/ScoringModelsPage';
import CreateScoringModelPage from './pages/CreateScoringModelPage';
import EditScoringModelPage from './pages/EditScoringModelPage';
import ScoringModelDetailPage from './pages/ScoringModelDetailPage';
import ScoringDashboardPage from './pages/ScoringDashboardPage';
import LeadDetailPage from './pages/LeadDetailPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReportsPage from './pages/ReportsPage';
import AIScoringPage from './pages/AIScoringPage';
import IntegrationsPage from './pages/IntegrationsPage';
import WorkflowsPage from './pages/WorkflowsPage';
import CreateWorkflowPage from './pages/CreateWorkflowPage';
import WorkflowExecutionHistoryPage from './pages/WorkflowExecutionHistoryPage';
import WorkflowExecutionDetailPage from './pages/WorkflowExecutionDetailPage';
import BusinessRulesPage from './pages/BusinessRulesPage';
import CreateBusinessRulePage from './pages/CreateBusinessRulePage';
import BusinessRuleTestPage from './pages/BusinessRuleTestPage';
import WebScrapingPage from './pages/WebScrapingPage';
import ApifyPage from './pages/ApifyPage';
import AdminPanelPage from './pages/AdminPanelPage';
import PipelinePage from './pages/PipelinePage';
import PipelineResultsPage from './pages/PipelineResultsPage';
import AIDiscoveryPage from './pages/AIDiscoveryPage';
import MarketDiscoveryPage from './pages/MarketDiscoveryPage';
import MarketDiscoveryWizardPage from './pages/MarketDiscoveryWizardPage';
import DiscoveryProgressPage from './pages/DiscoveryProgressPage';
import TeamsPage from './pages/TeamsPage';
import ServiceConfigurationPage from './pages/ServiceConfigurationPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user, token, redirectPending, renderKey } = useAuth();

  // Add more detailed logging to track state changes
  console.log('🛡️ [PROTECTED ROUTE] Auth state:', { 
    isAuthenticated, 
    loading, 
    hasUser: !!user, 
    hasToken: !!token,
    redirectPending,
    renderKey,
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    timestamp: new Date().toISOString()
  });

  // Check for state inconsistency
  if (isAuthenticated && !user) {
    console.warn('⚠️ [PROTECTED ROUTE] State inconsistency detected: isAuthenticated=true but no user');
  }

  if (loading || redirectPending) {
    console.log('⏳ [PROTECTED ROUTE] Still loading or redirect pending...', { loading, redirectPending });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ [PROTECTED ROUTE] Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ [PROTECTED ROUTE] Authenticated, rendering protected content');
  return <DashboardLayout>{children}</DashboardLayout>;
};

// Public Route component - NO navigation logic, just show content based on auth state
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    // Don't redirect here! Just show loading while AuthContext handles navigation
    return <div>Redirecting to dashboard...</div>;
  }

  // Show public content (login page)
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns"
        element={
          <ProtectedRoute>
            <CampaignsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/new"
        element={
          <ProtectedRoute>
            <CreateCampaignPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/:id/edit"
        element={
          <ProtectedRoute>
            <EditCampaignPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/:id"
        element={
          <ProtectedRoute>
            <CampaignDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <LeadsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leads/new"
        element={
          <ProtectedRoute>
            <CreateLeadPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leads/:id"
        element={
          <ProtectedRoute>
            <LeadDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leads/:id/edit"
        element={
          <ProtectedRoute>
            <EditLeadPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scoring"
        element={
          <ProtectedRoute>
            <ScoringModelsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scoring/new"
        element={
          <ProtectedRoute>
            <CreateScoringModelPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scoring/:id"
        element={
          <ProtectedRoute>
            <ScoringModelDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scoring/:id/edit"
        element={
          <ProtectedRoute>
            <EditScoringModelPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scoring-dashboard"
        element={
          <ProtectedRoute>
            <ScoringDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-scoring"
        element={
          <ProtectedRoute>
            <AIScoringPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/integrations"
        element={
          <ProtectedRoute>
            <IntegrationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflows"
        element={
          <ProtectedRoute>
            <WorkflowsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflows/new"
        element={
          <ProtectedRoute>
            <CreateWorkflowPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflows/executions"
        element={
          <ProtectedRoute>
            <WorkflowExecutionHistoryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/workflows/executions/:executionId"
        element={
          <ProtectedRoute>
            <WorkflowExecutionDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/business-rules"
        element={
          <ProtectedRoute>
            <BusinessRulesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/business-rules/new"
        element={
          <ProtectedRoute>
            <CreateBusinessRulePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/business-rules/test"
        element={
          <ProtectedRoute>
            <BusinessRuleTestPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/business-rules/test/:ruleId"
        element={
          <ProtectedRoute>
            <BusinessRuleTestPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/web-scraping"
        element={
          <ProtectedRoute>
            <WebScrapingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/apify"
        element={
          <ProtectedRoute>
            <ApifyPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pipeline"
        element={
          <ProtectedRoute>
            <PipelinePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns/:campaignId/pipeline-results"
        element={
          <ProtectedRoute>
            <PipelineResultsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-discovery"
        element={
          <ProtectedRoute>
            <AIDiscoveryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/market-discovery"
        element={
          <ProtectedRoute>
            <MarketDiscoveryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/market-discovery/wizard"
        element={
          <ProtectedRoute>
            <MarketDiscoveryWizardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/market-discovery/execution/:executionId"
        element={
          <ProtectedRoute>
            <DiscoveryProgressPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <TeamsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/service-configuration"
        element={
          <ProtectedRoute>
            <ServiceConfigurationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanelPage />
          </ProtectedRoute>
        }
      />

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
              <ToastContainer />
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
