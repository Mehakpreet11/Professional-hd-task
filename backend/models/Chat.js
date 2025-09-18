const mongoose = require("mongoose");

// Chat schema: stores messages per room
const chatSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500, // basic length limit
    },
  },
  { timestamps: true } // adds createdAt & updatedAt
);

// Index to quickly fetch recent messages per room
chatSchema.index({ roomId: 1, createdAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
