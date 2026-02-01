import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate, asyncHandler } from './middleware.js';
import { ingestCustomerData } from '../services/ingest/index.js';
import logger from '../utils/logger.js';

const router = Router();

// Simple API key authentication middleware
function authenticateApiKey(req: Request, res: Response, next: () => void): void {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.INGEST_API_KEY || 'dev-api-key';

  if (apiKey !== validApiKey) {
    res.status(401).json({
      error: {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }

  next();
}

// Validation schema for ingest
const ingestSchema = {
  body: Joi.object({
    customerId: Joi.string().required().min(1).max(100),
    forceReindex: Joi.boolean().optional().default(false),
  }),
};

/**
 * POST /ingest
 * Ingest customer data into the search index
 */
router.post(
  '/ingest',
  authenticateApiKey,
  validate(ingestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, forceReindex } = req.body;

    logger.info('Received ingest request', { customerId, forceReindex });

    const result = await ingestCustomerData({ customerId, forceReindex });

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
