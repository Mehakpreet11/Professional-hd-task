const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");
const testRouter = require("./routes/test")
const http = require("http");
const { initSocket } = require("./socket");

dotenv.config(); // Load environment variables

const app = express();

// Middleware
app.use(express.json());
app.use(passport.initialize());
require("./middleware/passport");
app.get("/health", (_req, res) => res.json({ ok: true }));

// mount test-only utilities
if (process.env.NODE_ENV === "test") {
  app.use("/test", testRouter);
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const roomsRoutes = require("./routes/rooms");
const chatRoutes = require("./routes/chat");

// Redirect root URL to dashboard
app.get("/", (req, res) => {
  res.redirect("/dashboard.html"); // dashboard.html if user token in locla storage
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/chat", chatRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

  // Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = initSocket(server); // attach socket to the HTTP server

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});