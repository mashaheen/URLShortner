# Local Run Manual

Follow these steps to run this URL shortener project on your local machine.

## 1. Prerequisites

Install these tools first:

- Node.js 18 or newer
- npm
- Docker Desktop, for MongoDB

## 2. Project Structure

Important folders and files:

- `backend/` - Express API server
- `backend/.env.example` - example backend environment variables
- `docker-compose.yml` - MongoDB service definition
- `public-page/index.html` - public URL shortener page
- `admin-dashboard/index.html` - admin dashboard page

The frontend pages are static HTML files. They call the backend at `http://localhost:3000`.

## 3. Start MongoDB

From the project root, run:

```powershell
docker compose up -d
```

This starts MongoDB in Docker on port `27017` using the service in `docker-compose.yml`.

To check that the container is running:

```powershell
docker ps
```

You should see a container named `urlshortener-mongo`.

## 4. Configure Backend Environment

Go into the backend folder:

```powershell
cd backend
```

Create a `.env` file from the example if it does not already exist:

```powershell
copy .env.example .env
```

Open `backend/.env` and confirm these values:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/urlshortener
BASE_URL=http://localhost:3000
ADMIN_API_KEY=your-secret-admin-key-change-this
```

You can change `ADMIN_API_KEY` to any private value. You will use this value to log into the admin dashboard.

## 5. Install Backend Dependencies

From inside the `backend/` folder, run:

```powershell
npm install
```

## 6. Start the Backend API

For development with auto-restart:

```powershell
npm run dev
```

Or run normally:

```powershell
npm start
```

Expected output includes:

```text
MongoDB connected
Server listening on port 3000
```

Leave this terminal open while using the project.

## 7. Open the Public Page

Open this file in your browser:

```text
public-page/index.html
```

Enter a full URL such as:

```text
https://example.com
```

Click the shorten button. The page sends a request to:

```text
POST http://localhost:3000/shorten
```

If successful, it shows a short URL like:

```text
http://localhost:3000/abc1234
```

Opening that short URL should redirect to the original URL.

## 8. Open the Admin Dashboard

Open this file in your browser:

```text
admin-dashboard/index.html
```

When prompted for the admin key, enter the value from `backend/.env`:

```text
ADMIN_API_KEY
```

For example, if your `.env` still uses the example value, enter:

```text
your-secret-admin-key-change-this
```

The admin dashboard can list URLs, show stats, edit original URLs, and delete short URLs.

## 9. Quick API Checks

You can test the API directly from PowerShell.

Create a short URL:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/shorten" -ContentType "application/json" -Body '{"originalUrl":"https://example.com"}'
```

Get admin stats, replacing the key if you changed it:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/admin/stats" -Headers @{ "x-admin-key" = "your-secret-admin-key-change-this" }
```

## 10. Stop the Project

Stop the backend by pressing `Ctrl+C` in the backend terminal.

Stop MongoDB from the project root:

```powershell
docker compose down
```

To also delete the local MongoDB data volume:

```powershell
docker compose down -v
```

Only use `-v` if you are okay with deleting all locally saved short URLs.

## Troubleshooting

- If the backend says MongoDB connection failed, make sure Docker Desktop is running and `docker compose up -d` completed successfully.
- If the frontend says it cannot reach the shortening service, make sure the backend is running on `http://localhost:3000`.
- If the admin dashboard says unauthorized, make sure the entered key exactly matches `ADMIN_API_KEY` in `backend/.env`.
- If port `3000` is already in use, change `PORT` and `BASE_URL` in `backend/.env`, then update `API_BASE` in both HTML files to match the new backend URL.
