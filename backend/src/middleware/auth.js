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
exports.requireViewer = exports.requireAnalyst = exports.requireSuperAdmin = exports.requireTeamAccess = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        // Fetch user from database to ensure they still exist and get latest data
        const user = yield index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                teamId: true,
                status: true
            }
        });
        if (!user || user.status !== 'ACTIVE') {
            return res.status(401).json({ error: 'Invalid or inactive user' });
        }
        // Convert null teamId to undefined for type safety
        const authUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            teamId: user.teamId || undefined
        };
        req.user = authUser;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
});
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
const requireTeamAccess = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const teamId = req.params.teamId || req.body.teamId;
    if (!teamId) {
        return res.status(400).json({ error: 'Team ID required' });
    }
    // Super admins can access any team
    if (req.user.role === 'SUPER_ADMIN') {
        return next();
    }
    // Check if user belongs to the team
    const userTeam = yield index_1.prisma.user.findFirst({
        where: {
            id: req.user.id,
            teamId: teamId
        }
    });
    if (!userTeam) {
        return res.status(403).json({ error: 'Access denied to this team' });
    }
    next();
});
exports.requireTeamAccess = requireTeamAccess;
exports.requireSuperAdmin = (0, exports.requireRole)(['SUPER_ADMIN']);
exports.requireAnalyst = (0, exports.requireRole)(['SUPER_ADMIN', 'ANALYST']);
exports.requireViewer = (0, exports.requireRole)(['SUPER_ADMIN', 'ANALYST', 'VIEWER']);
