const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studyInterval: {
    type: Number,
    required: true,
    min: 1,
  },
  breakInterval: {
    type: Number,
    required: true,
    min: 1,
  },
  privacy: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  code: {
    type: String,
    required: function () { return this.privacy === "private"; },
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  status: {
    type: String,
    enum: ["active", "ended"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Room", RoomSchema);
