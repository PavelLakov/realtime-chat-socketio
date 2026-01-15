# Realtime Chat App — React (Vite) + Node.js + Socket.IO
Rooms · Private Messages · Live User List · Multi-tab Support

**Live Demo (Frontend — Netlify):** https://live-chat-socketio.netlify.app  
**Backend (Socket.IO Server — Render):** https://realtime-chat-socketio-backend.onrender.com  

---

## Table of Contents
1. [What this project is](#what-this-project-is)
2. [Features](#features)
3. [How it works](#how-it-works)
   - [Client–Server flow](#clientserver-flow)
   - [Public vs Private messages](#public-vs-private-messages)
   - [Live user list](#live-user-list)
   - [Multi-tab / multi-device behavior](#multi-tab--multi-device-behavior)
4. [Project structure](#project-structure)
5. [Frontend](#frontend)
   - [Key files](#key-files)
   - [Environment variable: VITE_SOCKET_URL](#environment-variable-vite_socket_url)
   - [Local development](#local-development-frontend)
6. [Backend](#backend)
   - [Key files](#key-files-1)
   - [CORS + transports for cloud](#cors--transports-for-cloud)
   - [Local development](#local-development-backend)
7. [Deployment guide](#deployment-guide)
   - [A) Deploy backend on Render](#a-deploy-backend-on-render)
   - [B) Deploy frontend on Netlify](#b-deploy-frontend-on-netlify)
   - [C) Connect frontend ↔ backend](#c-connect-frontend--backend)
8. [Troubleshooting](#troubleshooting)
9. [Tech stack](#tech-stack)
10. [License](#license)

---

## What this project is
This is a **fully deployed realtime chat application** with a clean separation of responsibilities:

- **Frontend (Netlify):** React + Vite single-page app (UI)
- **Backend (Render):** Node.js + Express + Socket.IO server (realtime transport, rooms, users, messaging)

The frontend connects to the backend using **Socket.IO**. In production, this connection is configured via an **environment variable** so the UI can point to the deployed server (not localhost).

---

## Features
- **Login screen** (username + room)
- **Room-based chat**
- **Public messages** (visible to everyone in the room)
- **Private messages (DMs)** (visible only to the selected user)
- **Live user list** (per room)
- **Join/Leave system messages**
- **Multi-tab / multi-device support**
  - One username can be connected from multiple browser tabs/devices and still receive DMs

---

## How it works

### Client–Server flow
1. User opens the Netlify site.
2. Frontend creates a Socket.IO connection to the backend.
3. User enters **username** and **room**, clicks **Login**.
4. Frontend emits:
   - `join_room` → backend adds socket to that room and updates the room’s user list.
5. Backend broadcasts updated users with:
   - `room_users` event.
6. User sends a message:
   - `send_message` event to backend.
7. Backend routes message:
   - public: to everyone else in the room
   - DM: only to the target user’s sockets

### Public vs Private messages
A message payload includes:
- `to: "all"` → public
- `to: "<username>"` → DM

Backend logic:
- If `to === "all"`: broadcast to the room (excluding sender).
- Else: look up the target username’s socket set and emit only to them.

### Live user list
- Backend keeps a per-room mapping of usernames → Set(socketIds)
- Every time someone joins/leaves:
  - backend emits `room_users` with `{ room, users }`
- Frontend uses that to populate the DM dropdown.

### Multi-tab / multi-device behavior
- Same username can appear from multiple sockets.
- Backend stores a **Set** of socket ids per username so DMs go to all sockets of that user.

---

## Project structure
```
realtime-chat-socketio/
├── backend/
│   ├── index.js            # Socket.IO + Express server
│   └── package.json        # backend deps + start script
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # login screen + socket connection
│   │   └── components/
│   │       └── chat.jsx    # chat UI logic, DM selection, rendering
│   ├── package.json        # frontend deps + Vite scripts
│   └── vite.config.*       # Vite build config
└── README.md
```

---

## Frontend

### Key files
- `frontend/src/App.jsx`
  - Builds socket URL (env var in production, hostname fallback in dev)
  - Shows the fancy login screen
  - Emits `join_room`
- `frontend/src/components/chat.jsx`
  - Handles:
    - `room_users` updates
    - selecting DM target (Everyone or specific user)
    - sending messages with `send_message`
    - rendering only messages from others (your own are hidden in your window)

### Environment variable: VITE_SOCKET_URL
The frontend looks for:
- `import.meta.env.VITE_SOCKET_URL`

In production (Netlify), set it to your Render backend URL, e.g.:
```
VITE_SOCKET_URL=https://realtime-chat-socketio-backend.onrender.com
```

If it’s not set, the app falls back to:
```
http://<current-hostname>:3001
```
This is perfect for local development and LAN testing.

### Local development (frontend)
From repo root:
```bash
cd frontend
npm install
npm run dev
```
Default URL: http://localhost:5173

---

## Backend

### Key files
- `backend/index.js`
  - Express + Socket.IO server
  - Room/user tracking
  - Public + DM routing
  - Emits `room_users` and system join/leave lines

### CORS + transports for cloud
For production deployments (Render), Socket.IO is most reliable if you allow:
- `transports: ["polling", "websocket"]`

Render free instances and proxies often work best when polling is allowed first, and then upgraded to websocket.

Also make sure your Netlify domain is included in allowed origins.

### Local development (backend)
```bash
cd backend
npm install
node index.js
```
Runs on: http://localhost:3001

---

## Deployment guide

## A) Deploy backend on Render
**Render** can run Node servers as a **Web Service**.

1. Push your code to GitHub.
2. Render → **New +** → **Web Service**
3. Connect GitHub repo.
4. **Root Directory:** `backend`
5. **Build Command:**
   ```bash
   npm install
   ```
6. **Start Command:**
   ```bash
   node index.js
   ```
7. Render provides `process.env.PORT`. Your server should use:
   ```js
   const PORT = process.env.PORT || 3001;
   server.listen(PORT, "0.0.0.0");
   ```
8. After deploy, Render gives you a URL like:
   - https://realtime-chat-socketio-backend.onrender.com

### Render Free Tier behavior (important)
- Render free services **sleep** when inactive.
- First connection after sleep can take ~30–60 seconds.
- That’s normal. The frontend will connect once the backend wakes.

---

## B) Deploy frontend on Netlify
Netlify deploys static sites (your Vite build output).

### Option 1 (recommended): Git-based deployment
1. Netlify → **Add new site** → **Import from Git**
2. Choose your repo.
3. Build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add environment variable:
   - `VITE_SOCKET_URL = https://realtime-chat-socketio-backend.onrender.com`
5. Deploy.

### Option 2: Manual drag & drop
1. Locally build:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Drag-and-drop the `frontend/dist` folder into Netlify.

(If you use manual deploy, every code change requires rebuilding and uploading dist again.)

---

## C) Connect frontend ↔ backend
To connect production frontend to production backend:

1. **Backend:** allow Netlify origin in CORS
   - Example:
     - `https://live-chat-socketio.netlify.app`
2. **Frontend:** set `VITE_SOCKET_URL` in Netlify to the Render URL.

Then redeploy frontend.

---

## Troubleshooting

### “Cannot GET /” on backend URL
Normal. Socket.IO server doesn’t serve pages. It only serves websocket/polling endpoints.

### Frontend loads but cannot send messages / no users list
Usually one of:
- `VITE_SOCKET_URL` not set / wrong URL
- backend CORS doesn’t include your Netlify site
- backend is asleep (Render free) → wait a bit and refresh
- websocket blocked → ensure polling is enabled in both client/server

### Netlify build fails with “Invalid package name @ty pes/react”
This happens when package.json has a typo like `@ty pes/react`.
Fix to:
- `@types/react`
- `@types/react-dom`

### Netlify build fails: “Could not read package.json”
Your Base directory is wrong.
- If package.json is inside `frontend`, Base must be `frontend`.

---

## Tech stack
- React 19
- Vite
- Socket.IO (client + server)
- Express
- Netlify (frontend hosting)
- Render (backend hosting)

---

## License
MIT
