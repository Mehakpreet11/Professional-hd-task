const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Chat = require("./models/Chat");
const Room = require("./models/Room");
const roomController = require("./controllers/roomController");
const sanitizeMessage = require("./utils/sanitizeMessage");

function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });
  const rooms = {};

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: token missing"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = {
        id: decoded.id || decoded._id,
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

    // NEW: Check room access before joining
    socket.on("checkRoomAccess", async ({ roomId }) => {
      try {
        // Fetch room from database (roomId is actually the MongoDB _id)
        const dbRoom = await Room.findById(roomId);
        
        if (!dbRoom) {
          return socket.emit("roomAccessDenied", { 
            reason: "Room not found" 
          });
        }

        // Check if room is private
        const isPrivate = dbRoom.privacy === "private";
        const isCreator = dbRoom.creator.toString() === userId.toString();

        socket.emit("roomAccessInfo", {
          roomId,
          roomName: dbRoom.name,
          isPrivate,
          isCreator,
          requiresCode: isPrivate && !isCreator
        });
      } catch (err) {
        console.error("[SOCKET] checkRoomAccess error:", err);
        socket.emit("roomAccessDenied", { 
          reason: "Failed to check room access" 
        });
      }
    });

    socket.on("joinRoom", async ({ roomId, roomCode }) => {
      try {
        const username = socket.data.user.username || "Unknown";

        // Use the controller's verification function
        const verification = await roomController.verifyRoomAccess(roomId, userId, roomCode);
        
        if (!verification.success) {
          return socket.emit("roomAccessDenied", { 
            reason: verification.reason 
          });
        }

        const dbRoom = verification.room;
        const isPrivate = dbRoom.privacy === "private";

        // Create in-memory room if it doesn't exist
        if (!rooms[roomId]) {
          rooms[roomId] = {
            creatorId: dbRoom.creator.toString(),
            participants: [],
            adminId: null,
            timer: { 
              timeLeft: (dbRoom.studyInterval || 25) * 60, 
              running: false, 
              phase: "Study Time" 
            },
            currentSession: 1,
            totalSessions: 4,
            isPrivate,
            roomCode: dbRoom.code || null,
            studyInterval: dbRoom.studyInterval || 25,
            breakInterval: dbRoom.breakInterval || 5
          };
        }
        const room = rooms[roomId];

        socket.join(roomId);

        // Send room info
        socket.emit("roomJoinSuccess", { 
          roomName: dbRoom.name, 
          roomId, 
          isPrivate: room.isPrivate 
        });

        // Add participant
        const existing = room.participants.find(p => p.userId === userId);
        if (!existing) {
          room.participants.push({ 
            socketId: socket.id, 
            userId: userId, 
            username 
          });
        } else {
          existing.socketId = socket.id;
        }

        // Restore admin if creator rejoined OR assign first participant as admin
        if (userId === room.creatorId || !room.adminId) {
          room.adminId = socket.id;
          if (userId === room.creatorId) {
            io.to(roomId).emit("systemMessage", sanitizeMessage(`${username} is back as the admin`));
          }
        }

        // Update participants list
        io.to(roomId).emit("participantsUpdate", { 
          participants: room.participants, 
          adminId: room.adminId 
        });
        io.to(roomId).emit("systemMessage", sanitizeMessage(`${username} joined the room`));

        // Load previous messages
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
        const cleanMessage = sanitizeMessage(message);
        if (!cleanMessage || cleanMessage.trim() === "") {
          return socket.emit("errorMessage", "Message blocked: invalid or unsafe content");
        }

        await Chat.create({ roomId, senderId: userId, message: cleanMessage });
        io.to(roomId).emit("newMessage", { 
          username, 
          message: cleanMessage, 
          createdAt: new Date() 
        });
      } catch (err) {
        console.error("[SOCKET] sendMessage error:", err);
        socket.emit("errorMessage", "Failed to send message");
      }
    });

    // Timer Controls
    socket.on("toggleTimer", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;
      if (socket.id !== room.adminId) {
        socket.emit("errorMessage", "Only the admin can control the timer.");
        return;
      }
      room.timer.running = !room.timer.running;
      io.to(roomId).emit("timerUpdate", room.timer);
    });

    socket.on("resetTimer", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;
      if (socket.id !== room.adminId) {
        socket.emit("errorMessage", "Only the admin can reset the timer.");
        return;
      }
      room.timer.running = false;
      room.timer.phase = "Study Time";
      room.timer.timeLeft = (room.studyInterval || 25) * 60;
      room.currentSession = 1;
      io.to(roomId).emit("timerUpdate", room.timer);
      io.to(roomId).emit("sessionUpdate", { 
        currentSession: room.currentSession, 
        totalSessions: room.totalSessions 
      });
    });

    socket.on("skipPhase", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;
      if (socket.id !== room.adminId) {
        socket.emit("errorMessage", "Only the admin can skip the phase.");
        return;
      }
      room.timer.running = false;
      if (room.timer.phase === "Study Time") {
        room.timer.phase = "Break Time";
        room.timer.timeLeft = (room.breakInterval || 5) * 60;
      } else {
        room.timer.phase = "Study Time";
        room.timer.timeLeft = (room.studyInterval || 25) * 60;
        if (room.currentSession < room.totalSessions) room.currentSession++;
      }
      io.to(roomId).emit("timerUpdate", room.timer);
      io.to(roomId).emit("sessionUpdate", { 
        currentSession: room.currentSession, 
        totalSessions: room.totalSessions 
      });
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
              if (room.adminId) {
                io.to(roomId).emit("systemMessage", sanitizeMessage(`${room.participants[0].username} is now the admin`));
              }
            }

            io.to(roomId).emit("participantsUpdate", { 
              participants: room.participants, 
              adminId: room.adminId 
            });
            io.to(roomId).emit("systemMessage", sanitizeMessage(`${leaving.username} left the room`));
          }
        }
      } catch (err) {
        console.error("[SOCKET] disconnect error:", err);
      }
    });

    socket.on("leaveRoom", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;

      const idx = room.participants.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        const [leaving] = room.participants.splice(idx, 1);

        if (room.adminId === socket.id) {
          room.adminId = room.participants.length > 0 ? room.participants[0].socketId : null;
          if (room.adminId) {
            io.to(roomId).emit("systemMessage", sanitizeMessage(`${room.participants[0].username} is now the admin`));
          }
        }

        io.to(roomId).emit("participantsUpdate", { 
          participants: room.participants, 
          adminId: room.adminId 
        });
        io.to(roomId).emit("systemMessage", sanitizeMessage(`${leaving.username} left the room`));
      }

      socket.leave(roomId);
    });
  });

  // Timer tick interval
  setInterval(() => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.timer.running) {
        room.timer.timeLeft--;
        if (room.timer.timeLeft <= 0) {
          room.timer.running = false;
          if (room.timer.phase === "Study Time") {
            room.timer.phase = "Break Time";
            room.timer.timeLeft = (room.breakInterval || 5) * 60;
          } else {
            room.timer.phase = "Study Time";
            room.timer.timeLeft = (room.studyInterval || 25) * 60;
            if (room.currentSession < room.totalSessions) room.currentSession++;
          }
          io.to(roomId).emit("sessionUpdate", { 
            currentSession: room.currentSession, 
            totalSessions: room.totalSessions 
          });
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