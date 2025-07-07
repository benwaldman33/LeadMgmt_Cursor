import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: string;
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'VIEWER'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      // Store token and user data
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      addNotification({
        type: 'success',
        title: 'Account created!',
        message: `Welcome ${data.user.fullName}! Your account has been created successfully.`
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Registration failed',
        message: error.response?.data?.error || 'Failed to create account. Please try again.'
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Passwords do not match'
      });
      return;
    }

    if (formData.password.length < 8) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Password must be at least 8 characters long'
      });
      return;
    }

    setIsLoading(true);
    try {
      await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    score += checks.length ? 1 : 0;
    score += checks.lowercase ? 1 : 0;
    score += checks.uppercase ? 1 : 0;
    score += checks.numbers ? 1 : 0;
    score += checks.special ? 1 : 0;

    if (score <= 2) return { level: 'weak', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (score <= 3) return { level: 'fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (score <= 4) return { level: 'good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    return { level: 'strong', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join BBDS Lead Scoring Platform
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

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

            {/* Role Field */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="VIEWER">Viewer</option>
                <option value="ANALYST">Analyst</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
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
                  autoComplete="new-password"
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      Password strength: {passwordStrength.level}
                    </span>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${passwordStrength.bgColor} ${passwordStrength.color}`}>
                      {passwordStrength.level.toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Password Requirements */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-xs">
                      {formData.password.length >= 8 ? (
                        <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <XMarkIcon className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      {/[a-z]/.test(formData.password) ? (
                        <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <XMarkIcon className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}>
                        Contains lowercase letter
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      {/[A-Z]/.test(formData.password) ? (
                        <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <XMarkIcon className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}>
                        Contains uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      {/\d/.test(formData.password) ? (
                        <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <XMarkIcon className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={/\d/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}>
                        Contains number
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center text-xs">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || registerMutation.isPending}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading || registerMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Create account
                    <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>

            {/* Error Display */}
            {registerMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Registration failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {registerMutation.error?.response?.data?.error || 'Please check your information and try again.'}
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
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-6">
            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign in to your account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{' '}
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
    </div>
  );
};

export default RegisterPage; 