const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Chat = require("./models/Chat");
const sanitizeMessage = require("./utils/sanitizeMessage");

function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });
  const rooms = {};

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: token missing"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Ensure both id and username are set
      socket.data.user = {
        id: decoded.id || decoded._id, // fallback to _id
        username: decoded.username
      };
      next();
    } catch (err) {
      console.error("[SOCKET] Invalid token:", err.message);
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user?.id || "unknown";
    console.log(`[SOCKET] Connected: ${socket.id} userId=${userId}`);

    socket.on("joinRoom", async ({ roomId }) => {
      try {
        const username = socket.data.user.username || "Unknown";
        socket.join(roomId);

        if (!rooms[roomId]) {
          rooms[roomId] = {
            participants: [],
            adminId: socket.id,
            timer: { timeLeft: 25 * 60, running: false, phase: "Study Time" },
            currentSession: 1,
            totalSessions: 4
          };
        }

        const room = rooms[roomId];
        const existing = room.participants.find(p => p.userId === userId);
        if (!existing) room.participants.push({ socketId: socket.id, userId, username });
        else existing.socketId = socket.id;

        io.to(roomId).emit("participantsUpdate", { participants: room.participants, adminId: room.adminId });
        io.to(roomId).emit("systemMessage", sanitizeMessage(`${username} joined the room`));

        const messages = await Chat.find({ roomId }).sort({ createdAt: 1 }).populate("senderId", "username");
        const formatted = messages.map(m => ({
          username: m.senderId.username,
          message: m.message,
          createdAt: m.createdAt
        }));
        socket.emit("loadMessages", formatted);

      } catch (err) {
        console.error("[SOCKET] joinRoom error:", err);
        socket.emit("errorMessage", "Failed to join room");
      }
    });

    socket.on("sendMessage", async ({ roomId, message }) => {
      try {
        const username = socket.data.user.username || "Unknown";
        const cleanMessage = sanitizeMessage(message); // Sanitize message content
        if (!cleanMessage || cleanMessage.trim() === "") {
          // <-- Emit an error instead of silently returning
          return socket.emit("errorMessage", "Message blocked: invalid or unsafe content");
        }

        await Chat.create({ roomId, senderId: userId, message: cleanMessage });
        io.to(roomId).emit("newMessage", { username, message: cleanMessage, createdAt: new Date() });
      } catch (err) {
        console.error("[SOCKET] sendMessage error:", err);
        socket.emit("errorMessage", "Failed to send message");
      }
    });

    socket.on("disconnect", () => {
      try {
        for (const roomId in rooms) {
          const room = rooms[roomId];
          const idx = room.participants.findIndex(p => p.socketId === socket.id);
          if (idx !== -1) {
            const [leaving] = room.participants.splice(idx, 1);

            if (room.adminId === socket.id) {
              room.adminId = room.participants.length > 0 ? room.participants[0].socketId : null;
              if (room.adminId) io.to(roomId).emit("systemMessage", sanitizeMessage(`${room.participants[0].username} is now the admin`));
            }

            io.to(roomId).emit("participantsUpdate", { participants: room.participants, adminId: room.adminId });
            io.to(roomId).emit("systemMessage", sanitizeMessage(`${leaving.username} left the room`));
          }
        }
      } catch (err) {
        console.error("[SOCKET] disconnect error:", err);
      }
    });
  });

  setInterval(() => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.timer.running) {
        room.timer.timeLeft--;
        if (room.timer.timeLeft <= 0) {
          room.timer.running = false;
          if (room.timer.phase === "Study Time") {
            room.timer.phase = "Break Time";
            room.timer.timeLeft = 5 * 60;
          } else {
            room.timer.phase = "Study Time";
            room.timer.timeLeft = 25 * 60;
            if (room.currentSession < room.totalSessions) room.currentSession++;
          }
          io.to(roomId).emit("sessionUpdate", { currentSession: room.currentSession, totalSessions: room.totalSessions });
        }
        io.to(roomId).emit("timerUpdate", room.timer);
      }
    }
  }, 1000);

  io.on("error", (err) => {
    console.error("[SOCKET] General error:", err);
  });

  return io;
}

module.exports = { initSocket };
