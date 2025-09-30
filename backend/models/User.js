const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // don’t return password by default
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    profile: {
      fullName: { type: String, trim: true },
      avatar: { type: String }, // could store URL or file reference
      bio: { type: String, maxlength: 200 },
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    lastLogin: {
      type: Date,
    },
    // Study tracking
    totalSessions: {
      type: Number,
      default: 0
    },
    totalMinutesStudied: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    lastStudyDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true } // adds createdAt & updatedAt
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;