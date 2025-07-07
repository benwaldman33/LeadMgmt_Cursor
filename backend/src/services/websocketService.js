"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketService = void 0;
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
        this.userSockets = new Map(); // userId -> socketIds[]
    }
    initialize(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:5173",
                methods: ["GET", "POST"]
            }
        });
        this.io.use((socket, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
                const user = yield prisma.user.findUnique({
                    where: { id: decoded.userId },
                    include: { team: true }
                });
                if (!user) {
                    return next(new Error('User not found'));
                }
                socket.data.user = user;
                next();
            }
            catch (error) {
                next(new Error('Authentication error'));
            }
        }));
        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.data.user.id}`);
            const userData = {
                userId: socket.data.user.id,
                teamId: socket.data.user.teamId || undefined,
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
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.data.user.id}`);
                this.connectedUsers.delete(socket.id);
                // Remove socket from user's socket list
                const userSockets = this.userSockets.get(socket.data.user.id) || [];
                const updatedSockets = userSockets.filter(id => id !== socket.id);
                if (updatedSockets.length === 0) {
                    this.userSockets.delete(socket.data.user.id);
                }
                else {
                    this.userSockets.set(socket.data.user.id, updatedSockets);
                }
            });
            socket.on('join_room', (room) => {
                socket.join(room);
                console.log(`User ${socket.data.user.id} joined room: ${room}`);
            });
            socket.on('leave_room', (room) => {
                socket.leave(room);
                console.log(`User ${socket.data.user.id} left room: ${room}`);
            });
        });
        console.log('WebSocket service initialized');
    }
    // Send notification to specific user
    sendToUser(userId, notification) {
        if (!this.io)
            return;
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
            userSockets.forEach(socketId => {
                this.io.to(socketId).emit('notification', notification);
            });
        }
    }
    // Send notification to team
    sendToTeam(teamId, notification) {
        if (!this.io)
            return;
        this.io.to(`team:${teamId}`).emit('notification', notification);
    }
    // Send notification to all connected users
    sendToAll(notification) {
        if (!this.io)
            return;
        this.io.emit('notification', notification);
    }
    // Send real-time updates for specific events
    sendLeadCreated(lead) {
        return __awaiter(this, void 0, void 0, function* () {
            const notification = {
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
        });
    }
    sendLeadUpdated(lead, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const notification = {
                type: 'lead_updated',
                title: 'Lead Updated',
                message: `Lead "${lead.firstName} ${lead.lastName}" has been updated`,
                data: { leadId: lead.id, lead, updatedBy },
                timestamp: new Date()
            };
            this.sendToAll(notification);
        });
    }
    sendLeadAssigned(lead, assignedTo, assignedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const notification = {
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
        });
    }
    sendLeadScored(lead, score) {
        return __awaiter(this, void 0, void 0, function* () {
            const notification = {
                type: 'lead_scored',
                title: 'Lead Scored',
                message: `Lead "${lead.firstName} ${lead.lastName}" scored ${score}%`,
                data: { leadId: lead.id, lead, score },
                timestamp: new Date()
            };
            this.sendToAll(notification);
        });
    }
    sendCampaignCreated(campaign, createdBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const notification = {
                type: 'campaign_created',
                title: 'New Campaign Created',
                message: `Campaign "${campaign.name}" has been created`,
                data: { campaignId: campaign.id, campaign, createdBy },
                timestamp: new Date()
            };
            this.sendToAll(notification);
        });
    }
    sendUserActivity(userId, activity) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({
                where: { id: userId },
                include: { team: true }
            });
            if (!user)
                return;
            const notification = {
                type: 'user_activity',
                title: 'User Activity',
                message: `${user.fullName} ${activity}`,
                data: { userId, activity, user },
                timestamp: new Date()
            };
            // Send to team members
            if (user.teamId) {
                this.sendToTeam(user.teamId, notification);
            }
        });
    }
    // Get connected users count
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    // Get connected users by team
    getConnectedUsersByTeam(teamId) {
        return Array.from(this.connectedUsers.values()).filter(user => user.teamId === teamId);
    }
}
exports.webSocketService = new WebSocketService();
