# IDX Exchange — Property Search Platform

A full-stack property search application with map bounds, filters, paginated listings, property comparisons, saved searches, and a MySQL-backed REST API.

**Stack:** JavaScript, React, Leaflet, Node.js, Express, MySQL.

[Interactive walkthrough](https://jiang6082.github.io/projects/idx-exchange/) · [Portfolio](https://jiang6082.github.io/)

The walkthrough includes a small filtering demo with **eight fictional listings**. It explains the interface and request flow; it is not a deployment of this application's database or backend.

## Start with the request path

```text
React search and map controls
  -> /api/properties query parameters
  -> validation and allowed sort fields
  -> short-lived cache
  -> parameterized MySQL queries
  -> property summaries, total count, and pagination
```

| Engineering decision | Where to inspect it |
| --- | --- |
| Validate price ranges, geographic bounds, text length, limits, and sorting before querying | [Property routes](backend/src/routes/properties.js) |
| Bind filter values as SQL parameters; choose sorting from an allowlist | [Query construction](backend/src/routes/properties.js) |
| Reuse a connection pool and create indexes for common listing filters | [Connection pool](backend/src/db/mysql.js), [database bootstrap](backend/src/db/bootstrap.js) |
| Cache repeated searches for a short period, with an in-memory fallback | [Cache implementation](backend/src/utils/cache.js) |
| Separate application creation from server startup so routes can be tested | [Application](backend/src/app.js), [backend tests](backend/test/app.test.js) |

## Run the backend checks without a listing database

Install Node.js and npm, then run from the repository root:

```sh
cd backend
npm ci
npm test
```

The tests exercise validation, unauthenticated access, registration edge cases, and a stubbed database health check. They do not establish successful queries against a real listing database or production readiness.

## Run the application with an existing listing database

**Current setup gap:** a fresh clone is not enough to start the complete application. The backend expects an existing `rets_property` table and listing data. This repository includes `rets_openhouse.sql`, but does not include the main property-table schema, a synthetic listing seed, or Docker Compose configuration. Startup creates the application tables and then indexes `rets_property`; it fails if that prerequisite is missing.

With a compatible MySQL database already available:

1. Copy [backend/.env.example](backend/.env.example) to `backend/.env` and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` for your local database. Keep credentials out of version control.
2. From `backend`, run `npm ci` and `npm start`. The default API port is `5050`.
3. In a second terminal, run:

```sh
cd frontend
npm ci
npm start
```

The frontend development server proxies API requests to `http://localhost:5050`. Check database connectivity at `http://localhost:5050/api/health`.

The environment example also contains optional AI and integration settings. Those settings are not prerequisites for inspecting the property-search code or running the backend tests.

## Frontend checks

```sh
cd frontend
npm test -- --watchAll=false --runInBand
npm run build
```

The frontend suite includes request construction and pagination checks. On September 13, 2026, a clean local installation passed all 11 backend tests and all 12 frontend tests. This did not exercise a live listing database or a deployed application. The frontend production build was not rerun in that documentation review.

## Known limits and next steps

- Add a complete schema and synthetic seed so someone can reproduce the application from a fresh clone without private listing data.
- The default cache is process-local. Redis support is optional, and the Redis client is not in the backend's default dependencies.
- Cache keys use `JSON.stringify(query)`, so equivalent requests with different parameter ordering can miss the cache. Canonicalizing validated parameters is a proposed improvement, not an implemented fix.
- The repository has no active GitHub Actions workflow. Backend route tests alone do not cover browser-to-database integration, load, or deployment behavior.
- Add a recording of the actual application covering filter changes, map bounds, comparison, and an empty result. Keep the existing fictional walkthrough labeled separately.

## Repository map

- `frontend/src/`: React pages, components, map UI, and API client.
- `backend/src/routes/`: property search, account, workspace, and integration endpoints.
- `backend/src/db/`: connection pool and application-table bootstrap.
- `backend/test/`: backend request tests.
- `rets_openhouse.sql`: open-house table dump; not the complete application database.
