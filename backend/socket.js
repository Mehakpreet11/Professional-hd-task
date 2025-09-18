// socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  // authenticate socket connections with JWT passed in handshake.auth.token
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
    socket.emit("connected", { socketId: socket.id, user: socket.data.user });

    socket.on("disconnect", (reason) => {
      console.log(`[SOCKET] Disconnected: ${socket.id} reason=${reason}`);
    });
  });

  return io;
}

module.exports = { initSocket };
