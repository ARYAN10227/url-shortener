import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import { connectToMongoDb } from "./mongodb.js";
import {
	createUser,
	findUserByEmail,
	hashPassword,
	normalizeEmail,
	verifyPassword,
} from "./user.js";
import {
	createUrl,
	deleteUrl,
	findUrlById,
	generateShortCode,
	findUrlByShortCode,
	findUrlsByUserId,
	isValidHttpUrl,
	isValidCustomAlias,
	updateUrl,
	updateUrlStatus,
} from "./url.js";

const app = express();
const port = process.env.PORT ?? 3000;
let mongoClient;

app.use(express.json());

function authenticateRequest(request, response, next) {
	const authorizationHeader = request.headers.authorization;

	if (!authorizationHeader) {
		return response.status(401).json({
			error: "Authorization token is required.",
		});
	}

	const [scheme, token] = authorizationHeader.split(" ");

	if (scheme !== "Bearer" || !token) {
		return response.status(401).json({
			error: "Authorization token is required.",
		});
	}

	const jwtSecret = process.env.JWT_SECRET;

	if (!jwtSecret) {
		return response.status(500).json({
			error: "JWT_SECRET is not set.",
		});
	}

	try {
		const payload = jwt.verify(token, jwtSecret);
		request.userId = payload.userId;
		return next();
	} catch (error) {
		return response.status(401).json({
			error: "Invalid or expired token.",
		});
	}
}

app.get("/health", (request, response) => {
	response.json({ status: "ok" });
});

app.post("/api/auth/register", async (request, response) => {
	const { email, password } = request.body ?? {};

	if (!email || !password) {
		return response.status(400).json({
			error: "Email and password are required.",
		});
	}

	const normalizedEmail = normalizeEmail(String(email));
	const passwordHash = hashPassword(String(password));

	try {
		const client = mongoClient ?? (await connectToMongoDb());
		await createUser(client, {
			email: normalizedEmail,
			passwordHash,
		});

		return response.status(201).json({
			message: "User registered successfully.",
			email: normalizedEmail,
		});
	} catch (error) {
		if (error?.code === 11000) {
			return response.status(409).json({
				error: "Email is already registered.",
			});
		}

		console.error("Registration failed:", error.message);
		return response.status(500).json({
			error: "Registration failed.",
		});
	}
});

app.post("/api/auth/login", async (request, response) => {
	const { email, password } = request.body ?? {};

	if (!email || !password) {
		return response.status(400).json({
			error: "Email and password are required.",
		});
	}

	const normalizedEmail = normalizeEmail(String(email));

	try {
		const client = mongoClient ?? (await connectToMongoDb());
		const user = await findUserByEmail(client, normalizedEmail);

		if (!user || !verifyPassword(String(password), user.passwordHash)) {
			return response.status(401).json({
				error: "Invalid credentials.",
			});
		}

		const jwtSecret = process.env.JWT_SECRET;

		if (!jwtSecret) {
			return response.status(500).json({
				error: "JWT_SECRET is not set.",
			});
		}

		const token = jwt.sign({ userId: user._id.toString() }, jwtSecret, {
			expiresIn: "1h",
		});

		return response.status(200).json({
			token,
		});
	} catch (error) {
		console.error("Login failed:", error.message);
		return response.status(500).json({
			error: "Login failed.",
		});
	}
});

app.get("/api/auth/me", authenticateRequest, (request, response) => {
	return response.status(200).json({
		userId: request.userId,
	});
});

app.get("/api/urls", authenticateRequest, async (request, response) => {
	const page = request.query.page === undefined ? 1 : Number(request.query.page);
	const limit = request.query.limit === undefined ? 10 : Number(request.query.limit);

	if (!Number.isInteger(page) || page < 1) {
		return response.status(400).json({
			error: "page must be a positive integer.",
		});
	}

	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		return response.status(400).json({
			error: "limit must be a positive integer no greater than 100.",
		});
	}

	const client = mongoClient ?? (await connectToMongoDb());
	const { total, urls } = await findUrlsByUserId(client, request.userId, {
		skip: (page - 1) * limit,
		limit,
	});

	return response.status(200).json({
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
		urls,
	});
});

app.patch("/api/urls/:id", authenticateRequest, async (request, response) => {
	const { originalUrl } = request.body ?? {};

	if (!originalUrl || !isValidHttpUrl(String(originalUrl))) {
		return response.status(400).json({
			error: "originalUrl must be a valid http or https URL.",
		});
	}

	const client = mongoClient ?? (await connectToMongoDb());
	const url = await findUrlById(client, request.params.id);

	if (!url) {
		return response.status(404).json({
			error: "URL not found.",
		});
	}

	if (url.userId !== request.userId) {
		return response.status(403).json({
			error: "You do not own this URL.",
		});
	}

	const updatedUrl = await updateUrl(
		client,
		request.params.id,
		String(originalUrl),
	);

	return response.status(200).json({
		url: updatedUrl,
	});
});

app.delete("/api/urls/:id", authenticateRequest, async (request, response) => {
	const client = mongoClient ?? (await connectToMongoDb());
	const url = await findUrlById(client, request.params.id);

	if (!url) {
		return response.status(404).json({
			error: "URL not found.",
		});
	}

	if (url.userId !== request.userId) {
		return response.status(403).json({
			error: "You do not own this URL.",
		});
	}

	await deleteUrl(client, request.params.id);

	return response.status(200).json({
		message: "URL deleted successfully.",
	});
});

app.patch(
	"/api/urls/:id/status",
	authenticateRequest,
	async (request, response) => {
		const { enabled } = request.body ?? {};

		if (typeof enabled !== "boolean") {
			return response.status(400).json({
				error: "enabled must be a boolean.",
			});
		}

		const client = mongoClient ?? (await connectToMongoDb());
		const url = await findUrlById(client, request.params.id);

		if (!url) {
			return response.status(404).json({
				error: "URL not found.",
			});
		}

		if (url.userId !== request.userId) {
			return response.status(403).json({
				error: "You do not own this URL.",
			});
		}

		const updatedUrl = await updateUrlStatus(
			client,
			request.params.id,
			enabled,
		);

		return response.status(200).json({
			url: updatedUrl,
		});
	},
);

app.get("/:shortCode", async (request, response) => {
	const { shortCode } = request.params;

	if (!shortCode) {
		return response.status(404).json({
			error: "Short URL not found.",
		});
	}

	const client = mongoClient ?? (await connectToMongoDb());
	const url = await findUrlByShortCode(client, shortCode);

	if (!url) {
		return response.status(404).json({
			error: "Short URL not found.",
		});
	}

	if (url.enabled === false || (url.expiresAt && url.expiresAt <= new Date())) {
		return response.status(404).json({
			error: "Short URL not found.",
		});
	}

	return response.redirect(302, url.originalUrl);
});

app.post("/api/urls", authenticateRequest, async (request, response) => {
	const { originalUrl, customAlias, expiresAt } = request.body ?? {};

	if (!originalUrl || !isValidHttpUrl(String(originalUrl))) {
		return response.status(400).json({
			error: "originalUrl must be a valid http or https URL.",
		});
	}

	if (customAlias !== undefined) {
		if (!customAlias || !isValidCustomAlias(String(customAlias))) {
			return response.status(400).json({
				error: "customAlias must contain only letters, numbers, underscores, or hyphens.",
			});
		}
	}

	let expirationDate;
	if (expiresAt !== undefined) {
		expirationDate = new Date(expiresAt);

		if (Number.isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
			return response.status(400).json({
				error: "expiresAt must be a valid future date.",
			});
		}
	}

	const client = mongoClient ?? (await connectToMongoDb());
	const baseUrl = `${request.protocol}://${request.get("host")}`;
	const shortCode = customAlias ? String(customAlias) : null;
	const attempts = shortCode ? 1 : 5;

	for (let attempt = 0; attempt < attempts; attempt += 1) {
		const codeToUse = shortCode ?? generateShortCode();

		try {
			await createUrl(client, {
				userId: request.userId,
				originalUrl: String(originalUrl),
				shortCode: codeToUse,
				expiresAt: expirationDate,
			});

			return response.status(201).json({
				shortCode: codeToUse,
				shortUrl: `${baseUrl}/${codeToUse}`,
			});
		} catch (error) {
			if (error?.code !== 11000) {
				console.error("URL creation failed:", error.message);
				return response.status(500).json({
					error: "URL creation failed.",
				});
			}

			if (shortCode) {
				return response.status(409).json({
					error: "customAlias is already in use.",
				});
			}
		}
	}

	return response.status(500).json({
		error: "Could not generate a unique short code.",
	});
});

async function startServer() {
	try {
		mongoClient = await connectToMongoDb();

		app.listen(port, () => {
			console.log(`Server listening on port ${port}`);
		});
	} catch (error) {
		console.error("MongoDB connection failed:", error.message);
		process.exit(1);
	}
}

startServer();

