const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

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
        rooms[roomId] = {
          participants: [],
          adminId: socket.id
        };
      }

      const room = rooms[roomId];
      const existing = room.participants.find(p => p.userId === userId);
      if (!existing) {
        room.participants.push({ socketId: socket.id, userId, username });
      } else {
        existing.socketId = socket.id;
        existing.username = username;
      }

      io.to(roomId).emit("participantsUpdate", {
        participants: room.participants,
        adminId: room.adminId
      });

      io.to(roomId).emit("systemMessage", `${username} joined the room`);
    });

    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const idx = room.participants.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          const [leaving] = room.participants.splice(idx, 1);

          if (room.adminId === socket.id && room.participants.length > 0) {
            room.adminId = room.participants[0].socketId;
            io.to(roomId).emit("systemMessage",
              `${room.participants[0].username} is now the admin`);
          }

          io.to(roomId).emit("participantsUpdate", {
            participants: room.participants,
            adminId: room.adminId
          });
          io.to(roomId).emit("systemMessage", `${leaving.username} left the room`);
        }
      }
    });
  });

  return io;
}

module.exports = { initSocket };
