import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate, asyncHandler } from './middleware.js';
import { processFormQuery } from '../services/formQueryService.js';
import { redactPII } from '../utils/helpers.js';
import { featureFlags } from '../config/features.js';
import logger from '../utils/logger.js';

const router = Router();

// Validation schema for form query
const formQuerySchema = {
  body: Joi.object({
    formQuestion: Joi.string().required().min(1).max(1000),
    customerId: Joi.string().optional().min(1).max(100),
  }),
};

/**
 * POST /form-query
 * Process a form question and return answer with confidence
 */
router.post(
  '/form-query',
  validate(formQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { formQuestion, customerId } = req.body;

    // Apply PII redaction if enabled
    const sanitizedQuestion = featureFlags.piiRedaction ? redactPII(formQuestion) : formQuestion;

    logger.info('Received form query', { customerId, questionLength: sanitizedQuestion.length });

    const result = await processFormQuery({
      formQuestion: sanitizedQuestion,
      customerId,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
