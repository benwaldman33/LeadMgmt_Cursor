import type { NotificationType } from '../contexts/NotificationContext';

export interface NotificationOptions {
  duration?: number;
  persistent?: boolean;
}

// Common notification messages
export const NOTIFICATION_MESSAGES = {
  // Lead operations
  LEAD_CREATED: 'Lead created successfully',
  LEAD_UPDATED: 'Lead updated successfully',
  LEAD_DELETED: 'Lead deleted successfully',
  LEAD_ENRICHED: 'Lead enriched successfully',
  LEAD_SCORED: 'Lead scored successfully',
  
  // Bulk operations
  BULK_STATUS_UPDATED: (count: number) => `Updated ${count} leads to new status`,
  BULK_SCORED: (count: number, qualified: number) => `Scored ${count} leads, ${qualified} qualified`,
  BULK_ENRICHED: (count: number) => `Enriched ${count} leads`,
  BULK_DELETED: (count: number) => `Deleted ${count} leads`,
  
  // Campaign operations
  CAMPAIGN_CREATED: 'Campaign created successfully',
  CAMPAIGN_UPDATED: 'Campaign updated successfully',
  CAMPAIGN_DELETED: 'Campaign deleted successfully',
  
  // Scoring operations
  SCORING_MODEL_CREATED: 'Scoring model created successfully',
  SCORING_MODEL_UPDATED: 'Scoring model updated successfully',
  SCORING_MODEL_DELETED: 'Scoring model deleted successfully',
  
  // Authentication
  LOGIN_SUCCESS: 'Logged in successfully',
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  LOGOUT_SUCCESS: 'Logged out successfully',
  
  // Validation
  VALIDATION_ERROR: 'Please fix the validation errors',
  REQUIRED_FIELDS: 'Please fill in all required fields',
  
  // General
  SAVE_SUCCESS: 'Changes saved successfully',
  SAVE_ERROR: 'Failed to save changes',
  DELETE_SUCCESS: 'Item deleted successfully',
  DELETE_ERROR: 'Failed to delete item',
  LOAD_ERROR: 'Failed to load data',
  NETWORK_ERROR: 'Network error. Please try again.',
  
  // User/Team assignment
  ASSIGNMENT_UPDATED: 'Assignment updated successfully',
  ASSIGNMENT_ERROR: 'Failed to update assignment',
} as const;

// Notification helper functions
export const createNotification = (
  type: NotificationType,
  title: string,
  message: string,
  options: NotificationOptions = {}
) => ({
  type,
  title,
  message,
  ...options,
});

// Success notifications
export const showSuccess = (title: string, message: string, options?: NotificationOptions) =>
  createNotification('success', title, message, options);

export const showError = (title: string, message: string, options?: NotificationOptions) =>
  createNotification('error', title, message, options);

export const showWarning = (title: string, message: string, options?: NotificationOptions) =>
  createNotification('warning', title, message, options);

export const showInfo = (title: string, message: string, options?: NotificationOptions) =>
  createNotification('info', title, message, options);

// Common notification patterns
export const showLeadCreated = () => showSuccess('Success', NOTIFICATION_MESSAGES.LEAD_CREATED);
export const showLeadUpdated = () => showSuccess('Success', NOTIFICATION_MESSAGES.LEAD_UPDATED);
export const showLeadDeleted = () => showSuccess('Success', NOTIFICATION_MESSAGES.LEAD_DELETED);
export const showLeadEnriched = () => showSuccess('Success', NOTIFICATION_MESSAGES.LEAD_ENRICHED);
export const showLeadScored = () => showSuccess('Success', NOTIFICATION_MESSAGES.LEAD_SCORED);

export const showBulkStatusUpdated = (count: number) => 
  showSuccess('Bulk Update', NOTIFICATION_MESSAGES.BULK_STATUS_UPDATED(count));

export const showBulkScored = (count: number, qualified: number) => 
  showSuccess('Bulk Scoring', NOTIFICATION_MESSAGES.BULK_SCORED(count, qualified));

export const showBulkEnriched = (count: number) => 
  showSuccess('Bulk Enrichment', NOTIFICATION_MESSAGES.BULK_ENRICHED(count));

export const showBulkDeleted = (count: number) => 
  showSuccess('Bulk Delete', NOTIFICATION_MESSAGES.BULK_DELETED(count));

export const showValidationError = () => 
  showError('Validation Error', NOTIFICATION_MESSAGES.VALIDATION_ERROR);

export const showNetworkError = () => 
  showError('Network Error', NOTIFICATION_MESSAGES.NETWORK_ERROR, { persistent: true });

export const showSaveError = () => 
  showError('Save Error', NOTIFICATION_MESSAGES.SAVE_ERROR);

export const showDeleteError = () => 
  showError('Delete Error', NOTIFICATION_MESSAGES.DELETE_ERROR);

export const showLoadError = () => 
  showError('Load Error', NOTIFICATION_MESSAGES.LOAD_ERROR); 