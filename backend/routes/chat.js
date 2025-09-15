import express from "express";
import passport from "passport";
import { postMessage, getMessages } from "../controllers/chatController.js";

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

export default router;
