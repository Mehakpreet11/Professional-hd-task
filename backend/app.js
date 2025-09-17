const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");

dotenv.config(); // load .env

const app = express();

app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(express.json());
app.use(passport.initialize());
require("./middleware/passport");

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
const chatRoutes = require("./routes/chat");
app.use("/api/chat", chatRoutes);

// Basic test route
app.get("/", (req, res) => {
  res.send("StudyMate API is running ");
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
