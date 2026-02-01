import { app, errorHandler } from './api/app.js';
import routes from './api/routes.js';
import config from './config/env.js';
import logger from './utils/logger.js';
import { getRedisClient } from './lib/azure/redisClient.js';

// Mount routes
app.use(routes);

// Error handler must be last
app.use(errorHandler);

// Graceful shutdown
let server: ReturnType<typeof app.listen> | null = null;

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close Redis connection
      try {
        const redisClient = getRedisClient();
        await redisClient.disconnect();
      } catch (error) {
        logger.error('Error disconnecting Redis', { error });
      }

      // Clean up tokenizer
      try {
        const { cleanup } = await import('./utils/tokenizer.js');
        cleanup();
      } catch (error) {
        logger.error('Error cleaning up tokenizer', { error });
      }

      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    // Server was never started, exit immediately
    logger.info('No server to close, exiting');
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Start server
async function start(): Promise<void> {
  try {
    // Initialize Redis connection
    const redisClient = getRedisClient();
    await redisClient.connect();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Server started on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
void start();

export { app };
