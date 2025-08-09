"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const client_1 = require("@prisma/client");
const readline_1 = __importDefault(require("readline"));
const prisma = new client_1.PrismaClient();
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
function question(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            rl.question(prompt, resolve);
        });
    });
}
function setupClaude() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('🤖 Claude API Configuration Setup');
        console.log('================================\n');
        try {
            // Check if configuration already exists
            const existingConfig = yield prisma.systemConfig.findMany({
                where: {
                    key: {
                        in: ['CLAUDE_API_KEY', 'CLAUDE_MODEL', 'CLAUDE_MAX_TOKENS']
                    }
                }
            });
            if (existingConfig.length > 0) {
                console.log('⚠️  Claude configuration already exists:');
                existingConfig.forEach(config => {
                    const value = config.isEncrypted ? '[ENCRYPTED]' : config.value;
                    console.log(`  ${config.key}: ${value}`);
                });
                const update = yield question('\nDo you want to update the configuration? (y/N): ');
                if (update.toLowerCase() !== 'y') {
                    console.log('Configuration unchanged.');
                    return;
                }
            }
            // Get API key
            console.log('\n📝 Claude API Configuration');
            console.log('You can get your API key from: https://console.anthropic.com/');
            const apiKey = yield question('Enter your Claude API key: ');
            if (!apiKey.trim()) {
                console.log('❌ API key is required');
                return;
            }
            // Get model preference
            console.log('\n🤖 Available Claude Models:');
            console.log('1. claude-3-sonnet-20240229 (Recommended - Balanced)');
            console.log('2. claude-3-haiku-20240307 (Fast - Cost effective)');
            console.log('3. claude-3-opus-20240229 (Most capable - Expensive)');
            const modelChoice = yield question('Select model (1-3, default: 1): ');
            let model = 'claude-3-sonnet-20240229';
            switch (modelChoice.trim()) {
                case '2':
                    model = 'claude-3-haiku-20240307';
                    break;
                case '3':
                    model = 'claude-3-opus-20240229';
                    break;
            }
            // Get max tokens
            const maxTokens = (yield question('Max tokens per request (default: 4000): ')) || '4000';
            // Get admin user for configuration
            const adminUser = yield prisma.user.findFirst({
                where: { role: 'SUPER_ADMIN' }
            });
            if (!adminUser) {
                console.log('❌ No admin user found. Please create an admin user first.');
                return;
            }
            // Save configurations
            const configs = [
                {
                    key: 'CLAUDE_API_KEY',
                    value: apiKey,
                    description: 'Claude API Key for AI scoring',
                    isEncrypted: true,
                    category: 'AI',
                    createdById: adminUser.id
                },
                {
                    key: 'CLAUDE_MODEL',
                    value: model,
                    description: 'Claude model to use for AI scoring',
                    isEncrypted: false,
                    category: 'AI',
                    createdById: adminUser.id
                },
                {
                    key: 'CLAUDE_MAX_TOKENS',
                    value: maxTokens,
                    description: 'Maximum tokens per Claude request',
                    isEncrypted: false,
                    category: 'AI',
                    createdById: adminUser.id
                }
            ];
            for (const config of configs) {
                yield prisma.systemConfig.upsert({
                    where: { key: config.key },
                    update: {
                        value: config.value,
                        description: config.description,
                        isEncrypted: config.isEncrypted,
                        category: config.category,
                        updatedAt: new Date()
                    },
                    create: config
                });
            }
            console.log('\n✅ Claude configuration saved successfully!');
            console.log(`📊 Model: ${model}`);
            console.log(`🔢 Max Tokens: ${maxTokens}`);
            console.log('\n🧪 Testing connection...');
            // Test the connection
            const { AIScoringService } = yield Promise.resolve().then(() => __importStar(require('../services/aiScoringService')));
            const aiService = new AIScoringService();
            try {
                const testResult = yield aiService.testClaudeConnection();
                if (testResult.success) {
                    console.log('✅ Claude API connection successful!');
                    console.log(`⏱️  Response time: ${testResult.responseTime}ms`);
                    if ((_a = testResult.details) === null || _a === void 0 ? void 0 : _a.response) {
                        console.log(`🤖 Response: ${testResult.details.response}`);
                    }
                }
                else {
                    console.log('❌ Claude API connection failed:');
                    console.log(`   ${testResult.message}`);
                }
            }
            catch (error) {
                console.log('❌ Error testing Claude connection:', error);
            }
        }
        catch (error) {
            console.error('❌ Error setting up Claude configuration:', error);
        }
        finally {
            rl.close();
            yield prisma.$disconnect();
        }
    });
}
// Run the setup
setupClaude().catch(console.error);
