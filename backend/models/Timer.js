// models/Timer.js
const mongoose = require("mongoose");

const timerSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Timer must belong to a room"],
    },
    phase: {
      type: String,
      enum: ["study", "break"],
      required: [true, "Timer phase is required"],
      default: "study",
    },
    startAt: {
      type: Date,
      required: [true, "Timer start time is required"],
      default: Date.now,
    },
    duration: {
      type: Number, // in minutes
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 minute"],
      max: [180, "Duration cannot exceed 180 minutes"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // For auto-cleanup: remove timer doc X minutes after startAt
    expireAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index: MongoDB will auto-delete after expireAt time
timerSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Timer", timerSchema);
