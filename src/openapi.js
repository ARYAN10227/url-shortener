const errorResponse = {
	description: "Error response",
	content: {
		"application/json": {
			schema: { $ref: "#/components/schemas/Error" },
		},
	},
};

export const openapiDocument = {
	openapi: "3.0.3",
	info: {
		title: "URL Shortener API",
		version: "1.0.0",
		description: "API documentation for the URL shortener.",
	},
	servers: [{ url: "http://localhost:3000" }],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
		schemas: {
			Error: {
				type: "object",
				properties: { error: { type: "string" } },
				required: ["error"],
			},
			RegisterRequest: {
				type: "object",
				properties: {
					email: { type: "string", format: "email" },
					password: { type: "string", format: "password" },
				},
				required: ["email", "password"],
			},
			LoginRequest: {
				type: "object",
				properties: {
					email: { type: "string", format: "email" },
					password: { type: "string", format: "password" },
				},
				required: ["email", "password"],
			},
			UrlRequest: {
				type: "object",
				properties: {
					originalUrl: { type: "string", format: "uri" },
					customAlias: { type: "string" },
					expiresAt: { type: "string", format: "date-time" },
				},
				required: ["originalUrl"],
			},
			Url: {
				type: "object",
				properties: {
					_id: { type: "string" },
					userId: { type: "string" },
					shortCode: { type: "string" },
					originalUrl: { type: "string", format: "uri" },
					enabled: { type: "boolean" },
					expiresAt: { type: "string", format: "date-time", nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
			},
			StatusRequest: {
				type: "object",
				properties: { enabled: { type: "boolean" } },
				required: ["enabled"],
			},
			AnalyticsClick: {
				type: "object",
				properties: {
					shortCode: { type: "string" },
					clickedAt: { type: "string", format: "date-time" },
					ipAddress: { type: "string" },
					userAgent: { type: "string" },
				},
			},
		},
	},
	paths: {
		"/health": {
			get: {
				summary: "Health check",
				responses: { "200": { description: "Service is healthy" } },
			},
		},
		"/api/auth/register": {
			post: {
				summary: "Register a user",
				requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
				responses: { "201": { description: "User registered" }, "400": errorResponse, "409": errorResponse, "500": errorResponse },
			},
		},
		"/api/auth/login": {
			post: {
				summary: "Log in and receive a JWT",
				requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
				responses: { "200": { description: "JWT returned" }, "400": errorResponse, "401": errorResponse, "500": errorResponse },
			},
		},
		"/api/auth/me": {
			get: {
				summary: "Get the authenticated user ID",
				security: [{ bearerAuth: [] }],
				responses: { "200": { description: "Authenticated user" }, "401": errorResponse, "500": errorResponse },
			},
		},
		"/api/urls": {
			post: {
				summary: "Create a short URL",
				security: [{ bearerAuth: [] }],
				requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UrlRequest" } } } },
				responses: { "201": { description: "URL created" }, "400": errorResponse, "401": errorResponse, "409": errorResponse, "500": errorResponse },
			},
			get: {
				summary: "List the user's URLs",
				security: [{ bearerAuth: [] }],
				parameters: [
					{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
					{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
				],
				responses: { "200": { description: "Paginated URLs" }, "400": errorResponse, "401": errorResponse, "500": errorResponse },
			},
		},
		"/api/urls/{id}": {
			parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
			patch: {
				summary: "Update a URL",
				security: [{ bearerAuth: [] }],
				requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { originalUrl: { type: "string", format: "uri" } }, required: ["originalUrl"] } } } },
				responses: { "200": { description: "URL updated" }, "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse, "500": errorResponse },
			},
			delete: {
				summary: "Delete a URL",
				security: [{ bearerAuth: [] }],
				responses: { "200": { description: "URL deleted" }, "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse, "500": errorResponse },
			},
		},
		"/api/urls/{id}/status": {
			parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
			patch: {
				summary: "Enable or disable a URL",
				security: [{ bearerAuth: [] }],
				requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StatusRequest" } } } },
				responses: { "200": { description: "Status updated" }, "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse, "500": errorResponse },
			},
		},
		"/api/urls/{id}/analytics": {
			parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
			get: {
				summary: "Get click events",
				security: [{ bearerAuth: [] }],
				responses: { "200": { description: "Click events" }, "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse, "500": errorResponse },
			},
		},
		"/api/urls/{id}/analytics/summary": {
			parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
			get: {
				summary: "Get click summary",
				security: [{ bearerAuth: [] }],
				responses: { "200": { description: "Click summary" }, "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse, "500": errorResponse },
			},
		},
		"/{shortCode}": {
			parameters: [{ name: "shortCode", in: "path", required: true, schema: { type: "string" } }],
			get: {
				summary: "Redirect to the original URL",
				responses: { "302": { description: "Redirect response" }, "404": errorResponse, "500": errorResponse },
			},
		},
	},
};
