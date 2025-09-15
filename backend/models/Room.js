const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
      minlength: [3, "Room name must be at least 3 characters long"],
      maxlength: [50, "Room name cannot exceed 50 characters"],
      unique: true,
    },
    creator: {
      type: String, // changed from ObjectId to string for testing
      required: [true, "Room must have a creator"],
    },
    participants: [
      {
        type: String, // changed from ObjectId to string for testing
      },
    ],
    timer: {
      state: {
        type: String,
        enum: ["running", "paused", "stopped"],
        default: "stopped",
      },
      duration: {
        type: Number, // study time in minutes
        default: 25,
        min: [15, "Duration must be at least 15 minutes"],
        max: [120, "Duration cannot exceed 120 minutes"],
      },
      breakDuration: {
        type: Number, // break time in minutes
        default: 5,
        min: [1, "Break must be at least 1 minute"],
        max: [30, "Break cannot exceed 30 minutes"],
      },
      currentCycle: {
        type: Number,
        default: 0,
        min: [0, "Cycle cannot be negative"],
      },
    },
    isRecordingEnabled: {
      type: Boolean,
      default: false,
    },
    sessionLogs: [
      {
        startedAt: {
          type: Date,
          required: true,
        },
        endedAt: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Limit participants to 50 per room
roomSchema.path("participants").validate(function (val) {
  return val.length <= 50;
}, "A room cannot have more than 50 participants");

module.exports = mongoose.model("Room", roomSchema);
