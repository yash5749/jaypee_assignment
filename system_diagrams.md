# System Diagrams

This document contains the core architecture and interaction diagrams for the Collaborative Study Room Platform.

---

# 1. High-Level System Architecture

```mermaid
flowchart LR

    User[User Browser]

    subgraph Frontend
        React[React + Vite + TypeScript]
        SocketClient[Socket.IO Client]
    end

    subgraph Backend
        Express[Express API]
        SocketServer[Socket.IO Server]
        Services[Service Layer]
        Prisma[Prisma ORM]
    end

    DB[(PostgreSQL)]

    User --> React
    React --> Express
    SocketClient --> SocketServer

    Express --> Services
    SocketServer --> Services

    Services --> Prisma
    Prisma --> DB
```

---

# 2. Database ER Diagram

```mermaid
erDiagram

    User {
        string id
        string name
        string email
        string password
        datetime createdAt
    }

    StudyRoom {
        string id
        string name
        string code
        string createdById
        datetime createdAt
    }

    RoomMember {
        string id
        string userId
        string roomId
        datetime joinedAt
    }

    Message {
        string id
        string content
        string userId
        string roomId
        datetime createdAt
    }

    StudySession {
        string id
        string roomId
        string startedById
        datetime startedAt
        datetime endedAt
        int duration
    }

    User ||--o{ StudyRoom : creates
    User ||--o{ RoomMember : joins
    StudyRoom ||--o{ RoomMember : contains

    User ||--o{ Message : sends
    StudyRoom ||--o{ Message : stores

    User ||--o{ StudySession : starts
    StudyRoom ||--o{ StudySession : contains
```

---

# 3. Authentication Flow

```mermaid
sequenceDiagram

    participant Client
    participant API
    participant Prisma
    participant JWT

    Client->>API: POST /auth/login
    API->>Prisma: Find user by email
    Prisma-->>API: User record

    API->>API: Compare password
    API->>JWT: Generate token

    JWT-->>API: Signed JWT
    API-->>Client: Auth response

    Client->>API: Protected request with JWT
    API->>JWT: Verify token
    JWT-->>API: Valid payload
    API-->>Client: Protected resource
```

---

# 4. Room Join Realtime Flow

```mermaid
sequenceDiagram

    participant User
    participant Frontend
    participant SocketServer
    participant Backend
    participant Database

    User->>Frontend: Join room
    Frontend->>Backend: POST /rooms/join

    Backend->>Database: Validate room membership
    Database-->>Backend: Membership success

    Backend-->>Frontend: Room joined

    Frontend->>SocketServer: socket.join(roomId)

    SocketServer-->>Frontend: Presence update
    SocketServer-->>Frontend: Active members
```

---

# 5. Study Session Timer Sync

```mermaid
sequenceDiagram

    participant User
    participant Frontend
    participant SocketServer
    participant Backend
    participant Database

    User->>Frontend: Start study session

    Frontend->>SocketServer: start-session
    SocketServer->>Backend: Create session

    Backend->>Database: Insert StudySession
    Database-->>Backend: Session stored

    Backend-->>SocketServer: Session state

    loop Every second
        SocketServer-->>Frontend: timer-tick
    end

    User->>Frontend: End session
    Frontend->>SocketServer: end-session

    SocketServer->>Backend: Update session duration
    Backend->>Database: Save endedAt + duration
```

---

# 6. Backend Architecture

```mermaid
flowchart TD

    Routes --> Controllers
    Controllers --> Services
    Services --> PrismaClient
    PrismaClient --> PostgreSQL

    SocketHandlers --> Services

    Middleware --> Controllers
```

---

# 7. Socket Event Flow

```mermaid
flowchart LR

    ClientA -->|join-room| SocketServer
    ClientB -->|join-room| SocketServer

    SocketServer -->|presence-update| ClientA
    SocketServer -->|presence-update| ClientB

    ClientA -->|send-message| SocketServer
    SocketServer -->|new-message| ClientB

    ClientA -->|start-session| SocketServer
    SocketServer -->|timer-update| ClientB
```

---

# Notes

The architecture intentionally prioritizes:

* clean separation of concerns,
* maintainability,
* predictable realtime synchronization,
* and incremental scalability improvements.

The current implementation is optimized for moderate-scale realtime collaboration workloads while remaining simple enough for rapid iteration and deployment on lightweight infrastructure.


>### UML

![Alt text](./UML_diagrams.png)