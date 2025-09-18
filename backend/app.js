const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");

dotenv.config(); // Load environment variables

const app = express();

// Middleware
app.use(express.json());
app.use(passport.initialize());
require("./middleware/passport");

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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
