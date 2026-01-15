# Realtime Chat App (Rooms + Private Messages) — React (Vite) + Node.js + Socket.IO

This repository contains a lightweight realtime web chat app:

- **Join screen (login-style UI)** to enter a **username** and a **room ID**
- **Room chat** (messages broadcast to everyone in the same room)
- **Private messages (DM)**: choose a user from a dropdown and send a message only to that person
- **Live user list**: users appear immediately after joining (no need to send a message first)
- **System messages**: “joined the room” / “left the room”
- Designed to work on **localhost** and over a **local network (LAN)** (e.g., phone + laptop on the same Wi‑Fi)

---

## Table of contents

1. [What you get](#what-you-get)
2. [How the UI works](#how-the-ui-works)
3. [Features](#features)
4. [Project structure](#project-structure)
5. [How it works (architecture)](#how-it-works-architecture)
6. [Run locally (localhost)](#run-locally-localhost)
7. [Run over LAN (network)](#run-over-lan-network)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)
10. [Notes / limitations](#notes--limitations)

---

## What you get

### Frontend (React + Vite)
- A **join page** (login-style) where the user enters:
  - **Username**
  - **Room ID** (chatroom)
- A **chat window** with:
  - Header showing: `Live chat — <username> — Room: <room>`
  - A **recipient dropdown**:
    - **Everyone** (broadcast to the room)
    - **DM: <user>** (private message to a single user)
  - Scrollable message body
  - Message input + send button (Enter to send)

### Backend (Node.js + Express + Socket.IO)
- Socket server that:
  - Puts sockets into **rooms**
  - Tracks **which users are inside each room**
  - Broadcasts updated **room user lists**
  - Routes messages:
    - to everyone in a room, or
    - to a specific user (DM)
  - Emits join/leave system messages

---

## How the UI works

### 1) Join page (login-style)
The first screen is intentionally “login-like” but it is NOT authentication.
It is just a clean UX to collect:
- **Username**: the display name others will see
- **Room ID**: a string like `12`, `project-a`, `friends`, etc.

When the user clicks **Login**, the app:
1. Connects to the socket server
2. Emits `join_room` with `{ room, username }`
3. Switches to the chat UI

### 2) Chat window
The chat window has three sections:

#### Header
- Shows which user you are and which room you are in
- Contains a **recipient selector**
  - **Everyone** = normal room chat
  - **DM: user** = private message

#### Messages area (body)
- Shows incoming messages
- System messages are displayed as simple informational text
- The UI can optionally hide your own messages in your own window (depending on how your Chat component is set)

#### Footer (input + send)
- Type a message
- Press **Enter** or click the send button

---

## Features

### Rooms
- A “room” is a shared channel.
- Only users in the same room receive each other’s room messages and user list updates.

### Live user list
- When a user joins, the server broadcasts an updated user list for that room.
- The frontend updates the dropdown immediately.

### Private messages (DM)
- Pick a user in the dropdown
- The client sends a message with a `to` field set to that username
- The server looks up the target user’s socket ID and delivers the message only to them

### System join/leave messages
- When a user joins/leaves, the server emits a `receive_message` with:
  - `type: "system"`
  - message like `"<name> joined the room"`

---

## Project structure

Typical structure:

```text
chat-app/
  backend/
    server.js               # Express + Socket.IO server
    package.json
  frontend/
    src/
      App.jsx               # Join page + chat page
      App.css               # Chat theme + join page (login-style) theme
      main.jsx
      index.css
      components/
        Chat.jsx            # Chat UI + DM dropdown + message rendering
        chat.css            # (optional) component-level styles
    vite.config.js
    package.json
  .gitignore
  README.md
```

Your exact filenames may vary slightly, but the concept is the same.

---

## How it works (architecture)

### High-level flow

1. **Frontend loads**
2. User enters **username** + **room**
3. Frontend emits:
   - `join_room` → `{ room, username }`
4. Server:
   - stores `room -> (username -> socketId)`
   - stores `socketId -> { room, username }`
   - sends system “joined” message to the room
   - emits `room_users` to everyone in the room
5. When sending a message, the client emits:
   - `send_message` → `{ room, username, message, to }`
6. Server routes message:
   - if `to === "all"`: broadcast to room
   - else: deliver to the target user only

### Server-side data structures

The backend uses two maps:

- `roomUsers: Map<room, Map<username, socketId>>`
- `socketInfo: Map<socketId, { room, username }>`

This makes it fast to:
- find all users in a room
- find where a socket belongs (disconnect handling)
- route DMs by username

---

## Run locally (localhost)

### 1) Backend
In one terminal:

```bash
cd backend
npm install
node server.js
```

You should see a log like:

- `SERVER RUNNING on 3001 (0.0.0.0)`

### 2) Frontend
In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

- `http://localhost:5173`

---

## Run over LAN (network)

This is the setup so other devices in the same Wi‑Fi can open the frontend in a browser and chat with your laptop.

### 1) Backend must listen on all interfaces
Your backend already does this:

- `server.listen(3001, "0.0.0.0")`

That means it is reachable from the network at:

- `http://<YOUR_LAN_IP>:3001`

### 2) Start the frontend with host enabled
Vite must be bound to the network interface:

```bash
cd frontend
npm run dev -- --host
```

Now Vite prints something like:

- `Local:   http://localhost:5173/`
- `Network: http://192.168.x.x:5173/`

Open the **Network** URL on another device.

### 3) CORS / Socket.IO allowed origins
The backend must allow your frontend origins.
Example:

- `http://localhost:5173`
- `http://192.168.68.109:5173`

If your LAN IP changes, update the allowed origins list in `backend/server.js` accordingly.

---

## Configuration

### Socket server URL (frontend)
There are two common patterns:

#### Option A (simple): hardcode
Example:

```js
const socketURL = "http://localhost:3001";
```

#### Option B (recommended): environment variable
Create:

`frontend/.env`

```env
VITE_SOCKET_URL=http://192.168.68.109:3001
```

Then use:

```js
const socketURL = import.meta.env.VITE_SOCKET_URL;
```

This is cleaner for GitHub, because each machine can set its own backend URL.

> Note: Do not commit `.env` files to GitHub (keep them in `.gitignore`).

---

## Troubleshooting

### 1) “Failed to resolve import './App.css' …”
This happens when a component imports CSS using the wrong relative path.

Common fixes:
- If you are inside `src/components/Chat.jsx`, importing App.css should be:

```js
import "../App.css";
```

(not `./App.css`)

### 2) LAN works for opening the page, but messages don’t send
Check:
- Backend running on `0.0.0.0:3001`
- Frontend connects to the correct socket URL
- Backend CORS `origin` includes the LAN frontend URL
- Firewall allows port `3001` (backend) and `5173` (Vite dev server)

### 3) “Everyone / DM dropdown is empty”
User list is emitted from server via `room_users`.
Check:
- Client listens to `room_users`
- Server calls `emitUserList(room)` after join and disconnect
- Both users are in the **same room**

### 4) Private messages don’t arrive
Check:
- Client sends `{ to: "<username>" }`
- Server routes to that username inside the same room
- Target username exists in `roomUsers.get(room)`

### 5) It only works in one browser tab
Make sure each tab uses a **different username** in the same room.
If two users join with the same name, the map `username -> socketId` gets overwritten.

---

## Notes / limitations

- No password/auth: the join page is a UI pattern only.
- No persistence: messages are not stored in a database (refresh clears chat UI).
- No encryption: this is a LAN/dev app; do not use for sensitive data on the public internet.
- If you want internet hosting later, you’ll typically deploy:
  - backend (Socket.IO) on a server (Render/Fly/VM)
  - frontend on Netlify/Vercel
  - and configure CORS + secure WebSocket (wss)

---

## License
Add a license if you plan to share publicly (MIT is common).
