const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Room = require("./models/Room");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB connection
const MONGO_URI = "mongodb://127.0.0.1:27017/studymates";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" DB connection error:", err));

// Root route
app.get("/", (req, res) => {
  res.send("Server is running. Use /api/rooms to create rooms.");
});

// POST /api/rooms -> Create a new room
app.post("/api/rooms", async (req, res) => {
  try {
    const { roomName, creatorId } = req.body;

    if (!roomName || !creatorId) {
      return res.status(400).json({ error: "Room name and creator ID are required" });
    }

    const newRoom = await Room.create({
      roomName,
      creator: creatorId,        // string ID
      participants: [creatorId], // string ID
    });

    const roomLink = `${req.protocol}://${req.get("host")}/rooms/${newRoom._id}`;

    res.status(201).json({
      message: "Room created successfully",
      roomId: newRoom._id,
      roomLink,
    });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /rooms/:id -> View room details
app.get("/rooms/:id", async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).send("Room not found");
    }

    res.send(`
      <h1>Room: ${room.roomName}</h1>
      <p>Creator: ${room.creator}</p>
      <p>Participants: ${room.participants.join(", ")}</p>
      <p>Timer State: ${room.timer.state}, Duration: ${room.timer.duration} min, Break: ${room.timer.breakDuration} min</p>
      <p>Recording Enabled: ${room.isRecordingEnabled}</p>
    `);
  } catch (err) {
    console.error("Error fetching room:", err);
    res.status(500).send("Server error");
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
