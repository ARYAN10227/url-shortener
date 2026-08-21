import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import { MongoClient } from "mongodb";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/url-shortener-test";
process.env.JWT_SECRET = "test-secret";

const { app } = await import("../src/app.js");
const { default: redisClient, connectToRedis } = await import("../src/redis.js");

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const server = createServer(app);
let baseUrl;
let user;

async function request(path, options = {}) {
	return fetch(`${baseUrl}${path}`, options);
}

async function createAuthenticatedUser() {
	const email = `test-${Date.now()}-${Math.random()}@example.com`;
	const password = "test-password";

	const registerResponse = await request("/api/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	assert.equal(registerResponse.status, 201);

	const loginResponse = await request("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	assert.equal(loginResponse.status, 200);

	const { token } = await loginResponse.json();
	return { email, token };
}

async function createUrl(token) {
	const response = await request("/api/urls", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ originalUrl: "https://example.com" }),
	});

	assert.equal(response.status, 201);
	return response.json();
}

before(async () => {
	await mongoClient.connect();
	await connectToRedis();
	server.listen(0);
	await new Promise((resolve) => server.once("listening", resolve));
	baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
	const database = mongoClient.db();
	await Promise.all([
		database.collection("users").deleteMany({}),
		database.collection("urls").deleteMany({}),
		database.collection("urlAnalytics").deleteMany({}),
		redisClient.flushAll(),
	]);
	user = await createAuthenticatedUser();
});

after(async () => {
	await server.close();
	await redisClient.quit();
	await mongoClient.db().dropDatabase();
	await mongoClient.close();
});

describe("URL shortener API", () => {
	test("GET /health returns a healthy status", async () => {
		const response = await request("/health");

		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), { status: "ok" });
	});

	test("registers, logs in, and protects /api/auth/me", async () => {
		assert.ok(user.token);

		const response = await request("/api/auth/me", {
			headers: { Authorization: `Bearer ${user.token}` },
		});

		assert.equal(response.status, 200);
		const body = await response.json();
		assert.match(body.userId, /^[a-f0-9]{24}$/);
	});

	test("creates and redirects to a short URL", async () => {
		const created = await createUrl(user.token);
		const response = await request(`/${created.shortCode}`, {
			redirect: "manual",
		});

		assert.equal(response.status, 302);
		assert.equal(response.headers.get("location"), "https://example.com");
	});

	test("lists the authenticated user's URLs", async () => {
		await createUrl(user.token);

		const response = await request("/api/urls", {
			headers: { Authorization: `Bearer ${user.token}` },
		});

		assert.equal(response.status, 200);
		const body = await response.json();
		assert.equal(body.total, 1);
		assert.equal(body.urls.length, 1);
	});

	test("updates a URL", async () => {
		await createUrl(user.token);
		const listResponse = await request("/api/urls", {
			headers: { Authorization: `Bearer ${user.token}` },
		});
		const [{ _id }] = (await listResponse.json()).urls;

		const response = await request(`/api/urls/${_id}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${user.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ originalUrl: "https://updated.example.com" }),
		});

		assert.equal(response.status, 200);
		assert.equal((await response.json()).url.originalUrl, "https://updated.example.com");
	});

	test("deletes a URL", async () => {
		await createUrl(user.token);
		const listResponse = await request("/api/urls", {
			headers: { Authorization: `Bearer ${user.token}` },
		});
		const [{ _id }] = (await listResponse.json()).urls;

		const response = await request(`/api/urls/${_id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${user.token}` },
		});

		assert.equal(response.status, 200);
		assert.equal((await response.json()).message, "URL deleted successfully.");
	});
});
