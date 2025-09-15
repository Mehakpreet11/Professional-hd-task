// testTimer.js
const mongoose = require("mongoose");
const Timer = require("../models/Timer");

const MONGO_URI = "mongodb://127.0.0.1:27017/studymates";

async function testTimer() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ MongoDB connected");

    const now = new Date();
    const durationMinutes = 25;

    // Create timer
    const timer = new Timer({
      roomId: new mongoose.Types.ObjectId(), // replace with real room later
      phase: "study",
      startAt: now,
      duration: durationMinutes,
      isActive: true,
      expireAt: new Date(now.getTime() + durationMinutes * 60000),
    });

    await timer.save();
    console.log("✅ Timer created:", timer);

    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testTimer();
