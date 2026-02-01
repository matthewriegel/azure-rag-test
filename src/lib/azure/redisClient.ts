import { createClient, RedisClientType } from 'redis';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const redisConfig: {
        socket: { host: string; port: number; tls?: boolean };
        password?: string;
      } = {
        socket: {
          host: config.azureRedis.host,
          port: config.azureRedis.port,
        },
      };

      // Azure Redis requires TLS on port 6380
      if (config.azureRedis.port === 6380) {
        redisConfig.socket.tls = true;
      }

      if (config.azureRedis.password) {
        redisConfig.password = config.azureRedis.password;
      }

      this.client = createClient(redisConfig);

      this.client.on('error', (err) => {
        logger.error('Redis client error', { error: err });
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Error connecting to Redis', { error });
      throw new Error('Failed to connect to Redis');
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      const value = await this.client!.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      logger.error('Error getting value from Redis', { error, key });
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      const ttlSeconds = ttl || config.azureRedis.cacheTtl;
      await this.client!.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Error setting value in Redis', { error, key });
      throw new Error('Failed to set cache value');
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      await this.client!.del(key);
    } catch (error) {
      logger.error('Error deleting key from Redis', { error, key });
      throw new Error('Failed to delete cache key');
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(keys);
        logger.info(`Deleted ${keys.length} keys matching pattern ${pattern}`);
      }
    } catch (error) {
      logger.error('Error deleting pattern from Redis', { error, pattern });
      throw new Error('Failed to delete cache pattern');
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking key existence in Redis', { error, key });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      return await this.client!.ttl(key);
    } catch (error) {
      logger.error('Error getting TTL from Redis', { error, key });
      return -1;
    }
  }
}

// Singleton instance
let redisService: RedisService | null = null;

export function getRedisClient(): RedisService {
  if (!redisService) {
    redisService = new RedisService();
  }
  return redisService;
}

export default getRedisClient;
