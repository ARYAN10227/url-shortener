import crypto from "node:crypto";
import { ObjectId } from "mongodb";

const SHORT_CODE_LENGTH = 8;
const CUSTOM_ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;

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

export function isValidCustomAlias(value) {
	return CUSTOM_ALIAS_PATTERN.test(value);
}

export async function createUrl(
	client,
	{ userId, originalUrl, shortCode, expiresAt },
) {
	const urls = await getUrlsCollection(client);
	const now = new Date();

	return urls.insertOne({
		userId,
		shortCode,
		originalUrl,
		enabled: true,
		expiresAt,
		createdAt: now,
		updatedAt: now,
	});
}

export async function findUrlByShortCode(client, shortCode) {
	const urls = await getUrlsCollection(client);

	return urls.findOne({ shortCode });
}

export async function findUrlsByUserId(client, userId) {
	const urls = await getUrlsCollection(client);

	return urls
		.find({ userId })
		.sort({ createdAt: -1 })
		.toArray();
}

export async function findUrlById(client, id) {
	if (!ObjectId.isValid(id)) {
		return null;
	}

	const urls = await getUrlsCollection(client);
	return urls.findOne({ _id: new ObjectId(id) });
}

export async function updateUrl(client, id, originalUrl) {
	const urls = await getUrlsCollection(client);

	return urls.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set: { originalUrl, updatedAt: new Date() } },
		{ returnDocument: "after" },
	);
}

export async function deleteUrl(client, id) {
	const urls = await getUrlsCollection(client);

	return urls.deleteOne({ _id: new ObjectId(id) });
}

export async function updateUrlStatus(client, id, enabled) {
	const urls = await getUrlsCollection(client);

	return urls.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set: { enabled, updatedAt: new Date() } },
		{ returnDocument: "after" },
	);
}