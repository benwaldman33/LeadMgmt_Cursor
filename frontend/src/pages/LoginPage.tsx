import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import ConnectionStatus from '../components/ConnectionStatus';
import DebugPanel from '../components/DebugPanel';
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { addNotification } = useNotifications();
  const { login, setAuth, isAuthenticated, redirectPending, user, renderKey } = useAuth();

  // Remove navigation logic - let AuthContext handle it entirely
  // This prevents conflicts between LoginPage navigation and AuthContext navigation

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => authService.login(credentials),
    onSuccess: (data) => {
      console.log('🎉 [LOGIN PAGE] Login mutation SUCCESS:', data);
      // Store success for debugging
      localStorage.setItem('lastLoginSuccess', JSON.stringify({ timestamp: new Date().toISOString(), data }));
      
      // Ensure we call setAuth with the correct data structure
      console.log('🔐 [LOGIN PAGE] Calling setAuth with user and token');
      setAuth(data.user, data.accessToken);
      
      // Let the auth context handle the timing and navigation
      console.log('🧭 [LOGIN PAGE] Auth context will handle navigation');
      
      addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: `Successfully logged in as ${data.user.fullName}`
      });
    },
    onError: (error: any) => {
      console.error('💥 [LOGIN PAGE] Login mutation ERROR:', error);
      // Store error for debugging
      localStorage.setItem('lastLoginError', JSON.stringify({ 
        timestamp: new Date().toISOString(), 
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      }));
      
      addNotification({
        type: 'error',
        title: 'Login failed',
        message: error.response?.data?.error || 'Failed to login. Please check your credentials.'
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [LOGIN PAGE] Form submitted');
    console.log('📧 Email:', formData.email);
    console.log('🔒 Password length:', formData.password.length);
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    if (!formData.email || !formData.password) {
      console.warn('⚠️ [LOGIN PAGE] Validation failed - missing fields');
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    setIsLoading(true);
    console.log('⏳ [LOGIN PAGE] Starting login process...');
    
    try {
      console.log('📞 [LOGIN PAGE] Calling authService.login...');
      const result = await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password
      });
      console.log('✅ [LOGIN PAGE] Login mutation completed successfully');
      console.log('🎉 Result:', result);
    } catch (error: any) {
      console.error('💥 [LOGIN PAGE] Login mutation failed');
      console.error('🚨 Error details:', error);
      console.error('📊 Error response:', error?.response?.data);
      console.error('🔢 Error status:', error?.response?.status);
    } finally {
      setIsLoading(false);
      console.log('🏁 [LOGIN PAGE] Login process completed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back to BBDS Lead Scoring Platform
          </p>
          
          {/* Connection Status */}
          <div className="mt-4 flex justify-center">
            <ConnectionStatus />
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || loginMutation.isPending}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading || loginMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Sign in
                    <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>

            {/* Error Display */}
            {loginMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Login failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {loginMutation.error?.response?.data?.error || 'Please check your credentials and try again.'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to BBDS?</span>
              </div>
            </div>
          </div>

          {/* Test Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">🧪 Test Credentials</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div 
                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                onClick={() => setFormData({ email: 'frontend-test@example.com', password: 'Test123!' })}
              >
                <strong>Frontend Test:</strong> frontend-test@example.com / Test123!
              </div>
              <div 
                className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                onClick={() => setFormData({ email: 'demo@test.com', password: 'DemoPassword123!' })}
              >
                <strong>Demo User:</strong> demo@test.com / DemoPassword123!
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Click to auto-fill credentials</p>
          </div>

          {/* Register Link */}
          <div className="mt-6">
            <Link
              to="/register"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Create a new account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
      
      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
};

export default LoginPage; 