const Room = require("../models/Room");

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const { name, studyInterval, breakInterval, privacy, code } = req.body;

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
      name:room.name,
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
    const rooms = await Room.find({
      $or: [{ privacy: "public" }, { participants: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .populate("creator", "username");

    res.json({
      username: req.user.username,   // 👈 Add logged-in user info
      rooms,
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

    // Only allow participants or public rooms
    if (room.privacy === "private" && !room.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

