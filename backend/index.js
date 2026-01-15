const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://192.168.68.109:5173"],
    methods: ["GET", "POST"],
  },
});

function timeNow() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// room -> Map(username -> Set(socketId))
const roomUsers = new Map();
// socketId -> { room, username }
const socketInfo = new Map();

function emitUserList(room) {
  const usersMap = roomUsers.get(room);
  const users = usersMap ? Array.from(usersMap.keys()) : [];
  io.to(room).emit("room_users", { room, users });
}

io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  socket.on("join_room", ({ room, username }) => {
    if (!room || !username) return;

    socket.join(room);
    socketInfo.set(socket.id, { room, username });

    if (!roomUsers.has(room)) roomUsers.set(room, new Map());
    const usersMap = roomUsers.get(room);

    if (!usersMap.has(username)) usersMap.set(username, new Set());
    usersMap.get(username).add(socket.id);

    console.log(`🏠 ${username} (${socket.id}) joined room: ${room}`);

    socket.to(room).emit("receive_message", {
      room,
      username: "system",
      message: `${username} joined the room`,
      time: timeNow(),
      type: "system",
      senderId: "system",
    });

    emitUserList(room);
  });

  socket.on("send_message", (data) => {
    if (!data?.room || !data?.username || !data?.message) return;

    const room = data.room;
    const to = data.to || "all";

    // Stamp senderId so clients can hide only their own instance messages
    const payload = { ...data, senderId: socket.id };

    if (to === "all") {
      socket.to(room).emit("receive_message", payload);
      return;
    }

    const usersMap = roomUsers.get(room);
    if (!usersMap) return;

    const targetSet = usersMap.get(to);
    if (!targetSet || targetSet.size === 0) return;

    // Send DM to ALL sockets of that username (multi-tab / multi-device)
    for (const targetSocketId of targetSet) {
      io.to(targetSocketId).emit("receive_message", payload);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ User Disconnected:", socket.id, "reason:", reason);

    const info = socketInfo.get(socket.id);
    if (!info) return;

    const { room, username } = info;
    socketInfo.delete(socket.id);

    const usersMap = roomUsers.get(room);
    if (usersMap) {
      const set = usersMap.get(username);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) usersMap.delete(username);
      }
      if (usersMap.size === 0) roomUsers.delete(room);
    }

    socket.to(room).emit("receive_message", {
      room,
      username: "system",
      message: `${username} left the room`,
      time: timeNow(),
      type: "system",
      senderId: "system",
    });

    emitUserList(room);
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("🚀 SERVER RUNNING on 3001 (0.0.0.0)");
});
