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
// Get all teams
router.get('/', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teams = yield index_1.prisma.team.findMany({
            include: {
                members: true,
                campaigns: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ teams });
    }
    catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Create team
router.post('/', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, industry } = req.body;
        const team = yield index_1.prisma.team.create({
            data: {
                name,
                industry,
            },
            include: {
                members: true,
            },
        });
        res.status(201).json({ team });
    }
    catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
