import { MongoClient } from "mongodb";

export async function connectToMongoDb() {
	const uri = process.env.MONGODB_URI;

	if (!uri) {
		throw new Error("MONGODB_URI is not set.");
	}

	const client = new MongoClient(uri);

	try {
		await client.connect();
		return client;
	} catch (error) {
		await client.close();
		throw error;
	}
}
