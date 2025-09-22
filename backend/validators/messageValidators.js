const { body } = require("express-validator");

exports.messageValidator = [
  body("content")
    .trim()
    .escape() // sanitizes <script> etc.
    .notEmpty().withMessage("Message cannot be empty")
    .isLength({ max: 500 }).withMessage("Message too long (max 500 chars)"),
];
