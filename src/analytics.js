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

export async function summarizeClicksByShortCode(client, shortCode) {
	const analytics = await getAnalyticsCollection(client);
	const [summary] = await analytics
		.aggregate([
			{ $match: { shortCode } },
			{
				$group: {
					_id: null,
					totalClicks: { $sum: 1 },
					lastClickedAt: { $max: "$clickedAt" },
					ipAddresses: { $addToSet: "$ipAddress" },
				},
			},
		])
		.toArray();

	if (!summary) {
		return {
			totalClicks: 0,
			lastClickedAt: null,
			uniqueIpAddresses: 0,
		};
	}

	return {
		totalClicks: summary.totalClicks,
		lastClickedAt: summary.lastClickedAt,
		uniqueIpAddresses: summary.ipAddresses.length,
	};
}