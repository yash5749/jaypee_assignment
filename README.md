# Collaborative Study Room Platform

Full-stack study room platform built with the required stack from `instruction.md`:

- Backend: Express, Prisma, PostgreSQL, Socket.IO, JWT
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Shared contracts: `shared/`

## Features

- Email/password authentication with a single JWT access token
- Create and join study rooms by code
- Room membership checks for all private room actions
- Realtime presence with in-memory Socket.IO room tracking
- Realtime chat with persisted message history
- Server-authoritative study sessions with local countdown rendering
- Dashboard analytics based on `StudySession` and `Message` data

## Project structure

```txt
backend/
frontend/
shared/
instruction.md
```

## Environment variables

### Backend

Create `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRY=7d
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
```

You can provide multiple origins with commas:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.com
SOCKET_IO_CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.com
```

### Frontend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

## Local setup

1. Install dependencies in both apps.
2. Configure PostgreSQL and set `backend/.env`.
3. Generate the Prisma client.
4. Apply your Prisma migration or push the schema.
5. Start backend and frontend dev servers.

Example commands:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Build for production

```bash
cd backend && npm run build
cd frontend && npm run build
```

Backend production start:

```bash
cd backend && npm start
```

## Deployment

This repo is set up for Render deployment with a single [render.yaml](/Users/_yash5749/Documents/jaypee_assignment/render.yaml:1) Blueprint that provisions:

- a Render Postgres database
- a Node web service for the backend
- a static site for the frontend

### Why this deployment shape

- The backend needs a long-running Node process for Socket.IO.
- Render web services support WebSocket connections.
- The frontend is a Vite SPA, so the static site is configured with a rewrite to `/index.html`.
- Prisma production deploys should use committed migrations with `prisma migrate deploy`.

### One-time prep before first deploy

Commit and push these deployment files:

- [render.yaml](/Users/_yash5749/Documents/jaypee_assignment/render.yaml:1)
- [backend/prisma/migrations/20260527160000_init/migration.sql](/Users/_yash5749/Documents/jaypee_assignment/backend/prisma/migrations/20260527160000_init/migration.sql:1)
- [backend/prisma/migrations/migration_lock.toml](/Users/_yash5749/Documents/jaypee_assignment/backend/prisma/migrations/migration_lock.toml:1)
- [.node-version](/Users/_yash5749/Documents/jaypee_assignment/.node-version:1)

### Deploy on Render

1. Push the latest code to GitHub.
2. In Render, choose `New +` → `Blueprint`.
3. Connect your GitHub repo.
4. Render will detect [render.yaml](/Users/_yash5749/Documents/jaypee_assignment/render.yaml:1).
5. Review the three resources that will be created.
6. Create the Blueprint.

Render will then:

- create the PostgreSQL database
- build and deploy the backend
- run `cd backend && npm run db:migrate` before backend startup
- build and deploy the frontend
- inject the backend/frontend public URLs into the needed environment variables

### After deploy

Verify these URLs:

- Backend health check: `https://your-backend-service.onrender.com/health`
- Frontend app: `https://your-frontend-site.onrender.com`

Then test:

- register and login
- create and join rooms
- realtime chat in two browser windows
- start and stop study sessions
- dashboard analytics

### Important note about your local database

Your local database was created with `prisma db push`, so the new migration files are for deployment and future environments. If you ever want your local database fully aligned with migration history, reset or recreate the local database and run migrations from scratch.

## Manual verification checklist

- Register and log in successfully.
- Create a room and join another by code.
- Open the same room in two browser sessions and confirm presence updates.
- Send messages and confirm realtime delivery plus persisted history.
- Start a study session and confirm both clients receive sync updates.
- Let a session finish naturally and confirm the server emits `session-ended`.
- Refresh the room page and confirm active session sync is restored.
- Check dashboard analytics after chat and session activity.
