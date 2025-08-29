import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';

export interface NotificationData {
  type: 'lead_created' | 'lead_updated' | 'lead_assigned' | 'lead_scored' | 'campaign_created' | 'user_activity' | 'pipeline_started' | 'pipeline_progress' | 'pipeline_completed' | 'pipeline_failed';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string;
  teamId?: string;
}

export interface WebSocketUser {
  userId: string;
  teamId?: string;
  socketId: string;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, WebSocketUser> = new Map();
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          // Allow all localhost ports for development
          if (!origin || /^(http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+)$/.test(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"]
      }
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        // In development, allow connections without tokens for testing
        if (!token) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[WebSocket] Development mode: allowing connection without token');
            socket.data.user = { id: 'dev-user', email: 'dev@example.com', teamId: null };
            return next();
          }
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { team: true }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        console.error('[WebSocket] Authentication error:', error);
        if (process.env.NODE_ENV === 'development') {
          console.log('[WebSocket] Development mode: allowing connection despite auth error');
          socket.data.user = { id: 'dev-user', email: 'dev@example.com', teamId: null };
          return next();
        }
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('[WebSocket] Connection established:', socket.id);
      
      // At this point, authentication has already been handled by io.use middleware
      const user = socket.data.user;
      if (!user) {
        console.warn('[WebSocket] No user found on socket after authentication:', socket.id);
        socket.disconnect(true);
        return;
      }
      console.log('[WebSocket] Authenticated user:', user.email || user.id);

      const userData: WebSocketUser = {
        userId: user.id,
        teamId: user.teamId || undefined,
        socketId: socket.id
      };

      this.connectedUsers.set(socket.id, userData);
        
        // Track user's sockets
        const userSockets = this.userSockets.get(socket.data.user.id) || [];
        userSockets.push(socket.id);
        this.userSockets.set(socket.data.user.id, userSockets);

        // Join user to their team room
        if (userData.teamId) {
          socket.join(`team:${userData.teamId}`);
        }

        // Join user to their personal room
        socket.join(`user:${userData.userId}`);

        // Send welcome message
        socket.emit('connected', {
          message: 'Connected to real-time updates',
          userId: userData.userId,
          teamId: userData.teamId
        });

        socket.on('disconnect', (reason) => {
          console.log('[WebSocket] Disconnected:', socket.id, 'Reason:', reason);
          this.connectedUsers.delete(socket.id);
          
          // Remove socket from user's socket list
          const userSockets = this.userSockets.get(socket.data.user.id) || [];
          const updatedSockets = userSockets.filter(id => id !== socket.id);
          if (updatedSockets.length === 0) {
            this.userSockets.delete(socket.data.user.id);
          } else {
            this.userSockets.set(socket.data.user.id, updatedSockets);
          }
        });

        socket.on('join_room', (room: string) => {
          socket.join(room);
          console.log(`User ${socket.data.user.id} joined room: ${room}`);
        });

        socket.on('leave_room', (room: string) => {
          socket.leave(room);
          console.log(`User ${socket.data.user.id} left room: ${room}`);
        });
      });

    console.log('WebSocket service initialized');
  }

  // Send notification to specific user
  sendToUser(userId: string, notification: NotificationData) {
    if (!this.io) return;

    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io!.to(socketId).emit('notification', notification);
      });
    }
  }

  // Send notification to team
  sendToTeam(teamId: string, notification: NotificationData) {
    if (!this.io) return;
    this.io.to(`team:${teamId}`).emit('notification', notification);
  }

  // Send notification to all connected users
  sendToAll(notification: NotificationData) {
    if (!this.io) return;
    this.io.emit('notification', notification);
  }

  // Send real-time updates for specific events
  async sendLeadCreated(lead: any) {
    const notification: NotificationData = {
      type: 'lead_created',
      title: 'New Lead Created',
      message: `Lead "${lead.firstName} ${lead.lastName}" has been created`,
      data: { leadId: lead.id, lead },
      timestamp: new Date()
    };

    // Send to all users
    this.sendToAll(notification);

    // Send to specific team if assigned
    if (lead.teamId) {
      this.sendToTeam(lead.teamId, notification);
    }
  }

  async sendLeadUpdated(lead: any, updatedBy: string) {
    const notification: NotificationData = {
      type: 'lead_updated',
      title: 'Lead Updated',
      message: `Lead "${lead.firstName} ${lead.lastName}" has been updated`,
      data: { leadId: lead.id, lead, updatedBy },
      timestamp: new Date()
    };

    this.sendToAll(notification);
  }

  async sendLeadAssigned(lead: any, assignedTo: string, assignedBy: string) {
    const notification: NotificationData = {
      type: 'lead_assigned',
      title: 'Lead Assigned',
      message: `Lead "${lead.firstName} ${lead.lastName}" has been assigned to you`,
      data: { leadId: lead.id, lead, assignedTo, assignedBy },
      timestamp: new Date(),
      userId: assignedTo
    };

    // Send to the assigned user
    this.sendToUser(assignedTo, notification);

    // Send to team
    if (lead.teamId) {
      this.sendToTeam(lead.teamId, notification);
    }
  }

  async sendLeadScored(lead: any, score: number) {
    const notification: NotificationData = {
      type: 'lead_scored',
      title: 'Lead Scored',
      message: `Lead "${lead.firstName} ${lead.lastName}" scored ${score}%`,
      data: { leadId: lead.id, lead, score },
      timestamp: new Date()
    };

    this.sendToAll(notification);
  }

  async sendCampaignCreated(campaign: any, createdBy: string) {
    const notification: NotificationData = {
      type: 'campaign_created',
      title: 'New Campaign Created',
      message: `Campaign "${campaign.name}" has been created`,
      data: { campaignId: campaign.id, campaign, createdBy },
      timestamp: new Date()
    };

    this.sendToAll(notification);
  }

  async sendUserActivity(userId: string, activity: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { team: true }
    });

    if (!user) return;

    const notification: NotificationData = {
      type: 'user_activity',
      title: 'User Activity',
      message: activity,
      data: { userId, activity },
      timestamp: new Date(),
      userId
    };

    // Send to team members
    if (user.teamId) {
      this.sendToTeam(user.teamId, notification);
    }
  }

  // Send pipeline notifications
  async sendPipelineNotification(type: 'pipeline_started' | 'pipeline_progress' | 'pipeline_completed' | 'pipeline_failed', title: string, message: string, data?: any) {
    const notification: NotificationData = {
      type,
      title,
      message,
      data,
      timestamp: new Date()
    };

    this.sendToAll(notification);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users by team
  getConnectedUsersByTeam(teamId: string): WebSocketUser[] {
    return Array.from(this.connectedUsers.values()).filter(user => user.teamId === teamId);
  }
}

export const webSocketService = new WebSocketService(); 