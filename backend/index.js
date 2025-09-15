// index.js (entry point for backend)
const mongoose = require("mongoose");
const Room = require("./models/Room");
const Timer = require("./models/Timer");

const MONGO_URI = "mongodb://127.0.0.1:27017/studymates";

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ DB connected");

  // 1. Create Room
  const room = await Room.create({
    roomName: "Chemistry Group",
    creator: new mongoose.Types.ObjectId(),
    participants: [],
  });

  console.log("Room created:", room);

  // 2. Create Timer linked to that room
  const now = new Date();
  const duration = 25;
  const timer = await Timer.create({
    roomId: room._id,
    phase: "study",
    startAt: now,
    duration,
    isActive: true,
    expireAt: new Date(now.getTime() + duration * 60000),
  });

  console.log("Timer created:", timer);

  await mongoose.disconnect();
  console.log("🔌 DB disconnected");
}

main().catch((err) => console.error(err));
