import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

export const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: { reconnectStrategy: false }
});

redis.on("error", (error) => console.error("Redis error:", error.message));

export const connectRedis = async () => {
    if (!redis.isOpen) await redis.connect();
};

export const getCachedSubmission = async (idempotencyKey) => {
    try {
        const value = await redis.get(`submission:${idempotencyKey}`);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
};

export const cacheSubmission = async (submission) => {
    try {
        await redis.set(
            `submission:${submission.idempotency_key}`,
            JSON.stringify(submission),
            { EX: Number(process.env.IDEMPOTENCY_CACHE_TTL_SECONDS || 86400) }
        );
    } catch {
        // PostgreSQL's unique constraint remains the source of truth.
    }
};
