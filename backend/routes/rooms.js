const express = require("express");
const router = express.Router();
const passport = require("../middleware/passport");
const roomController = require("../controllers/roomController");

// Protect routes with JWT
const auth = passport.authenticate("jwt", { session: false });

// Create Room
router.post("/", auth, roomController.createRoom);

// Get Rooms
router.get("/", auth, roomController.getRooms);

// Get Room by Id
router.get("/:id",  auth, roomController.getRoomById); 
module.exports = router;
