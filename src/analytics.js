async function getAnalyticsCollection(client) {
	return client.db().collection("urlAnalytics");
}

export async function recordClick(
	client,
	{ shortCode, ipAddress, userAgent },
) {
	const analytics = await getAnalyticsCollection(client);

	return analytics.insertOne({
		shortCode,
		clickedAt: new Date(),
		ipAddress,
		userAgent,
	});
}

export async function findClicksByShortCode(client, shortCode) {
	const analytics = await getAnalyticsCollection(client);

	return analytics
		.find({ shortCode })
		.sort({ clickedAt: -1 })
		.toArray();
}