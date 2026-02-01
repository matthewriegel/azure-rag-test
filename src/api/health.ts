import { Router, Request, Response } from 'express';
import { getRedisClient } from '../lib/azure/redisClient.js';
import { getSearchClient } from '../lib/azure/searchClient.js';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: 'unknown',
      search: 'unknown',
    },
  };

  // Check Redis connection
  getRedisClient()
    .connect()
    .then(async () => {
      const redisClient = getRedisClient();
      const testKey = '__health_check__';
      await redisClient.set(testKey, { check: true }, 10);
      await redisClient.delete(testKey);
      health.services.redis = 'ok';
    })
    .catch(() => {
      health.services.redis = 'error';
      health.status = 'degraded';
    });

  // Check Search service
  getSearchClient()
    .ensureIndex()
    .then(() => {
      health.services.search = 'ok';
    })
    .catch(() => {
      health.services.search = 'error';
      health.status = 'degraded';
    });

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
