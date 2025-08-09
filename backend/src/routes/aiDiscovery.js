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
const aiDiscoveryService_1 = require("../services/aiDiscoveryService");
const websocketService_1 = require("../services/websocketService");
const router = (0, express_1.Router)();
// Start a new discovery session
router.post('/sessions', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { industry } = req.body;
        if (!industry) {
            return res.status(400).json({ error: 'Industry is required' });
        }
        const session = yield aiDiscoveryService_1.AIDiscoveryService.startDiscoverySession(req.user.id, industry);
        // Send notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, `started AI discovery session for ${industry} industry`);
        res.json({
            success: true,
            session
        });
    }
    catch (error) {
        console.error('Error starting discovery session:', error);
        res.status(500).json({ error: 'Failed to start discovery session' });
    }
}));
// Get product verticals for an industry
router.get('/industries/:industry/verticals', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { industry } = req.params;
        const verticals = yield aiDiscoveryService_1.AIDiscoveryService.getProductVerticals(industry);
        res.json({
            success: true,
            verticals
        });
    }
    catch (error) {
        console.error('Error getting product verticals:', error);
        res.status(500).json({ error: 'Failed to get product verticals' });
    }
}));
// Add message to discovery session
router.post('/sessions/:sessionId/messages', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const { message, industry, productVertical } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        const updatedSession = yield aiDiscoveryService_1.AIDiscoveryService.addUserMessage(sessionId, message, industry, productVertical);
        res.json({
            success: true,
            session: updatedSession
        });
    }
    catch (error) {
        console.error('Error adding message to session:', error);
        res.status(500).json({ error: 'Failed to add message to session' });
    }
}));
// Generate customer insights for product vertical
router.post('/customer-insights', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { industry, productVertical } = req.body;
        if (!industry || !productVertical) {
            return res.status(400).json({ error: 'Industry and product vertical are required' });
        }
        const insights = yield aiDiscoveryService_1.AIDiscoveryService.generateCustomerInsights(industry, productVertical);
        res.json({
            success: true,
            insights
        });
    }
    catch (error) {
        console.error('Error generating customer insights:', error);
        res.status(500).json({ error: 'Failed to generate customer insights' });
    }
}));
// Search for customers based on criteria
router.post('/search-customers', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { industry, productVertical, customerTypes, constraints } = req.body;
        if (!industry || !productVertical) {
            return res.status(400).json({
                error: 'Industry and product vertical are required'
            });
        }
        // Ensure customerTypes is an array (can be empty)
        const customerTypesArray = Array.isArray(customerTypes) ? customerTypes : [];
        const results = yield aiDiscoveryService_1.AIDiscoveryService.searchForCustomers(industry, productVertical, customerTypesArray, constraints);
        // Send notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, `searched for ${results.length} customers in ${industry}/${productVertical}`);
        res.json({
            success: true,
            results,
            totalFound: results.length
        });
    }
    catch (error) {
        console.error('Error searching for customers:', error);
        res.status(500).json({ error: 'Failed to search for customers' });
    }
}));
// Get available industries
router.get('/industries', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const industries = [
            {
                id: 'dental',
                name: 'Dental',
                description: 'Dental equipment and services',
                marketSize: '$15B',
                growthRate: '6.2% annually'
            },
            {
                id: 'construction',
                name: 'Construction',
                description: 'Construction equipment and materials',
                marketSize: '$1.2T',
                growthRate: '4.8% annually'
            },
            {
                id: 'manufacturing',
                name: 'Manufacturing',
                description: 'Industrial manufacturing equipment',
                marketSize: '$2.1T',
                growthRate: '5.1% annually'
            },
            {
                id: 'healthcare',
                name: 'Healthcare',
                description: 'Medical equipment and healthcare technology',
                marketSize: '$500B',
                growthRate: '7.3% annually'
            },
            {
                id: 'food_beverage',
                name: 'Food & Beverage',
                description: 'Food processing and beverage manufacturing',
                marketSize: '$800B',
                growthRate: '5.9% annually'
            },
            {
                id: 'distribution',
                name: 'Distribution & Warehouse',
                description: 'Logistics and warehouse automation',
                marketSize: '$300B',
                growthRate: '8.1% annually'
            }
        ];
        res.json({
            success: true,
            industries
        });
    }
    catch (error) {
        console.error('Error getting industries:', error);
        res.status(500).json({ error: 'Failed to get industries' });
    }
}));
exports.default = router;
