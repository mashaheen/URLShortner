# URL Shortener Service — Implementation Plan

> This document is a step-by-step implementation plan for a coding agent.
> Follow each phase in order. Do not skip steps.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Local DB**: MongoDB in Docker
- **Frontend**: Plain HTML + CSS + Vanilla JS (no framework)
- **Short code generation**: `nanoid`
- **Environment config**: `dotenv`
- **Admin protection**: Static API key via middleware

---

## Project Structure

```
url-shortener/
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── package.json
├── server.js
├── middleware/
│   └── adminAuth.js
├── models/
│   └── Url.js
├── routes/
│   ├── public.js
│   └── admin.js
├── controllers/
│   ├── publicController.js
│   └── adminController.js
└── public/
    ├── index.html          ← URL submission page
    └── admin/
        └── index.html      ← Admin dashboard
```

---

## Phase 1 — Project Bootstrap

### Step 1.1 — Initialize the project

```bash
mkdir url-shortener && cd url-shortener
npm init -y
npm install express mongoose nanoid dotenv
npm install --save-dev nodemon
```

### Step 1.2 — Add `.gitignore`

Create `.gitignore` with the following:
```
node_modules/
.env
```

### Step 1.3 — Create `.env` and `.env.example`

**`.env`** (never commit this):
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/urlshortener
BASE_URL=http://localhost:3000
ADMIN_API_KEY=your-secret-admin-key-change-this
```

**`.env.example`** (commit this):
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/urlshortener
BASE_URL=http://localhost:3000
ADMIN_API_KEY=your-secret-admin-key-change-this
```

### Step 1.4 — Add npm scripts to `package.json`

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

---

## Phase 2 — MongoDB via Docker

### Step 2.1 — Create `docker-compose.yml`

```yaml
version: "3.8"
services:
  mongo:
    image: mongo:7
    container_name: urlshortener-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Step 2.2 — Start MongoDB

```bash
docker compose up -d
```

> Verify it's running: `docker ps` — you should see `urlshortener-mongo` listed.
> The `MONGO_URI` in `.env` already points to this container.

---

## Phase 3 — Database Model

### Step 3.1 — Create `models/Url.js`

Define a Mongoose schema with the following fields:

| Field | Type | Details |
|---|---|---|
| `originalUrl` | String | Required. The full original URL. |
| `shortCode` | String | Required. Unique. Indexed. The short slug (e.g. `abc123`). |
| `customSlug` | Boolean | Default `false`. Marks if the code was user-defined. |
| `clicks` | Number | Default `0`. Incremented on every redirect. |
| `lastAccessed` | Date | Updated on every redirect. Null if never visited. |
| `createdAt` | Date | Default `Date.now`. |

**Important model rules:**
- `shortCode` must have `unique: true` and `index: true` for fast lookups.
- Use Mongoose's built-in timestamps option or manual `createdAt`.

---

## Phase 4 — Middleware

### Step 4.1 — Create `middleware/adminAuth.js`

This middleware protects all `/admin` routes.

Logic:
1. Read the `x-admin-key` header from the incoming request.
2. Compare it to `process.env.ADMIN_API_KEY`.
3. If it matches → call `next()`.
4. If it does not match or is missing → respond with `401 Unauthorized` and a JSON error message. Do not call `next()`.

---

## Phase 5 — Controllers

### Step 5.1 — Create `controllers/publicController.js`

Implement the following functions:

#### `createShortUrl(req, res)`
- Read `originalUrl` from `req.body`.
- **Validate**: Check that `originalUrl` is a valid URL using the built-in `URL` constructor wrapped in a try/catch. If invalid, return `400` with `{ error: "Invalid URL" }`.
- **Sanitize**: Only allow `http://` and `https://` protocols. Reject anything else (e.g. `javascript://`, `ftp://`) with `400`.
- Generate a short code using `nanoid(7)`.
- Check if the generated code already exists in the DB (collision check). If it does, regenerate until unique.
- Save to MongoDB.
- Return `201` with `{ shortUrl: BASE_URL + "/" + shortCode, shortCode }`.

#### `createCustomShortUrl(req, res)`
- Read `originalUrl` and `customSlug` from `req.body`.
- Validate `originalUrl` same as above.
- **Validate slug**: Only allow alphanumeric characters and hyphens (`/^[a-zA-Z0-9-]+$/`). Length between 3 and 30 characters. If invalid, return `400`.
- **Reserved slugs**: Reject slugs that conflict with existing routes: `["admin", "shorten", "api"]`. Return `400` if matched.
- Check if the `customSlug` already exists in DB. If taken, return `409 Conflict`.
- Save with `customSlug: true`.
- Return `201` with `{ shortUrl, shortCode: customSlug }`.

#### `redirectToUrl(req, res)`
- Read `code` from `req.params`.
- Look up `shortCode` in MongoDB.
- If not found → return `404` with a simple HTML page saying "Short URL not found".
- If found → increment `clicks` by 1, update `lastAccessed` to `Date.now()`, save, then `res.redirect(302, originalUrl)`.

---

### Step 5.2 — Create `controllers/adminController.js`

Implement the following functions:

#### `getAllUrls(req, res)`
- Query all documents from the Url collection.
- Support optional query param `?sort=clicks` or `?sort=createdAt` (default: `createdAt` descending).
- Return `200` with array of all URL documents.

#### `getUrlStats(req, res)`
- Read `code` from `req.params`.
- Find the document by `shortCode`.
- If not found → `404`.
- Return `200` with the full document (originalUrl, shortCode, clicks, lastAccessed, createdAt, customSlug).

#### `deleteUrl(req, res)`
- Read `code` from `req.params`.
- Find and delete by `shortCode`.
- If not found → `404`.
- Return `200` with `{ message: "Deleted successfully" }`.

#### `updateUrl(req, res)`
- Read `code` from `req.params` and `originalUrl` from `req.body`.
- Validate the new `originalUrl` same as in `createShortUrl`.
- Find by `shortCode` and update `originalUrl`.
- If not found → `404`.
- Return `200` with the updated document.

#### `getGlobalStats(req, res)`
- Run the following aggregations/queries:
  - `totalUrls`: count of all documents.
  - `totalClicks`: sum of all `clicks` fields.
  - `topUrls`: top 5 documents sorted by `clicks` descending.
  - `recentUrls`: last 5 documents sorted by `createdAt` descending.
- Return `200` with all of the above in a single JSON object.

---

## Phase 6 — Routes

### Step 6.1 — Create `routes/public.js`

| Method | Path | Controller Function |
|---|---|---|
| POST | `/shorten` | `createShortUrl` |
| POST | `/shorten/custom` | `createCustomShortUrl` |
| GET | `/:code` | `redirectToUrl` |

### Step 6.2 — Create `routes/admin.js`

Apply `adminAuth` middleware to **all routes in this file** using `router.use(adminAuth)`.

| Method | Path | Controller Function |
|---|---|---|
| GET | `/admin/urls` | `getAllUrls` |
| GET | `/admin/urls/:code/stats` | `getUrlStats` |
| DELETE | `/admin/urls/:code` | `deleteUrl` |
| PATCH | `/admin/urls/:code` | `updateUrl` |
| GET | `/admin/stats` | `getGlobalStats` |

---

## Phase 7 — Main Server

### Step 7.1 — Create `server.js`

1. Load `dotenv`.
2. Connect to MongoDB using `MONGO_URI`. Log success or exit process on failure.
3. Initialize Express app.
4. Add middleware:
   - `express.json()` for JSON body parsing.
   - `express.static("public")` to serve the frontend files.
5. Mount routes:
   - Public routes at `/`
   - Admin routes at `/`  (paths already include `/admin` prefix)
6. Add a global error handler as the last middleware:
   - Catch any unhandled errors, log them, and return `500 { error: "Internal Server Error" }`.
7. Start listening on `process.env.PORT`.

**Important**: Mount the public router **after** the admin router so `/:code` wildcard doesn't swallow `/admin/*` routes.

---

## Phase 8 — Frontend: URL Submission Page

### Step 8.1 — Create `public/index.html`

**Design**: Dark, minimal, typographic. Single centered card on a dark background.

**UI Elements:**
- Page title: `"Paste your URL here"`
- A single full-width text input placeholder: `"https://your-long-url.com/..."`
- A `"Shorten"` button
- A result area (hidden by default) that shows:
  - The generated short URL as a clickable link
  - A `"Copy"` button that copies the short URL to clipboard and changes label to `"Copied!"`
- An error message area for invalid URLs

**Behavior (Vanilla JS):**
1. On button click or `Enter` keypress, read the input value.
2. Basic client-side validation: check if the value starts with `http://` or `https://`. Show inline error if not.
3. POST to `/shorten` with `{ originalUrl }` as JSON body.
4. On success → show the short URL result area with the returned `shortUrl`.
5. On error → show the error message from the API response.
6. Copy button uses `navigator.clipboard.writeText()`.

---

## Phase 9 — Frontend: Admin Dashboard

### Step 9.1 — Create `public/admin/index.html`

**Design**: Dark utilitarian dashboard. Table-based layout. Sidebar or top nav with sections.

**Authentication UI:**
- On page load, check `localStorage` for a saved admin key.
- If not present, show a full-screen overlay with a password/key input and `"Unlock"` button.
- On submit, store the key in `localStorage` and proceed to load the dashboard.
- All API calls must include the key as the `x-admin-key` header.
- If any API call returns `401`, clear `localStorage` and show the key prompt again.

**Dashboard Sections:**

#### Section 1 — Global Stats (top of page)
Fetch from `GET /admin/stats`. Display as stat cards:
- Total URLs created
- Total clicks across all URLs
- Most clicked URL (shortCode + click count)

#### Section 2 — All URLs Table
Fetch from `GET /admin/urls`. Display a table with columns:
- Short Code
- Original URL (truncated to 50 chars with full URL on hover via `title` attribute)
- Clicks
- Created At (formatted date)
- Last Accessed (formatted date or "Never")
- Actions: `[Edit]` `[Delete]` buttons

**Delete flow:**
- On `[Delete]` click → show a `confirm()` dialog: `"Delete this short URL? This cannot be undone."`
- If confirmed → send `DELETE /admin/urls/:code` with the admin key header.
- On success → remove the row from the table without a full page reload.

**Edit flow:**
- On `[Edit]` click → replace the Original URL cell with an `<input>` pre-filled with the current URL and a `[Save]` button.
- On `[Save]` → send `PATCH /admin/urls/:code` with `{ originalUrl: newValue }`.
- On success → update the cell value and restore the display.

#### Section 3 — URL Detail / Stats Modal
- Clicking a short code in the table opens a modal.
- Fetch from `GET /admin/urls/:code/stats`.
- Display: full original URL, short code, total clicks, created at, last accessed.

**General Dashboard Behavior:**
- Show a loading spinner while fetching data.
- Show a top banner error message if any fetch fails.
- Add a `"Refresh"` button that re-fetches all data.
- Add a `"Logout"` button that clears `localStorage` and shows the key prompt.

---

## Phase 10 — Safety & Security Checklist

Verify each of the following before considering the implementation complete:

- [ ] `ADMIN_API_KEY` is read from `.env` only — never hardcoded.
- [ ] `.env` is listed in `.gitignore`.
- [ ] All `/admin/*` routes are protected by `adminAuth` middleware.
- [ ] URL validation rejects non-http/https protocols on both `createShortUrl` and `createCustomShortUrl`.
- [ ] Custom slugs are validated against a regex — no arbitrary strings accepted.
- [ ] Reserved slugs (`admin`, `shorten`, `api`) are blocked from custom slug creation.
- [ ] `shortCode` field in MongoDB has `unique: true` and `index: true`.
- [ ] `nanoid` collision is handled with a retry loop.
- [ ] Global error handler catches unhandled errors and never leaks stack traces to the client.
- [ ] `express.static` serves only the `public/` directory.
- [ ] Admin key in the browser is stored in `localStorage` (acceptable for a personal tool) — note this is not suitable for production multi-user scenarios.

---

## Phase 11 — Smoke Tests (Manual)

After implementation, test the following manually or with a tool like `curl` or Postman:

```bash
# 1. Create a short URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://www.example.com/some/very/long/path"}'

# 2. Visit the short URL (should redirect)
curl -L http://localhost:3000/<returned-code>

# 3. Create custom slug
curl -X POST http://localhost:3000/shorten/custom \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com", "customSlug": "my-link"}'

# 4. Admin: get all URLs
curl http://localhost:3000/admin/urls \
  -H "x-admin-key: your-secret-admin-key-change-this"

# 5. Admin: get global stats
curl http://localhost:3000/admin/stats \
  -H "x-admin-key: your-secret-admin-key-change-this"

# 6. Admin: delete a URL
curl -X DELETE http://localhost:3000/admin/urls/<code> \
  -H "x-admin-key: your-secret-admin-key-change-this"

# 7. Reject invalid URL (should return 400)
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "not-a-url"}'

# 8. Reject reserved slug (should return 400)
curl -X POST http://localhost:3000/shorten/custom \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com", "customSlug": "admin"}'

# 9. Access admin without key (should return 401)
curl http://localhost:3000/admin/urls
```
