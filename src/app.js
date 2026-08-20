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

const app = express();
const port = process.env.PORT ?? 3000;
let mongoClient;

app.use(express.json());

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

