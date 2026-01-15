import { useEffect, useMemo, useState } from "react";
import "./chat.css";

export default function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState("all"); // "all" or username

  const otherUsers = useMemo(
    () => users.filter((u) => u !== username),
    [users, username]
  );

  const sendMessage = () => {
    const text = currentMessage.trim();
    if (!text || !socket) return;

    const msg = {
      room,
      username,
      message: text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      to: target,
      type: target === "all" ? "user" : "dm",
    };

    socket.emit("send_message", msg);
    setCurrentMessage("");
  };

  useEffect(() => {
    if (!socket) return;

    const onReceive = (data) => {
      if (data?.username === username) return; // don’t show my own
      setMessages((prev) => [...prev, data]);
    };

    const onUsers = ({ room: r, users: list }) => {
      if (String(r) !== String(room)) return;
      setUsers(list);
      if (target !== "all" && !list.includes(target)) setTarget("all");
    };

    socket.on("receive_message", onReceive);
    socket.on("room_users", onUsers);

    return () => {
      socket.off("receive_message", onReceive);
      socket.off("room_users", onUsers);
    };
  }, [socket, room, target, username]);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <p>
          Live chat — {username} — Room: {room}
        </p>

        <div className="chat-target">
          <select
            className="chat-target-select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="all">Everyone</option>
            {otherUsers.map((u) => (
              <option key={u} value={u}>
                DM: {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chat-body">
        {messages.map((m, i) => {
          if (m?.username === username) return null;

          const isSystem = m.type === "system" || m.username === "system";
          const isDm = m.type === "dm" || (m.to && m.to !== "all");

          if (isSystem) {
            return (
              <div key={i} className="msg-row system">
                <div className="msg-bubble system-bubble">{m.message}</div>
              </div>
            );
          }

          return (
            <div key={i} className="msg-row other">
              <div className="msg-bubble">
                <div className="msg-meta">
                  <span className="msg-name">{m.username}</span>
                  {isDm && <span className="dm-badge">private</span>}
                </div>

                <div className="msg-text">{m.message}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-footer">
        <input
          type="text"
          placeholder={
            target === "all" ? "Message everyone..." : `Message ${target}...`
          }
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button type="button" onClick={sendMessage}>
          &#9658;
        </button>
      </div>
    </div>
  );
}
