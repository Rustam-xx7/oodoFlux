import IORedis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnectionOptions = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export function createRedisConnection(): IORedis {
  return new IORedis(redisConnectionOptions);
}
