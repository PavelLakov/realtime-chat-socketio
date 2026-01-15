import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Chat from "./components/chat.jsx";

function getSocketURL() {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  return `http://${window.location.hostname}:3001`;
}

export default function App() {
  const [socket, setSocket] = useState(null); // ✅ normal state, allowed
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  // compute once
  const socketURL = useMemo(() => getSocketURL(), []);

  useEffect(() => {
    const s = io(socketURL, {
      transports: ["polling", "websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 800,
      timeout: 20000,
    });

    // ✅ update state ONLY via event (ESLint-approved)
    s.on("connect", () => {
      setSocket(s);
      console.log("✅ socket connected:", s.id);
    });

    s.on("connect_error", (err) => {
      console.error("❌ socket error:", err.message);
    });

    return () => {
      s.disconnect();
    };
  }, [socketURL]);

  const joinRoom = () => {
    const u = username.trim();
    const r = room.trim();
    if (!socket || !u || !r) return;

    socket.emit("join_room", { room: r, username: u });
    setJoined(true);
  };

  // ======================
  // LOGIN SCREEN
  // ======================
  if (!joined) {
    return (
      <div className="join-page">
        <div className="join-glow">
          <div className="join-card">
            <h1 className="join-title">Login</h1>

            <div className="join-field">
              <label className="join-label">Username</label>
              <input
                className="join-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
              />
              <div className="join-underline" />
            </div>

            <div className="join-field">
              <label className="join-label">Chat room</label>
              <input
                className="join-input"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                autoComplete="off"
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
              <div className="join-underline" />
            </div>

            <button className="join-btn" type="button" onClick={joinRoom}>
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================
  // CHAT SCREEN
  // ======================
  if (!socket) return null;

  return <Chat socket={socket} username={username} room={room} />;
}
