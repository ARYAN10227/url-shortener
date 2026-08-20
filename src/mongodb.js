import { MongoClient } from "mongodb";

let client;

export async function connectToMongoDb() {
	const uri = process.env.MONGODB_URI;

	if (!uri) {
		throw new Error("MONGODB_URI is not set.");
	}

	if (!client) {
		client = new MongoClient(uri);
	}

	await client.connect();

	console.log("Connected to MongoDB");

	return client;
}