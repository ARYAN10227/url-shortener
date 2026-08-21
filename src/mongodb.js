import { MongoClient } from "mongodb";

const MAX_CONNECTION_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

function waitForRetry() {
	return new Promise((resolve) => {
		setTimeout(resolve, RETRY_DELAY_MS);
	});
}

export async function connectToMongoDb() {
	const uri = process.env.MONGODB_URI;

	if (!uri) {
		throw new Error("MONGODB_URI is not set.");
	}

	for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
		const client = new MongoClient(uri, {
			authSource: "admin",
			replicaSet: "atlas-zfqsjc-shard-0",
			tls: true,
		});

		try {
			await client.connect();
			return client;
		} catch (error) {
			await client.close().catch(() => {});

			if (attempt === MAX_CONNECTION_ATTEMPTS) {
				throw new Error(
					`MongoDB connection failed after ${MAX_CONNECTION_ATTEMPTS} attempts.`,
					{ cause: error },
				);
			}

			console.error(
				`MongoDB connection attempt ${attempt} failed. Retrying in ${RETRY_DELAY_MS / 1000} seconds...`,
			);
			await waitForRetry();
		}
	}
}