import { createClient } from "redis";

const redisClient = createClient({
	url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
});

export async function connectToRedis() {
	if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
		throw new Error("REDIS_URL is not set.");
	}

	if (!redisClient.isOpen) {
		await redisClient.connect();
	}

	return redisClient;
}

export default redisClient;
