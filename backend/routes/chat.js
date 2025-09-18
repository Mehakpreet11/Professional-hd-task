const express = require("express");
const passport = require("passport");
const { postMessage, getMessages } = require("../controllers/chatController");

const router = express.Router();

// Protect all chat routes with JWT
router.post(
  "/rooms/:id/messages",
  passport.authenticate("jwt", { session: false }),
  postMessage
);

router.get(
  "/rooms/:id/messages",
  passport.authenticate("jwt", { session: false }),
  getMessages
);

module.exports = router;
