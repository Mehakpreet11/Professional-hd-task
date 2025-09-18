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
    const userId = socket.data.user.id;

    socket.on("joinRoom", async ({ roomId }) => {
      const username = socket.data.user.username || "Unknown";
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = {
          participants: [],
          adminId: socket.id,
          timer: { timeLeft: 25*60, running: false, phase: "Study Time" },
          currentSession: 1,
          totalSessions: 4
        };
      }

      const room = rooms[roomId];
      const existing = room.participants.find(p => p.userId === userId);
      if (!existing) room.participants.push({ socketId: socket.id, userId, username });
      else existing.socketId = socket.id;

      io.to(roomId).emit("participantsUpdate", { participants: room.participants, adminId: room.adminId });
      io.to(roomId).emit("systemMessage", `${username} joined the room`);
    });

    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const idx = room.participants.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          const [leaving] = room.participants.splice(idx, 1);

          // reassign admin if necessary
          if (room.adminId === socket.id) {
            if (room.participants.length > 0) {
              room.adminId = room.participants[0].socketId;
              io.to(roomId).emit("systemMessage", `${room.participants[0].username} is now the admin`);
            } else {
              room.adminId = null;
            }
          }

          io.to(roomId).emit("participantsUpdate", { participants: room.participants, adminId: room.adminId });
          io.to(roomId).emit("systemMessage", `${leaving.username} left the room`);
        }
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
            room.timer.timeLeft = 5*60;
          } else {
            room.timer.phase = "Study Time";
            room.timer.timeLeft = 25*60;
            if (room.currentSession < room.totalSessions) room.currentSession++;
          }
          io.to(roomId).emit("sessionUpdate", { currentSession: room.currentSession, totalSessions: room.totalSessions });
        }
        io.to(roomId).emit("timerUpdate", room.timer);
      }
    }
  }, 1000);

  return io;
}

module.exports = { initSocket };
