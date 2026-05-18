---
name: url-shortener-audit
description: Use when testing or reviewing this URL shortener project against url-shortener-plan.md, including backend API behavior, MongoDB/Docker setup, static frontend pages, admin auth, and security checklist compliance.
---

# URL Shortener Audit

Use this skill to test or review a URL shortener implementation against the project plan in `url-shortener-plan.md`.

The goal is to verify conformance, identify gaps, and provide actionable fixes. Do not assume the implementation is correct because files exist.

## Expected Project

The project is a Node.js URL shortener with:

- Express backend in `backend/`
- MongoDB via Mongoose
- Root-level `docker-compose.yml` for MongoDB only
- Static frontend pages in `public-page/index.html` and `admin-dashboard/index.html`
- Admin routes protected by a static API key middleware
- URL shortening using `nanoid`
- Environment configuration through `dotenv`

## Audit Workflow

1. Inspect the repository structure first.
2. Read the key implementation files before making claims.
3. Compare behavior against the checklist below.
4. Run available tests or smoke checks when feasible.
5. Report findings by severity with file references and exact remediation steps.

If the user asks you to fix issues, make the smallest correct code changes and re-run the relevant checks.

## Required Structure

Verify these files and folders exist in the expected locations:

- `docker-compose.yml` at the repository root
- root `.gitignore`
- `README.md`
- `backend/package.json`
- `backend/.env.example`
- `backend/server.js`
- `backend/middleware/adminAuth.js`
- `backend/models/Url.js`
- `backend/routes/public.js`
- `backend/routes/admin.js`
- `backend/controllers/publicController.js`
- `backend/controllers/adminController.js`
- `public-page/index.html`
- `admin-dashboard/index.html`

The backend should be independently runnable from `backend/`. The two frontend folders should be standalone static HTML pages and should not require a frontend framework.

## Backend Requirements

### Package Setup

Check `backend/package.json` for:

- Runtime dependencies: `express`, `mongoose`, `nanoid`, `dotenv`, `cors`
- Development dependency: `nodemon`
- Scripts: `start` runs `node server.js`, `dev` runs `nodemon server.js`

### Environment

Check `backend/.env.example` includes:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/urlshortener
BASE_URL=http://localhost:3000
ADMIN_API_KEY=your-secret-admin-key-change-this
```

Check root `.gitignore` excludes:

```gitignore
node_modules/
.env
```

Do not require the real `backend/.env` to be committed.

### MongoDB Docker

Check root `docker-compose.yml` defines only MongoDB:

- Image `mongo:7`
- Container name `urlshortener-mongo`
- Port mapping `27017:27017`
- Persistent named volume mounted to `/data/db`

### Mongoose Model

Check `backend/models/Url.js` defines a URL model with:

- `originalUrl`: String, required
- `shortCode`: String, required, unique, indexed
- `customSlug`: Boolean, default `false`
- `clicks`: Number, default `0`
- `lastAccessed`: Date, null/default unset until visited
- `createdAt`: Date via timestamps or manual default

The `shortCode` field must have both uniqueness and an index for fast lookup.

### Admin Auth Middleware

Check `backend/middleware/adminAuth.js`:

- Reads `x-admin-key` from request headers
- Compares it to `process.env.ADMIN_API_KEY`
- Calls `next()` only on match
- Returns `401` JSON error when missing or invalid
- Does not hardcode the real key

### Public Controller

Check `backend/controllers/publicController.js` implements:

- `createShortUrl(req, res)`
- `createCustomShortUrl(req, res)`
- `redirectToUrl(req, res)`

Required behavior:

- Validate URLs with the built-in `URL` constructor in a try/catch.
- Allow only `http:` and `https:` protocols.
- Reject invalid or unsafe URLs with `400`.
- Generate random short codes with `nanoid(7)`.
- Check for random-code collisions and retry until unique.
- Return `201` with `{ shortUrl, shortCode }` after creation.
- Validate custom slugs with `/^[a-zA-Z0-9-]+$/` and length 3 to 30.
- Reject reserved custom slugs: `admin`, `shorten`, `api`.
- Return `409` when a custom slug is already taken.
- Redirect existing short URLs with `302`.
- Increment `clicks` and update `lastAccessed` on redirect.
- Return a simple `404` HTML response when a short code is not found.

### Admin Controller

Check `backend/controllers/adminController.js` implements:

- `getAllUrls(req, res)`
- `getUrlStats(req, res)`
- `deleteUrl(req, res)`
- `updateUrl(req, res)`
- `getGlobalStats(req, res)`

Required behavior:

- `GET /admin/urls` returns all URL documents.
- Supports `?sort=clicks` and `?sort=createdAt`, defaulting to `createdAt` descending.
- `GET /admin/urls/:code/stats` returns one full URL document or `404`.
- `DELETE /admin/urls/:code` deletes by `shortCode`, returns `404` when missing, otherwise `{ message: "Deleted successfully" }`.
- `PATCH /admin/urls/:code` validates a new `originalUrl`, updates it, and returns the updated document or `404`.
- `GET /admin/stats` returns `totalUrls`, `totalClicks`, `topUrls`, and `recentUrls`.

### Routes And Server

Check public routes:

- `POST /shorten` -> `createShortUrl`
- `POST /shorten/custom` -> `createCustomShortUrl`
- `GET /:code` -> `redirectToUrl`

Check admin routes:

- `router.use(adminAuth)` protects every admin route
- `GET /admin/urls`
- `GET /admin/urls/:code/stats`
- `DELETE /admin/urls/:code`
- `PATCH /admin/urls/:code`
- `GET /admin/stats`

Check `backend/server.js`:

- Loads `dotenv`
- Connects to MongoDB with `process.env.MONGO_URI`
- Uses `express.json()`
- Uses `cors()`
- Mounts admin routes before public routes
- Does not serve frontend folders with `express.static`
- Has a final global error handler returning `500 { error: "Internal Server Error" }`
- Starts listening on `process.env.PORT`

## Frontend Requirements

### Public Page

Check `public-page/index.html`:

- Plain HTML, CSS, and vanilla JavaScript only
- Dark, minimal, centered-card UI
- Defines `const API_BASE = "http://localhost:3000"` near the top of the script
- Uses `API_BASE` for fetch calls
- Has title text `Paste your URL here`
- Has a full-width URL input with placeholder `https://your-long-url.com/...`
- Has a `Shorten` button
- Shows generated short URL as a clickable link
- Has a `Copy` button using `navigator.clipboard.writeText()` and changes label to `Copied!`
- Shows inline errors
- Supports button click and Enter key submission
- Performs client validation for `http://` or `https://`
- Posts JSON to `${API_BASE}/shorten`

### Admin Dashboard

Check `admin-dashboard/index.html`:

- Plain HTML, CSS, and vanilla JavaScript only
- Dark utilitarian dashboard with table layout
- Defines `const API_BASE = "http://localhost:3000"` near the top of the script
- Uses `API_BASE` for all fetch calls
- Sends `x-admin-key` on all admin API calls
- Stores the admin key in `localStorage` under `adminKey`
- Shows an unlock overlay when no key is stored
- Clears `localStorage` and re-prompts on any `401`
- Fetches global stats from `/admin/stats`
- Shows total URLs, total clicks, and most-clicked URL
- Fetches all URLs from `/admin/urls`
- Shows table columns for short code, original URL, clicks, created at, last accessed, and actions
- Truncates original URL display to about 50 characters and keeps full URL in a `title` attribute
- Supports delete with the exact confirmation message `Delete this short URL? This cannot be undone.`
- Removes deleted rows without a full page reload
- Supports inline edit and save through `PATCH /admin/urls/:code`
- Opens a stats modal from short-code clicks and fetches `/admin/urls/:code/stats`
- Has loading, top-banner errors, Refresh, and Logout behavior

## Security Checklist

Verify all of these before calling the project complete:

- `ADMIN_API_KEY` is read from environment only, never hardcoded.
- `.env` is ignored by Git.
- Every `/admin/*` route is protected by `adminAuth`.
- Both short URL creation paths reject non-http/https protocols.
- Custom slugs allow only alphanumeric characters and hyphens.
- Reserved slugs `admin`, `shorten`, and `api` are blocked.
- `shortCode` has `unique: true` and `index: true`.
- `nanoid` collisions are handled with a retry loop.
- Global error handler does not leak stack traces to clients.
- `cors` is enabled in the backend.
- `API_BASE` is centralized at the top of both HTML files.
- Admin key storage in `localStorage` is called out as acceptable only for a personal tool, not production multi-user auth.

## Smoke Test Commands

When Docker, Node, and the backend environment are available, use these checks.

Start MongoDB from the repository root:

```bash
docker compose up -d
```

Start the backend from `backend/`:

```bash
npm install
npm run dev
```

Manual API checks:

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://www.example.com/some/very/long/path"}'

curl -L http://localhost:3000/<returned-code>

curl -X POST http://localhost:3000/shorten/custom \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://example.com","customSlug":"my-link"}'

curl http://localhost:3000/admin/urls \
  -H "x-admin-key: your-secret-admin-key-change-this"

curl http://localhost:3000/admin/stats \
  -H "x-admin-key: your-secret-admin-key-change-this"

curl -X DELETE http://localhost:3000/admin/urls/<code> \
  -H "x-admin-key: your-secret-admin-key-change-this"

curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"not-a-url"}'

curl -X POST http://localhost:3000/shorten/custom \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://example.com","customSlug":"admin"}'

curl http://localhost:3000/admin/urls
```

Expected results:

- Creating a normal short URL returns `201` and a JSON body with `shortUrl` and `shortCode`.
- Visiting a returned short URL redirects to the original URL.
- Creating a custom slug returns `201`.
- Admin endpoints work with the correct `x-admin-key`.
- Deleting an existing short URL returns success.
- Invalid URL returns `400`.
- Reserved slug returns `400`.
- Admin endpoint without key returns `401`.

## Report Format

When reviewing, respond with:

1. Overall status: `Pass`, `Partial`, or `Fail`.
2. Findings ordered by severity, each with file path and line reference when possible.
3. Smoke tests run and their results.
4. Remaining manual checks, if any.
5. Minimal next steps to reach compliance.

Do not bury critical issues in a summary. Put findings first.
