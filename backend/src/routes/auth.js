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
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';
// Register new user
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, fullName, role = 'VIEWER', teamId } = req.body;
        // Validation
        if (!email || !password || !fullName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and full name are required'
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }
        // Check if user already exists
        const existingUser = yield prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        // Hash password
        const passwordHash = yield bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = yield prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                role,
                teamId,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                teamId: true,
                status: true,
                createdAt: true
            }
        });
        // Generate token
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    teamId: user.teamId
                },
                accessToken
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register user'
        });
    }
}));
// Login user
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Find user
        const user = yield prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                fullName: true,
                role: true,
                teamId: true,
                status: true
            }
        });
        if (!user || user.status !== 'ACTIVE') {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Verify password
        const isValidPassword = yield bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Update last login
        yield prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });
        // Generate token
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    teamId: user.teamId
                },
                accessToken
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login'
        });
    }
}));
// Logout user
router.post('/logout', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout'
        });
    }
}));
// Get current user profile
router.get('/profile', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                teamId: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
}));
// Update user profile
router.put('/profile', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, email } = req.body;
        const updateData = {};
        if (fullName)
            updateData.fullName = fullName;
        if (email)
            updateData.email = email;
        const user = yield prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                teamId: true,
                status: true,
                updatedAt: true
            }
        });
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
}));
// Change password
router.post('/change-password', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters long'
            });
        }
        // Get current user with password
        const user = yield prisma.user.findUnique({
            where: { id: req.user.id },
            select: { passwordHash: true }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Verify current password
        const isValidPassword = yield bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        // Hash new password
        const passwordHash = yield bcryptjs_1.default.hash(newPassword, 12);
        // Update password
        yield prisma.user.update({
            where: { id: req.user.id },
            data: { passwordHash }
        });
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
}));
// Get all users (admin only)
router.get('/users', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if user is admin
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        const users = yield prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                teamId: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get users'
        });
    }
}));
// Update user (admin only)
router.put('/users/:userId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if user is admin
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        const { userId } = req.params;
        const { role, status, teamId } = req.body;
        const updateData = {};
        if (role)
            updateData.role = role;
        if (status)
            updateData.status = status;
        if (teamId !== undefined)
            updateData.teamId = teamId;
        const user = yield prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                teamId: true,
                status: true,
                updatedAt: true
            }
        });
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
}));
exports.default = router;
