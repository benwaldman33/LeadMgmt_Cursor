import { io, Socket } from 'socket.io-client';

export interface NotificationData {
  type: 'lead_created' | 'lead_updated' | 'lead_assigned' | 'lead_scored' | 'campaign_created' | 'user_activity';
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
}

class WebSocketService {
  private socket: Socket | null = null;
  private connectionStatus: WebSocketConnection = { connected: false };
  private notificationCallbacks: ((notification: NotificationData) => void)[] = [];
  private connectionCallbacks: ((status: WebSocketConnection) => void)[] = [];

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatus.connected = true;
      this.notifyConnectionChange();
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connectionStatus.connected = false;
      this.notifyConnectionChange();
    });

    this.socket.on('connected', (data: { userId: string; teamId?: string }) => {
      console.log('WebSocket authenticated:', data);
      this.connectionStatus.userId = data.userId;
      this.connectionStatus.teamId = data.teamId;
      this.notifyConnectionChange();
    });

    this.socket.on('notification', (notification: NotificationData) => {
      console.log('Received notification:', notification);
      this.notifyCallbacks(notification);
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = { connected: false };
      this.notifyConnectionChange();
    }
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