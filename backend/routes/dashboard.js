const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = req.user; // Passport adds `user` to req
    const dashboardData = {
      username: user.username,
      sessions: 12,
      streak: 5,
      timeStudied: 340
    };
    res.json(dashboardData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
