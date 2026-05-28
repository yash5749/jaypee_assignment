## Tech Stack

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Supertest](https://img.shields.io/badge/Supertest-222222?style=for-the-badge)

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)
![Render](https://img.shields.io/badge/Render-430098?style=for-the-badge&logo=render&logoColor=white)



# Collaborative Study Room Platform

A full-stack, real-time study workspace built for collaborative focus, accountability, and session tracking.

This project combines authentication, room management, live presence, real-time chat, server-synced study sessions, and a progress dashboard into a single production-oriented application. It is structured as a monorepo-style codebase with shared TypeScript contracts so the frontend and backend stay aligned.

## About this project

The goal of the project is simple: make online studying feel structured instead of scattered.

Students can create or join study rooms, share a code or invite link, see who is currently present, start timed sessions, exchange short messages, and review study history later. The backend owns the session state so timers stay consistent across refreshes and multiple browser windows.

The application is intentionally designed with clean boundaries:
- REST APIs for authentication, room management, messages, and analytics
- Socket.IO for room presence, chat, and session updates
- Shared TypeScript types for consistent frontend/backend contracts
- Server-authoritative study sessions to avoid timer drift
- In-memory room presence for fast realtime updates in a single-instance deployment

## Key highlights

- Email/password authentication with a single JWT access token
- Profile update support for name and email
- Create study rooms and generate unique room codes
- Join rooms by code or shareable link
- Leave rooms cleanly
- Realtime room presence updates
- Realtime chat with persisted message history
- Server-synced study session start/stop flow
- Countdown timer rendered from backend timestamps
- Dashboard analytics based on sessions and messages
- Room-level history, recent activity, and total study time summaries
- Responsive UI built with React + Tailwind CSS
- CI workflow with linting, type checking, build verification, and backend tests
- PR review automation configured with CodeRabbit

## Tech stack

### Backend
- Express
- TypeScript
- Prisma
- PostgreSQL
- Socket.IO
- JWT authentication
- bcrypt password hashing
- Zod validation
- Helmet, CORS, Morgan

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Socket.IO client

### Shared
- `shared/` contains DTOs, API contracts, socket event names, and constants used by both apps.

### Quality tooling
- GitHub Actions
- Vitest
- Supertest
- ESLint
- Prettier
- CodeRabbit PR reviews

## Repository structure

```txt
.
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
├── shared/
├── .github/
│   └── workflows/
├── render.yaml
└── README.md
```

## Features

### Authentication
- Register a new account
- Log in with email and password
- Persist the JWT in localStorage
- Fetch and update the current profile
- Protect private routes in the frontend

### Study rooms
- Create a room with a unique room code
- Join a room using a room code
- Share a room link from the dashboard
- Leave a room
- View room details and membership

### Realtime collaboration
- See who is currently online in a room
- Send and receive messages instantly
- Keep room state isolated with Socket.IO rooms
- Receive session sync events when joining or reconnecting

### Study sessions
- Start a session with a selected duration
- Stop an active session manually
- Auto-end sessions based on the server timer
- Keep timer state in sync across refreshes and multiple tabs
- View session history for each room

### Dashboard analytics
- Total study time
- Study time in the last 24 hours, 7 days, and 30 days
- Total sessions tracked
- Active sessions across joined rooms
- Per-room summaries
- Recent activity feed

### Profile
- View account details
- Update name and email

## API overview

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`

### Rooms
- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/join`
- `GET /api/rooms/:roomId`
- `POST /api/rooms/:roomId/leave`
- `GET /api/rooms/:roomId/messages`
- `GET /api/rooms/:roomId/sessions`
- `GET /api/rooms/:roomId/session-sync`
- `POST /api/rooms/:roomId/sessions/start`
- `POST /api/rooms/:roomId/sessions/stop`

### Dashboard
- `GET /api/dashboard/analytics`

### Health check
- `GET /health`

## Socket events

### Client → Server
- `join-room`
- `leave-room`
- `send-message`
- `start-session`
- `stop-session`
- `request-sync`

### Server → Client
- `room-members-updated`
- `receive-message`
- `session-started`
- `session-ended`
- `session-sync`
- `error`

## Data model

The backend uses five core Prisma models:

- `User`
- `StudyRoom`
- `RoomMember`
- `Message`
- `StudySession`

### Important notes
- `StudyRoom.code` is unique.
- `RoomMember` uses a composite unique key on `(userId, roomId)`.
- Presence is kept in memory, not in the database.
- Session duration is stored server-side so the backend remains authoritative.

## Scalability notes

This project is intentionally built for a single-instance deployment first.

That means:
- Socket.IO presence is stored in memory
- room membership state is not distributed across servers
- session timing is managed by the backend process

This is a sensible choice for an internship project because it keeps the system simple, stable, and easy to understand.

### Future improvements for larger scale
- Redis for shared presence state
- Socket.IO Redis adapter for multi-instance realtime messaging
- Cursor-based pagination for larger message histories
- Background jobs for analytics and cleanup
- More structured observability and monitoring

## Environment variables

### Backend: `backend/.env`
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRY=7d
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
```

You can also provide multiple origins with commas:
```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.com
SOCKET_IO_CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.com
```

### Frontend: `frontend/.env`
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

## Local setup

### 1) Install dependencies
```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

### 2) Configure the backend environment
Create `backend/.env` using the variables above.

### 3) Set up the database
From the `backend/` folder:

```bash
npx prisma generate
npx prisma migrate dev
```

If you are only prototyping locally and do not want to create a migration yet, you can use `npx prisma db push` instead. The repository already includes committed migrations for production-style deployment.

### 4) Start the backend
```bash
cd backend
npm run dev
```

### 5) Start the frontend
```bash
cd frontend
npm run dev
```

## Available scripts

### Backend
- `npm run dev` — start the backend in watch mode
- `npm run build` — compile TypeScript
- `npm run start` — run the compiled server
- `npm run typecheck` — run TypeScript without emitting files
- `npm run lint` — lint backend source files
- `npm test` — run backend tests with Vitest
- `npm run test:watch` — run Vitest in watch mode
- `npm run format` — format backend files
- `npm run format:check` — check formatting
- `npm run prisma:generate` — generate Prisma client
- `npm run db:migrate` — deploy Prisma migrations

### Frontend
- `npm run dev` — start Vite dev server
- `npm run build` — typecheck and build for production
- `npm run preview` — preview the production build
- `npm run lint` — lint frontend source files
- `npm run typecheck` — run TypeScript without emitting files
- `npm run format` — format frontend files

## Testing

The backend uses:
- **Vitest** for test execution
- **Supertest** for HTTP endpoint testing

The current test suite focuses on core business paths:
- registration
- login
- room creation
- room joining
- session start/stop logic

Run the tests from the backend folder:

```bash
npm test
```

## Deployment

The repository includes a Render blueprint in `render.yaml`.

### What it provisions
- a PostgreSQL database
- a Node web service for the backend
- a static site for the frontend

### Deployment flow
1. Render installs backend and frontend dependencies.
2. Prisma client is generated in the backend.
3. Backend migrations are applied before startup.
4. Backend is built and started as a long-running web service.
5. Frontend is built and published as a static site.
6. Environment variables are injected automatically by Render.

### Why this deployment shape works
- Socket.IO needs a real Node process, so the backend is deployed as a web service.
- The frontend is a standard SPA, so Render static hosting is enough.
- Prisma migrations keep the database schema reproducible across environments.

## Project decisions

### Why shared types exist
The `shared/` folder reduces duplication and keeps the frontend and backend synchronized on DTOs, API responses, and socket events.

### Why the session timer is server-authoritative
If the frontend owned the timer completely, refreshes and reconnects would create drift. The backend stores the session start time and duration so the same session state can be restored reliably.

### Why presence is in memory
In-memory presence is fast and simple for the current deployment model. It is a conscious tradeoff that keeps the app maintainable without introducing Redis too early.

### Why a single JWT is used
The application keeps authentication simple by using one access token. That reduces implementation complexity while still being secure enough for this project scope.

## Manual verification checklist

Before merging or deploying, verify the following:
- register a new user successfully
- log in and persist the session
- update profile details
- create a room and join it with a code
- open the same room in two browser windows and confirm presence updates
- send messages and confirm realtime delivery
- start a study session and confirm the countdown syncs
- stop a session and confirm the final state is saved
- refresh the room page and confirm sync recovery
- check dashboard analytics after study activity
- verify production build on both frontend and backend
- confirm the Render deployment starts without path or environment errors



## License

MIT