import { createClient } from "redis";

const redisClient = createClient({
	url: "redis://127.0.0.1:6379",
});

export async function connectToRedis() {
	if (!redisClient.isOpen) {
		await redisClient.connect();
	}

	return redisClient;
}

export default redisClient;