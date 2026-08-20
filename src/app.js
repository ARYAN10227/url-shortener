import "dotenv/config";
import express from "express";
import { connectToMongoDb } from "./mongodb.js";

const app = express();
const port = process.env.PORT ?? 3000;

app.get("/health", (request, response) => {
	response.json({ status: "ok" });
});

async function startServer() {
	try {
		await connectToMongoDb();

		app.listen(port, () => {
			console.log(`Server listening on port ${port}`);
		});
	} catch (error) {
		console.error("MongoDB connection failed:", error.message);
		process.exit(1);
	}
}

startServer();

