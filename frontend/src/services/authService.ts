import api from './api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role?: string;
  teamId?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ProfileUpdateData {
  fullName?: string;
  email?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  private static TOKEN_KEY = 'bbds_access_token';
  private static USER_KEY = 'bbds_user';

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('🔑 [AUTH SERVICE] Login method called');
    console.log('📧 Email:', credentials.email);
    console.log('🔒 Password provided:', !!credentials.password);
    
    try {
      console.log('📤 [AUTH SERVICE] Making API call to /auth/login');
      const response = await api.post('/auth/login', credentials);
      
      console.log('✅ [AUTH SERVICE] API response received');
      console.log('📊 Response status:', response.status);
      console.log('📦 Full response:', JSON.stringify(response.data, null, 2));
      
      const { user, accessToken } = response.data.data;
      
      if (!user) {
        console.error('❌ [AUTH SERVICE] No user in response');
        throw new Error('Authentication failed: No user data received');
      }
      
      if (!accessToken) {
        console.error('❌ [AUTH SERVICE] No access token in response');
        throw new Error('Authentication failed: No access token received');
      }
      
      console.log('💾 [AUTH SERVICE] Storing authentication data');
      console.log('👤 User data:', user);
      console.log('🔑 Token (first 20 chars):', accessToken.substring(0, 20) + '...');
      
      // Store token and user data
      this.setToken(accessToken);
      this.setUser(user);
      
      console.log('🎉 [AUTH SERVICE] Login successful!');
      return { user, accessToken };
    } catch (error: any) {
      console.error('💥 [AUTH SERVICE] Login failed');
      console.error('🚨 Error type:', error.constructor.name);
      console.error('📝 Error message:', error.message);
      
      if (error.response) {
        console.error('📊 HTTP Status:', error.response.status);
        console.error('💀 Response data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('🌐 No response received');
        console.error('📡 Request:', error.request);
      }
      
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const { user, accessToken } = response.data.data;
    
    // Store token and user data
    this.setToken(accessToken);
    this.setUser(user);
    
    return { user, accessToken };
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call success
      this.clearAuth();
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    const response = await api.put('/auth/profile', data);
    const updatedUser = response.data.data;
    
    // Update stored user data
    this.setUser(updatedUser);
    
    return updatedUser;
  }

  /**
   * Change password
   */
  async changePassword(data: PasswordChangeData): Promise<void> {
    await api.post('/auth/change-password', data);
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(): Promise<User[]> {
    const response = await api.get('/auth/users');
    return response.data.data;
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId: string, data: {
    role?: string;
    status?: string;
    teamId?: string;
  }): Promise<User> {
    const response = await api.put(`/auth/users/${userId}`, data);
    return response.data.data;
  }

  // Token management

  /**
   * Get stored access token
   */
  getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  /**
   * Set access token
   */
  setToken(token: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
  }

  /**
   * Remove access token
   */
  removeToken(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // User data management

  /**
   * Get stored user data
   */
  getUser(): User | null {
    const userData = localStorage.getItem(AuthService.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Set user data
   */
  setUser(user: User): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  /**
   * Remove user data
   */
  removeUser(): void {
    localStorage.removeItem(AuthService.USER_KEY);
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    this.removeToken();
    this.removeUser();
  }

  // Role-based access control

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN');
  }

  /**
   * Check if user is analyst or admin
   */
  isAnalyst(): boolean {
    return this.hasAnyRole(['SUPER_ADMIN', 'ANALYST']);
  }

  /**
   * Check if user can view
   */
  canView(): boolean {
    return this.hasAnyRole(['SUPER_ADMIN', 'ANALYST', 'VIEWER']);
  }

  // Utility methods

  /**
   * Get user's display name
   */
  getDisplayName(): string {
    const user = this.getUser();
    return user?.fullName || user?.email || 'Unknown User';
  }

  /**
   * Get user's email
   */
  getEmail(): string {
    const user = this.getUser();
    return user?.email || '';
  }

  /**
   * Get user's role
   */
  getRole(): string {
    const user = this.getUser();
    return user?.role || '';
  }

  /**
   * Get user's team ID
   */
  getTeamId(): string | undefined {
    const user = this.getUser();
    return user?.teamId;
  }

  /**
   * Check if user is active
   */
  isActive(): boolean {
    const user = this.getUser();
    return user?.status === 'ACTIVE';
  }

  /**
   * Get role display name
   */
  static getRoleDisplayName(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ANALYST':
        return 'Analyst';
      case 'VIEWER':
        return 'Viewer';
      default:
        return role;
    }
  }

  /**
   * Get role color
   */
  static getRoleColor(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'text-red-600 bg-red-100';
      case 'ANALYST':
        return 'text-blue-600 bg-blue-100';
      case 'VIEWER':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get available roles
   */
  static getAvailableRoles(): Array<{ value: string; label: string }> {
    return [
      { value: 'VIEWER', label: 'Viewer' },
      { value: 'ANALYST', label: 'Analyst' },
      { value: 'SUPER_ADMIN', label: 'Super Admin' }
    ];
  }

  /**
   * Get available statuses
   */
  static getAvailableStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'SUSPENDED', label: 'Suspended' }
    ];
  }

  /**
   * Format date
   */
  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get time until token expires
   */
  getTimeUntilExpiration(): number {
    const expiration = this.getTokenExpiration();
    if (!expiration) return 0;
    return expiration.getTime() - Date.now();
  }
}

// Create singleton instance
export const authService = new AuthService(); 