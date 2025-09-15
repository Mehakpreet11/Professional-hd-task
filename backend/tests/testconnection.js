const mongoose = require("mongoose");
const Room = require("../models/Room");

const MONGO_URI = "mongodb://127.0.0.1:27017/studymates"; // change DB name if needed

async function testDB() {
  try {
    await mongoose.connect(MONGO_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log("✅ MongoDB connected");

    // Create sample room
    const newRoom = new Room({
      roomName: "Physics Group",
      creator: new mongoose.Types.ObjectId(), // replace with real user ID later
      participants: [],
      timer: { state: "stopped", duration: 25, breakDuration: 5 },
    });

    await newRoom.save();
    console.log("✅ Room created:", newRoom);

    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testDB();
