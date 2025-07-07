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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const index_1 = require("../index");
const router = (0, express_1.Router)();
// Get all users for assignment (analyst accessible)
router.get('/assignment', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield index_1.prisma.user.findMany({
            where: {
                status: 'ACTIVE',
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                fullName: 'asc',
            },
        });
        res.json({ users });
    }
    catch (error) {
        console.error('Get users for assignment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get all users (super admin only)
router.get('/', auth_1.authenticateToken, auth_1.requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield index_1.prisma.user.findMany({
            include: {
                team: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ users });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get user by ID (super admin only)
router.get('/:id', auth_1.authenticateToken, auth_1.requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield index_1.prisma.user.findUnique({
            where: { id },
            include: {
                team: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Update user (super admin only)
router.put('/:id', auth_1.authenticateToken, auth_1.requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { fullName, role, status, teamId } = req.body;
        const user = yield index_1.prisma.user.update({
            where: { id },
            data: {
                fullName,
                role,
                status,
                teamId,
            },
            include: {
                team: true,
            },
        });
        res.json({ user });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
