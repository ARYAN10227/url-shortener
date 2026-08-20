import crypto from "node:crypto";

const PASSWORD_HASH_KEY_LENGTH = 64;

export function normalizeEmail(email) {
	return email.trim().toLowerCase();
}

export function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString("hex");
	const hash = crypto
		.scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH)
		.toString("hex");

	return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPasswordHash) {
	const [salt, expectedHash] = storedPasswordHash.split(":");

	if (!salt || !expectedHash) {
		return false;
	}

	const actualHash = crypto
		.scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH)
		.toString("hex");

	if (actualHash.length !== expectedHash.length) {
		return false;
	}

	return crypto.timingSafeEqual(
		Buffer.from(actualHash, "hex"),
		Buffer.from(expectedHash, "hex"),
	);
}

export async function getUsersCollection(client) {
	const database = client.db();
	const users = database.collection("users");

	await users.createIndex({ email: 1 }, { unique: true });

	return users;
}

export async function createUser(client, { email, passwordHash }) {
	const users = await getUsersCollection(client);
	const now = new Date();

	return users.insertOne({
		email,
		passwordHash,
		createdAt: now,
		updatedAt: now,
	});
}

export async function findUserByEmail(client, email) {
	const users = await getUsersCollection(client);

	return users.findOne({ email });
}