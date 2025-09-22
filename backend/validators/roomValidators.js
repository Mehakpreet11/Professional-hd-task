const { body } = require("express-validator");

exports.createRoomValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Room name is required")
    .isLength({ max: 50 }).withMessage("Room name max 50 chars"),
];
