import { Router } from 'express';
import formQueryRouter from './formQuery.js';
import ingestRouter from './ingest.js';
import healthRouter from './health.js';

const router = Router();

// Mount routes
router.use('/api', formQueryRouter);
router.use('/api', ingestRouter);
router.use('/', healthRouter);

export default router;
