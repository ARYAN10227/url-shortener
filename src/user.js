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