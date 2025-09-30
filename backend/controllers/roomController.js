const Room = require("../models/Room");

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const { name, studyInterval, breakInterval, privacy, code } = req.body;

    // Validate room code for private rooms
    if (privacy === "private" && (!code || code.trim() === "")) {
      return res.status(400).json({
        message: "Room code is required for private rooms"
      });
    }

    const roomData = {
      name,
      creator: req.user._id,
      studyInterval,
      breakInterval,
      privacy,
      code: privacy === "private" ? code : null,
      participants: [req.user._id],
    };

    const room = new Room(roomData);
    await room.save();

    res.status(201).json({
      name: room.name,
      success: true,
      roomId: room._id,
      message: "Room created successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all rooms (for dashboard listing)
exports.getRooms = async (req, res) => {
  try {
    // Get all active rooms for search functionality
    const allActiveRooms = await Room.find({ status: "active" })
      .sort({ createdAt: -1 })
      .populate("creator", "username")
      .select("-code"); // NEVER send room codes to frontend

    // Only show public active rooms in main listing
    const publicRooms = allActiveRooms.filter(r => r.privacy === "public");

    // User's rooms (both public and private, any status)
    const myRooms = await Room.find({
      $or: [
        { creator: req.user._id },
        { participants: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("creator", "username")
      .select("-code");

    res.json({
      username: req.user.username,
      sessions: req.user.totalSessions || 0,
      streak: req.user.currentStreak || 0,
      timeStudied: req.user.totalMinutesStudied || 0,
      publicRooms,
      myRooms,
      rooms: allActiveRooms
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get single room by ID
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("participants", "username");

    if (!room) return res.status(404).json({ message: "Room not found" });

    // Check privacy - but DON'T reveal room code!
    if (room.privacy === "private") {
      const isParticipant = room.participants.some(
        p => p._id.toString() === req.user._id.toString()
      );

      const isCreator = room.creator.toString() === req.user._id.toString();

      if (!isParticipant && !isCreator) {
        return res.status(403).json({
          message: "Access denied",
          isPrivate: true  // Let client know it's private
        });
      }
    }

    // Return room data but NEVER expose the code in the response
    const roomData = room.toObject();
    delete roomData.code; // Remove code from response for security

    res.json(roomData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// NEW: Verify room code (called by socket.io)
exports.verifyRoomAccess = async (roomId, userId, roomCode = null) => {
  try {
    const room = await Room.findById(roomId);

    if (!room) {
      return { success: false, reason: "Room not found" };
    }

    // Public rooms - always allow
    if (room.privacy === "public") {
      return { success: true, room };
    }

    // Private rooms - check creator or code
    const isCreator = room.creator.toString() === userId.toString();

    if (isCreator) {
      return { success: true, room };
    }

    // Non-creator must provide correct code
    if (!roomCode || room.code !== roomCode) {
      return { success: false, reason: "Incorrect room code" };
    }

    // Valid code - add user to participants if not already there
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      await room.save();
    }

    return { success: true, room };

  } catch (err) {
    console.error("verifyRoomAccess error:", err);
    return { success: false, reason: "Server error" };
  }
};