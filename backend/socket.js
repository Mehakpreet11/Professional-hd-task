const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Chat = require("./models/Chat");
const Room = require("./models/Room");
const roomController = require("./controllers/roomController");
const sanitizeMessage = require("./utils/sanitizeMessage");

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
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


    // Send room data to client
    socket.on("getRoomData", async ({ roomId }) => {
      try {
        const dbRoom = await Room.findById(roomId).populate("creator", "username");
        if (!dbRoom) return socket.emit("errorMessage", "Room not found");

        const room = rooms[roomId];
        if (!room) return socket.emit("errorMessage", "Room not active");

        const adminParticipant = room.participants.find(p => p.socketId === room.adminId);

        socket.emit("roomData", {
          name: dbRoom.name,
          creatorUsername: dbRoom.creator.username,
          isPrivate: dbRoom.privacy === "private",
          code: dbRoom.code,
          createdAt: dbRoom.createdAt,
          studyInterval: dbRoom.studyInterval,
          breakInterval: dbRoom.breakInterval,
          participants: room.participants,
          adminSocketId: room.adminId,
          adminUsername: adminParticipant?.username || "Unknown",
          isCreator: dbRoom.creator._id.toString() === userId.toString(),
          currentUserId: userId,
          completedSessions: 0 // You can add this to Room model if needed
        });
      } catch (err) {
        console.error("[SOCKET] getRoomData error:", err);
        socket.emit("errorMessage", "Failed to get room data");
      }
    });

    // Update room name (admin only)
    socket.on("updateRoomName", async ({ roomId, name }) => {
      try {
        const room = rooms[roomId];
        if (!room) return socket.emit("errorMessage", "Room not found");

        if (socket.id !== room.adminId) {
          return socket.emit("errorMessage", "Only admin can change room name");
        }

        const dbRoom = await Room.findById(roomId);
        if (!dbRoom) return socket.emit("errorMessage", "Room not found");

        dbRoom.name = name.trim();
        await dbRoom.save();

        io.to(roomId).emit("roomNameUpdated", { name: dbRoom.name });
        io.to(roomId).emit("systemMessage", sanitizeMessage(`Room name changed to "${dbRoom.name}"`));
      } catch (err) {
        console.error("[SOCKET] updateRoomName error:", err);
        socket.emit("errorMessage", "Failed to update room name");
      }
    });

    // Update timer intervals (admin only)
    socket.on("updateTimerIntervals", async ({ roomId, studyInterval, breakInterval }) => {
      try {
        const room = rooms[roomId];
        if (!room) return socket.emit("errorMessage", "Room not found");

        if (socket.id !== room.adminId) {
          return socket.emit("errorMessage", "Only admin can change timer intervals");
        }

        const dbRoom = await Room.findById(roomId);
        if (!dbRoom) return socket.emit("errorMessage", "Room not found");

        dbRoom.studyInterval = studyInterval;
        dbRoom.breakInterval = breakInterval;
        await dbRoom.save();

        // Update in-memory room
        room.studyInterval = studyInterval;
        room.breakInterval = breakInterval;

        io.to(roomId).emit("timerIntervalsUpdated", { studyInterval, breakInterval });
        io.to(roomId).emit("systemMessage", sanitizeMessage(`Timer updated: ${studyInterval}min study / ${breakInterval}min break`));
      } catch (err) {
        console.error("[SOCKET] updateTimerIntervals error:", err);
        socket.emit("errorMessage", "Failed to update timer intervals");
      }
    });

    // Update room password (creator only, private rooms)
    socket.on("updateRoomPassword", async ({ roomId, password }) => {
      try {
        const dbRoom = await Room.findById(roomId);
        if (!dbRoom) return socket.emit("errorMessage", "Room not found");

        // Only creator can change password
        if (dbRoom.creator.toString() !== userId.toString()) {
          return socket.emit("errorMessage", "Only room creator can change password");
        }

        if (dbRoom.privacy !== "private") {
          return socket.emit("errorMessage", "Only private rooms have passwords");
        }

        dbRoom.code = password.trim();
        await dbRoom.save();

        socket.emit("roomPasswordUpdated", { code: password.trim() });
        socket.emit("systemMessage", sanitizeMessage("Room password updated successfully"));
      } catch (err) {
        console.error("[SOCKET] updateRoomPassword error:", err);
        socket.emit("errorMessage", "Failed to update password");
      }
    });

    // Kick participant (admin only)
    socket.on("kickParticipant", ({ roomId, socketId }) => {
      try {
        const room = rooms[roomId];
        if (!room) return socket.emit("errorMessage", "Room not found");

        if (socket.id !== room.adminId) {
          return socket.emit("errorMessage", "Only admin can kick participants");
        }

        const participant = room.participants.find(p => p.socketId === socketId);
        if (!participant) return socket.emit("errorMessage", "Participant not found");

        // Can't kick yourself
        if (socketId === socket.id) {
          return socket.emit("errorMessage", "You cannot kick yourself");
        }

        // Remove from room
        const idx = room.participants.findIndex(p => p.socketId === socketId);
        if (idx !== -1) {
          room.participants.splice(idx, 1);
        }

        // Notify the kicked user
        io.to(socketId).emit("youWereKicked");

        // Notify room
        io.to(roomId).emit("participantKicked", { username: participant.username });
        io.to(roomId).emit("systemMessage", sanitizeMessage(`${participant.username} was kicked from the room`));
        io.to(roomId).emit("participantsUpdate", { participants: room.participants, adminId: room.adminId });

        // Force disconnect the kicked user from room
        const kickedSocket = io.sockets.sockets.get(socketId);
        if (kickedSocket) {
          kickedSocket.leave(roomId);
        }
      } catch (err) {
        console.error("[SOCKET] kickParticipant error:", err);
        socket.emit("errorMessage", "Failed to kick participant");
      }
    });

    // End room (CREATOR only - not just admin)
    socket.on("endRoom", async ({ roomId }) => {
      try {
        const room = rooms[roomId];
        if (!room) return socket.emit("errorMessage", "Room not found");

        // Check if user is the creator (not just admin)
        const dbRoom = await Room.findById(roomId);
        if (!dbRoom) return socket.emit("errorMessage", "Room not found");

        if (dbRoom.creator.toString() !== userId.toString()) {
          return socket.emit("errorMessage", "Only the room creator can end the room");
        }

        // Update database
        dbRoom.status = "ended";
        await dbRoom.save();

        // Notify all participants
        io.to(roomId).emit("roomEnded");
        io.to(roomId).emit("systemMessage", sanitizeMessage("This room has been ended by the creator"));

        // Kick everyone out
        room.participants.forEach(p => {
          const participantSocket = io.sockets.sockets.get(p.socketId);
          if (participantSocket) {
            participantSocket.leave(roomId);
          }
        });

        // Delete in-memory room
        delete rooms[roomId];
      } catch (err) {
        console.error("[SOCKET] endRoom error:", err);
        socket.emit("errorMessage", "Failed to end room");
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
              if (room.adminId) {
                io.to(roomId).emit("systemMessage", sanitizeMessage(`${room.participants[0].username} is now the admin`));
              }
            }

            // AUTO-END: If room is now empty, end it
            if (room.participants.length === 0) {
              console.log(`[SOCKET] Room ${roomId} is empty, ending...`);
              Room.findByIdAndUpdate(roomId, { status: "ended" }).catch(console.error);
              delete rooms[roomId];
              return; // No need to emit to empty room
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

        // AUTO-END: If room is now empty, end it
        if (room.participants.length === 0) {
          console.log(`[SOCKET] Room ${roomId} is empty, ending...`);
          Room.findByIdAndUpdate(roomId, { status: "ended" }).catch(console.error);
          delete rooms[roomId];
          return; // No need to emit to empty room
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
  setInterval(async () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.timer.running) {
        room.timer.timeLeft--;
        if (room.timer.timeLeft <= 0) {
          room.timer.running = false;

          if (room.timer.phase === "Study Time") {
            //  STUDY SESSION COMPLETED - Update all participants
            try {
              const studyMinutes = room.studyInterval || 25;

              for (const participant of room.participants) {
                const user = await User.findById(participant.userId);
                if (user) {
                  // Increment sessions and minutes
                  user.totalSessions += 1;
                  user.totalMinutesStudied += studyMinutes;

                  // Calculate streak (consecutive days)
                  const today = new Date().setHours(0, 0, 0, 0);
                  const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate).setHours(0, 0, 0, 0) : null;

                  if (!lastStudy) {
                    // First time studying
                    user.currentStreak = 1;
                  } else if (today > lastStudy) {
                    // Studied on a different day
                    const oneDayAgo = today - (24 * 60 * 60 * 1000);
                    if (lastStudy === oneDayAgo) {
                      // Yesterday - continue streak
                      user.currentStreak += 1;
                    } else {
                      // Missed days - reset streak
                      user.currentStreak = 1;
                    }
                  }
                  // If studying same day, don't change streak

                  user.lastStudyDate = new Date();
                  await user.save();
                }
              }

              // Notify participants of their progress
              io.to(roomId).emit("systemMessage", sanitizeMessage(`Study session completed! +${studyMinutes} minutes logged`));
            } catch (err) {
              console.error("[SOCKET] Error updating user stats:", err);
            }

            room.timer.phase = "Break Time";
            room.timer.timeLeft = (room.breakInterval || 5) * 60;
          } else {
            // Break ended
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