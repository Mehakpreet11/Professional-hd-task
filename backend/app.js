const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");
const cors = require("cors"); // ADD THIS
const testRouter = require("./routes/test")
const http = require("http");
const { initSocket } = require("./socket");

dotenv.config(); // Load environment variables

const app = express();

// CORS Configuration - ADD THIS BEFORE OTHER MIDDLEWARE
app.use(cors({
  origin: [
    'https://study-mate-9eun.vercel.app',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:5173',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
  res.redirect("/dashboard.html");
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
const io = initSocket(server);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});