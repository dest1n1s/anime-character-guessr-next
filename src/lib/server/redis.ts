import { createClient, type RedisClientType } from 'redis';
import { dev } from '$app/environment';

// Cache expiration times (in seconds)
export const CACHE_TIMES = {
	CHARACTER: 60 * 60 * 24 * 7, // 7 days
	CHARACTER_APPEARANCES: 60 * 60 * 24 * 7, // 7 days
	SUBJECT_CHARACTERS: 60 * 60 * 24 * 7, // 7 days
	SUBJECT_DETAILS: 60 * 60 * 24 * 14, // 14 days
	SEARCH_RESULTS: 60 * 60 * 24 // 1 day
};

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: redisUrl }) as RedisClientType;

// Connection state tracking
let isConnected = false;

/**
 * Initialize Redis connection
 */
export async function initRedis() {
	if (isConnected) return;

	try {
		// Only connect in production or if explicitly asked to in dev
		if (!dev || process.env.USE_REDIS_IN_DEV === 'true') {
			redis.on('error', (err: Error) => console.error('Redis error:', err));
			await redis.connect();
			isConnected = true;
			console.log('Connected to Redis');
		}
	} catch (error) {
		console.error('Failed to connect to Redis:', error);
	}
}

/**
 * Get cached data from Redis
 * @param key Cache key
 * @returns Cached data or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
	if (!isConnected) return null;

	try {
		const data = await redis.get(key);
		return data ? (JSON.parse(data) as T) : null;
	} catch (error) {
		console.error(`Error getting cache for key ${key}:`, error);
		return null;
	}
}

/**
 * Set data in Redis cache with expiry
 * @param key Cache key
 * @param data Data to cache
 * @param expireSeconds TTL in seconds
 */
export async function setCache(key: string, data: any, expireSeconds: number): Promise<void> {
	if (!isConnected) return;

	try {
		await redis.set(key, JSON.stringify(data), { EX: expireSeconds });
	} catch (error) {
		console.error(`Error setting cache for key ${key}:`, error);
	}
}

/**
 * Delete cached data from Redis
 * @param key Cache key
 */
export async function deleteCache(key: string): Promise<void> {
	if (!isConnected) return;

	try {
		await redis.del(key);
	} catch (error) {
		console.error(`Error deleting cache for key ${key}:`, error);
	}
}

// Initialize Redis on module import
initRedis().catch(console.error);

// Handle graceful shutdown
if (typeof process !== 'undefined') {
	process.on('SIGTERM', async () => {
		if (isConnected) {
			await redis.quit();
			console.log('Redis connection closed');
		}
	});
}
