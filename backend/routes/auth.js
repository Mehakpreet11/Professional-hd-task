// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const passport = require("passport");
const authController = require("../controllers/authController");
const { registerValidator } = require("../validators/authValidators");
const validate = require("../middleware/validationHandler");

// Register route with validation
router.post("/register",registerValidator,validate, authController.register);
router.post("/login", authController.login);

// Protected route example
router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  authController.getProfile
);

module.exports = router;