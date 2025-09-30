const express = require("express");
const router = express.Router();
const passport = require("../middleware/passport");
const roomController = require("../controllers/roomController");
const { createRoomValidator } = require("../validators/roomValidators");
const validate = require("../middleware/validationHandler");

// Protect routes with JWT
const auth = passport.authenticate("jwt", { session: false });

// Create Room (with validation)
router.post("/", auth, createRoomValidator, validate, roomController.createRoom);

// Get Rooms (for dashboard)
router.get("/", auth, roomController.getRooms);

// Get Room by Id
router.get("/:id", auth, roomController.getRoomById);

module.exports = router;