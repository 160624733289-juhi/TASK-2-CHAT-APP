const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const ALLOWED_ROOMS = ["general", "random", "tech"];
const MAX_MESSAGE_LENGTH = 500;
const HISTORY_LIMIT = 100;

app.use(express.static(path.join(__dirname, "public")));

const users = new Map();
const rooms = Object.fromEntries(ALLOWED_ROOMS.map(room => [room, { messages: [] }]));
const avatarColors = ["#8b7cff", "#ff7892", "#27b7a5", "#e6a23c", "#4e9de6", "#bd83df", "#62b879", "#e07845"];

function getRoomUsers(room) {
  return [...users.values()]
    .filter(user => user.room === room)
    .map(({ username, avatar }) => ({ username, avatar }));
}
function updateRoomUsers(room) {
  io.to(room).emit("room_users", getRoomUsers(room));
}
function systemMessage(room, text) {
  io.to(room).emit("system_message", { text, timestamp: Date.now() });
}
function saveMessage(room, message) {
  rooms[room].messages.push(message);
  if (rooms[room].messages.length > HISTORY_LIMIT) rooms[room].messages.shift();
}
function cleanName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 20) : "";
}

io.on("connection", socket => {
  console.log("[CONNECT]", socket.id);

  socket.on("join", (payload = {}) => {
    const username = cleanName(payload.username);
    const room = payload.room;
    if (!username || !ALLOWED_ROOMS.includes(room)) {
      socket.emit("app_error", "Enter a valid name and choose a valid channel.");
      return;
    }

    const previous = users.get(socket.id);
    if (previous) {
      socket.leave(previous.room);
      users.delete(socket.id);
      systemMessage(previous.room, `${previous.username} left the channel.`);
      updateRoomUsers(previous.room);
    }

    const avatar = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    users.set(socket.id, { username, room, avatar });
    socket.join(room);
    socket.emit("joined", { username, room, avatar });
    socket.emit("room_history", { room, messages: rooms[room].messages });
    systemMessage(room, `${username} joined #${room}.`);
    updateRoomUsers(room);
    console.log(`[JOIN] ${username} -> #${room}`);
  });

  socket.on("chat_message", (payload = {}) => {
    const user = users.get(socket.id);
    if (!user) return;
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      socket.emit("app_error", `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }

    const message = {
      id: `${Date.now()}-${socket.id}-${Math.random().toString(16).slice(2, 7)}`,
      username: user.username, avatar: user.avatar, text,
      timestamp: Date.now(), room: user.room, reactions: {}
    };
    saveMessage(user.room, message);
    io.to(user.room).emit("chat_message", message);
  });

  socket.on("typing", payload => {
    const user = users.get(socket.id);
    if (user) socket.to(user.room).emit("typing", {
      username: user.username, isTyping: Boolean(payload && payload.isTyping)
    });
  });

  socket.on("reaction", payload => {
    const user = users.get(socket.id);
    const allowed = ["❤️", "😂", "👍", "🎉", "😮"];
    if (!user || !payload || typeof payload.messageId !== "string" || !allowed.includes(payload.emoji)) return;

    const message = rooms[user.room].messages.find(item => item.id === payload.messageId);
    if (!message) return;
    message.reactions ||= {};
    message.reactions[payload.emoji] ||= [];
    const reactors = message.reactions[payload.emoji];
    const index = reactors.indexOf(user.username);
    if (index >= 0) reactors.splice(index, 1);
    else reactors.push(user.username);
    if (!reactors.length) delete message.reactions[payload.emoji];

    io.to(user.room).emit("reaction_update", {
      messageId: message.id, reactions: message.reactions
    });
  });

  socket.on("switch_room", payload => {
    const user = users.get(socket.id);
    const nextRoom = payload && payload.room;
    if (!user || !ALLOWED_ROOMS.includes(nextRoom) || nextRoom === user.room) return;

    const oldRoom = user.room;
    socket.leave(oldRoom);
    systemMessage(oldRoom, `${user.username} left #${oldRoom}.`);
    user.room = nextRoom;
    socket.join(nextRoom);
    socket.emit("room_history", { room: nextRoom, messages: rooms[nextRoom].messages });
    systemMessage(nextRoom, `${user.username} joined #${nextRoom}.`);
    updateRoomUsers(oldRoom);
    updateRoomUsers(nextRoom);
    socket.emit("room_switched", { room: nextRoom });
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (!user) return;
    users.delete(socket.id);
    systemMessage(user.room, `${user.username} went offline.`);
    updateRoomUsers(user.room);
    console.log("[DISCONNECT]", user.username);
  });
});

app.get("/api/status", (_req, res) => {
  res.json({
    status: "ok",
    onlineUsers: users.size,
    rooms: ALLOWED_ROOMS.map(room => ({
      name: room, online: getRoomUsers(room).length,
      savedMessages: rooms[room].messages.length
    }))
  });
});

server.listen(PORT, () => console.log(`NexusChat+ running at http://localhost:${PORT}`));
