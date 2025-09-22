const express = require("express");
const passport = require("passport");
const { postMessage, getMessages } = require("../controllers/chatController");
const { messageValidator } = require("../validators/messageValidators");
const validate = require("../middleware/validationHandler");

const router = express.Router();

// Protect all chat routes with JWT
// Post Message (with validation + sanitization)
router.post(
  "/rooms/:id/messages",
  passport.authenticate("jwt", { session: false }),
  messageValidator,
  validate,
  postMessage
);

// Get Messages
router.get(
  "/rooms/:id/messages",
  passport.authenticate("jwt", { session: false }),
  getMessages
);

module.exports = router;
