# URL Shortener

## Production configuration

Configure the container with environment variables. Do not add a production
`.env` file to an image or source control; use your deployment platform's secret
manager instead. Copy `.env.production.example` only as a reference and replace
all placeholder values outside version control.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port for the application. Defaults to `3000`. |
| `MONGODB_URI` | Required MongoDB connection URI, such as a MongoDB Atlas URI. |
| `REDIS_URL` | Required Redis connection URI in production. |
| `JWT_SECRET` | Required secret used to sign authentication tokens. |

The production image has no database services inside it. Provide externally
reachable MongoDB and Redis URLs through the deployment environment.

## Health check

`GET /health` returns `200` with `{ "status": "ok" }` when the HTTP service is
running. It is suitable for a basic container or load-balancer health check.
