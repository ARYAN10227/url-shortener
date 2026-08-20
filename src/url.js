import crypto from "node:crypto";

const SHORT_CODE_LENGTH = 8;

export async function getUrlsCollection(client) {
	const database = client.db();
	const urls = database.collection("urls");

	await urls.createIndex({ shortCode: 1 }, { unique: true });

	return urls;
}

export function generateShortCode() {
	return crypto.randomBytes(6).toString("base64url").slice(0, SHORT_CODE_LENGTH);
}

export function isValidHttpUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch (error) {
		return false;
	}
}

export async function createUrl(client, { userId, originalUrl, shortCode }) {
	const urls = await getUrlsCollection(client);
	const now = new Date();

	return urls.insertOne({
		userId,
		shortCode,
		originalUrl,
		createdAt: now,
		updatedAt: now,
	});
}