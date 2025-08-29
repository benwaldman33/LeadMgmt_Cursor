import { io, Socket } from 'socket.io-client';

export interface NotificationData {
  type: 'lead_created' | 'lead_updated' | 'lead_assigned' | 'lead_scored' | 'campaign_created' | 'user_activity' | 'pipeline_started' | 'pipeline_progress' | 'pipeline_completed' | 'pipeline_failed';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string;
  teamId?: string;
}

export interface WebSocketConnection {
  connected: boolean;
  userId?: string;
  teamId?: string;
  connecting: boolean;
  error?: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus: WebSocketConnection = { connected: false, connecting: false };
  private notificationCallbacks: ((notification: NotificationData) => void)[] = [];
  private connectionCallbacks: ((status: WebSocketConnection) => void)[] = [];
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private retryTimeout: NodeJS.Timeout | null = null;
  private currentToken: string | null = null;

  connect(token: string) {
    // Don't reconnect if already connected with the same token
    if (this.socket?.connected && this.currentToken === token) {
      return;
    }

    // Clear any existing connection attempts
    this.clearRetryTimeout();
    
    // Disconnect existing socket if different token
    if (this.socket && this.currentToken !== token) {
      this.disconnect();
    }

    this.currentToken = token;
    this.connectionStatus.connecting = true;
    this.connectionStatus.error = undefined;
    this.notifyConnectionChange();

    // Add a small delay to ensure backend is ready
    setTimeout(() => {
      this.attemptConnection(token);
    }, 100);
  }

  private attemptConnection(token: string) {
    try {
      console.log(`[WebSocket] Attempting connection (attempt ${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`);
      
      this.socket = io('http://localhost:3001', {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000, // 10 second timeout
        forceNew: true, // Force new connection
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected successfully');
        this.connectionAttempts = 0;
        this.connectionStatus.connected = true;
        this.connectionStatus.connecting = false;
        this.connectionStatus.error = undefined;
        this.notifyConnectionChange();
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[WebSocket] Disconnected:', reason);
        this.connectionStatus.connected = false;
        this.connectionStatus.connecting = false;
        this.notifyConnectionChange();
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('[WebSocket] Scheduling auto-reconnect due to:', reason);
          this.scheduleReconnect(token);
        } else {
          console.log('[WebSocket] Not auto-reconnecting due to reason:', reason);
        }
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('[WebSocket] Connection error:', error);
        this.connectionStatus.connecting = false;
        this.connectionStatus.error = error.message || 'Connection failed';
        this.notifyConnectionChange();
        
        // Retry connection if we haven't exceeded max attempts
        if (this.connectionAttempts < this.maxConnectionAttempts) {
          this.scheduleReconnect(token);
        }
      });

      this.socket.on('connected', (data: { message: string; userId: string; teamId?: string }) => {
        console.log('[WebSocket] Authenticated:', data);
        this.connectionStatus.userId = data.userId;
        this.connectionStatus.teamId = data.teamId;
        this.notifyConnectionChange();
      });

      this.socket.on('notification', (notification: NotificationData) => {
        try {
          console.log('[WebSocket] Received notification:', notification);
          // Ensure timestamp is properly formatted
          if (typeof notification.timestamp === 'string') {
            notification.timestamp = new Date(notification.timestamp);
          }
          this.notifyCallbacks(notification);
        } catch (error) {
          console.error('[WebSocket] Error processing notification:', error, notification);
        }
      });

      this.socket.on('error', (error: any) => {
        console.error('[WebSocket] Socket error:', error);
        this.connectionStatus.error = error.message || 'Socket error';
        this.notifyConnectionChange();
      });

    } catch (error) {
      console.error('[WebSocket] Failed to create socket:', error);
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = 'Failed to create socket';
      this.notifyConnectionChange();
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        this.scheduleReconnect(token);
      }
    }
  }

  private scheduleReconnect(token: string) {
    this.connectionAttempts++;
    
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('[WebSocket] Max connection attempts reached, giving up');
      this.connectionStatus.error = 'Max connection attempts reached';
      this.notifyConnectionChange();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 10000); // Exponential backoff, max 10s
    console.log(`[WebSocket] Scheduling reconnection attempt ${this.connectionAttempts + 1} in ${delay}ms`);
    
    this.retryTimeout = setTimeout(() => {
      this.attemptConnection(token);
    }, delay);
  }

  private clearRetryTimeout() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  disconnect() {
    this.clearRetryTimeout();
    this.connectionAttempts = 0;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionStatus = { connected: false, connecting: false };
    this.currentToken = null;
    this.notifyConnectionChange();
  }

  // Subscribe to notifications
  onNotification(callback: (notification: NotificationData) => void) {
    this.notificationCallbacks.push(callback);
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to connection status changes
  onConnectionChange(callback: (status: WebSocketConnection) => void) {
    this.connectionCallbacks.push(callback);
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  // Join a room
  joinRoom(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_room', room);
    }
  }

  // Leave a room
  leaveRoom(room: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', room);
    }
  }

  // Get current connection status
  getConnectionStatus(): WebSocketConnection {
    return { ...this.connectionStatus };
  }

  // Check if connected
  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  // Check if connecting
  isConnecting(): boolean {
    return this.connectionStatus.connecting;
  }

  // Manual retry connection
  retryConnection() {
    if (this.currentToken && !this.connectionStatus.connecting) {
      this.connectionAttempts = 0;
      this.attemptConnection(this.currentToken);
    }
  }

  private notifyCallbacks(notification: NotificationData) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  private notifyConnectionChange() {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback({ ...this.connectionStatus });
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }
}

export const webSocketService = new WebSocketService(); 