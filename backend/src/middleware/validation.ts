import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Lead validation schema
export const leadValidationSchema = Joi.object({
  url: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Please enter a valid URL',
      'any.required': 'URL is required',
      'string.empty': 'URL cannot be empty'
    }),
  companyName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name cannot exceed 100 characters',
      'any.required': 'Company name is required',
      'string.empty': 'Company name cannot be empty'
    }),
  domain: Joi.string()
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
  industry: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Industry must be at least 2 characters',
      'string.max': 'Industry cannot exceed 50 characters',
      'any.required': 'Industry is required',
      'string.empty': 'Industry cannot be empty'
    }),
  campaignId: Joi.string()
    .required()
    .messages({
      'any.required': 'Campaign is required',
      'string.empty': 'Campaign cannot be empty'
    }),
  status: Joi.string()
    .valid('RAW', 'SCORED', 'QUALIFIED', 'DELIVERED', 'REJECTED')
    .default('RAW')
    .messages({
      'any.only': 'Status must be one of: RAW, SCORED, QUALIFIED, DELIVERED, REJECTED'
    }),
  assignedToId: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.empty': 'Assigned user cannot be empty if provided'
    }),
  assignedTeamId: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.empty': 'Assigned team cannot be empty if provided'
    })
});

// Bulk status update validation schema
export const bulkStatusUpdateSchema = Joi.object({
  leadIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one lead must be selected',
      'any.required': 'Lead IDs are required'
    }),
  status: Joi.string()
    .valid('RAW', 'SCORED', 'QUALIFIED', 'DELIVERED', 'REJECTED')
    .required()
    .messages({
      'any.only': 'Status must be one of: RAW, SCORED, QUALIFIED, DELIVERED, REJECTED',
      'any.required': 'Status is required'
    })
});

// Bulk scoring validation schema
export const bulkScoringSchema = Joi.object({
  leadIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one lead must be selected',
      'any.required': 'Lead IDs are required'
    }),
  scoringModelId: Joi.string()
    .required()
    .messages({
      'any.required': 'Scoring model is required'
    })
});

// Bulk enrichment validation schema
export const bulkEnrichmentSchema = Joi.object({
  leadIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one lead must be selected',
      'any.required': 'Lead IDs are required'
    })
});

// Bulk delete validation schema
export const bulkDeleteSchema = Joi.object({
  leadIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one lead must be selected',
      'any.required': 'Lead IDs are required'
    })
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
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

// Specific validation middlewares
export const validateLead = validate(leadValidationSchema);
export const validateBulkStatusUpdate = validate(bulkStatusUpdateSchema);
export const validateBulkScoring = validate(bulkScoringSchema);
export const validateBulkEnrichment = validate(bulkEnrichmentSchema);
export const validateBulkDelete = validate(bulkDeleteSchema); 