"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBulkDelete = exports.validateBulkEnrichment = exports.validateBulkScoring = exports.validateBulkStatusUpdate = exports.validateLead = exports.validateRequest = exports.validate = exports.bulkDeleteSchema = exports.bulkEnrichmentSchema = exports.bulkScoringSchema = exports.bulkStatusUpdateSchema = exports.leadValidationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Lead validation schema
exports.leadValidationSchema = joi_1.default.object({
    url: joi_1.default.string()
        .uri()
        .required()
        .messages({
        'string.uri': 'Please enter a valid URL',
        'any.required': 'URL is required',
        'string.empty': 'URL cannot be empty'
    }),
    companyName: joi_1.default.string()
        .min(2)
        .max(100)
        .required()
        .messages({
        'string.min': 'Company name must be at least 2 characters',
        'string.max': 'Company name cannot exceed 100 characters',
        'any.required': 'Company name is required',
        'string.empty': 'Company name cannot be empty'
    }),
    domain: joi_1.default.string()
        .min(3)
        .max(100)
        .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)
        .required()
        .messages({
        'string.min': 'Domain must be at least 3 characters',
        'string.max': 'Domain cannot exceed 100 characters',
        'string.pattern.base': 'Please enter a valid domain (e.g., example.com)',
        'any.required': 'Domain is required',
        'string.empty': 'Domain cannot be empty'
    }),
    industry: joi_1.default.string()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'Industry must be at least 2 characters',
        'string.max': 'Industry cannot exceed 50 characters',
        'any.required': 'Industry is required',
        'string.empty': 'Industry cannot be empty'
    }),
    campaignId: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Campaign is required',
        'string.empty': 'Campaign cannot be empty'
    }),
    status: joi_1.default.string()
        .valid('RAW', 'SCORED', 'QUALIFIED', 'DELIVERED', 'REJECTED')
        .default('RAW')
        .messages({
        'any.only': 'Status must be one of: RAW, SCORED, QUALIFIED, DELIVERED, REJECTED'
    }),
    assignedToId: joi_1.default.string()
        .optional()
        .allow('')
        .messages({
        'string.empty': 'Assigned user cannot be empty if provided'
    }),
    assignedTeamId: joi_1.default.string()
        .optional()
        .allow('')
        .messages({
        'string.empty': 'Assigned team cannot be empty if provided'
    })
});
// Bulk status update validation schema
exports.bulkStatusUpdateSchema = joi_1.default.object({
    leadIds: joi_1.default.array()
        .items(joi_1.default.string())
        .min(1)
        .required()
        .messages({
        'array.min': 'At least one lead must be selected',
        'any.required': 'Lead IDs are required'
    }),
    status: joi_1.default.string()
        .valid('RAW', 'SCORED', 'QUALIFIED', 'DELIVERED', 'REJECTED')
        .required()
        .messages({
        'any.only': 'Status must be one of: RAW, SCORED, QUALIFIED, DELIVERED, REJECTED',
        'any.required': 'Status is required'
    })
});
// Bulk scoring validation schema
exports.bulkScoringSchema = joi_1.default.object({
    leadIds: joi_1.default.array()
        .items(joi_1.default.string())
        .min(1)
        .required()
        .messages({
        'array.min': 'At least one lead must be selected',
        'any.required': 'Lead IDs are required'
    }),
    scoringModelId: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Scoring model is required'
    })
});
// Bulk enrichment validation schema
exports.bulkEnrichmentSchema = joi_1.default.object({
    leadIds: joi_1.default.array()
        .items(joi_1.default.string())
        .min(1)
        .required()
        .messages({
        'array.min': 'At least one lead must be selected',
        'any.required': 'Lead IDs are required'
    })
});
// Bulk delete validation schema
exports.bulkDeleteSchema = joi_1.default.object({
    leadIds: joi_1.default.array()
        .items(joi_1.default.string())
        .min(1)
        .required()
        .messages({
        'array.min': 'At least one lead must be selected',
        'any.required': 'Lead IDs are required'
    })
});
// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            const errorMessages = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({
                error: 'Validation failed',
                details: errorMessages
            });
        }
        // Replace req.body with validated data
        req.body = value;
        next();
    };
};
exports.validate = validate;
// validateRequest function for use with Joi schemas
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            const errorMessages = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({
                error: 'Validation failed',
                details: errorMessages
            });
        }
        // Replace req.body with validated data
        req.body = value;
        next();
    };
};
exports.validateRequest = validateRequest;
// Specific validation middlewares
exports.validateLead = (0, exports.validate)(exports.leadValidationSchema);
exports.validateBulkStatusUpdate = (0, exports.validate)(exports.bulkStatusUpdateSchema);
exports.validateBulkScoring = (0, exports.validate)(exports.bulkScoringSchema);
exports.validateBulkEnrichment = (0, exports.validate)(exports.bulkEnrichmentSchema);
exports.validateBulkDelete = (0, exports.validate)(exports.bulkDeleteSchema);
