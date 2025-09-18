const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Chat = require("./models/Chat");

function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });
  const rooms = {};

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: token missing"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id} userId=${socket.data.user?.id || "unknown"}`);

    socket.on("joinRoom", async ({ roomId }) => {
      const userId = socket.data.user.id;
      const username = socket.data.user.username || "Unknown";

      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = { participants: [], adminId: socket.id };
      }

      const room = rooms[roomId];
      const existing = room.participants.find(p => p.userId === userId);
      if (!existing) {
        room.participants.push({ socketId: socket.id, userId, username });
      } else {
        existing.socketId = socket.id;
        existing.username = username;
      }

      io.to(roomId).emit("participantsUpdate", { participants: room.participants, adminId: room.adminId });
      io.to(roomId).emit("systemMessage", `${username} joined the room`);

      try {
        const messages = await Chat.find({ roomId })
          .sort({ createdAt: 1 })
          .populate("senderId", "username");

        const formatted = messages.map(m => ({
          username: m.senderId.username,
          message: m.message,
          createdAt: m.createdAt
        }));

        socket.emit("loadMessages", formatted);
      } catch (err) {
        console.error("[JOIN] Failed to load messages:", err);
        socket.emit("loadMessages", []);
      }
    });

    socket.on("sendMessage", async ({ roomId, message }) => {
      const userId = socket.data.user.id;
      const username = socket.data.user.username || "Unknown";

      try {
        await Chat.create({ roomId, senderId: userId, message });
        io.to(roomId).emit("newMessage", { username, message, createdAt: new Date() });
      } catch (err) {
        console.error("[CHAT] Failed to save message:", err);
      }
    });

    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const idx = room.participants.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          const [leaving] = room.participants.splice(idx, 1);

          if (room.adminId === socket.id && room.participants.length > 0) {
            room.adminId = room.participants[0].socketId;
            io.to(roomId).emit("systemMessage", `${room.participants[0].username} is now the admin`);
          }

          io.to(roomId).emit("participantsUpdate", { participants: room.participants, adminId: room.adminId });
          io.to(roomId).emit("systemMessage", `${leaving.username} left the room`);
        }
      }
    });
  });

  return io;
}

module.exports = { initSocket };
