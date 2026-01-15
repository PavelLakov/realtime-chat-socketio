import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
import Chat from "./components/chat.jsx";

function getSocketURL() {
  // ✅ Netlify/Vite env var (set in Netlify as VITE_SOCKET_URL)
  const envUrl = import.meta.env.VITE_SOCKET_URL;

  // If env var exists, use it (production)
  if (envUrl && envUrl.trim()) return envUrl.trim();

  // Fallback for local dev (same behavior as before)
  return `http://${window.location.hostname}:3001`;
}

export default function App() {
  const [socket, setSocket] = useState(null);

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  // ✅ compute once (prevents unnecessary reconnects)
  const socketURL = useMemo(() => getSocketURL(), []);

  // ✅ keep your original logic: create socket in effect
  useEffect(() => {
    const s = io(socketURL);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [socketURL]);

  // ✅ keep your original logic: join_room event
  const joinRoom = () => {
    const u = username.trim();
    const r = room.trim();
    if (!socket) return;
    if (!u || !r) return;

    socket.emit("join_room", { room: r, username: u });
    setJoined(true);
  };

  // ✅ ONLY CHANGE: the login page UI
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

  // ✅ IMPORTANT: do not render Chat until socket exists
  if (!socket) return null;

  // ✅ chat logic unchanged
  return <Chat socket={socket} username={username} room={room} />;
}
