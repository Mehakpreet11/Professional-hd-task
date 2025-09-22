const express = require("express");
const router = express.Router();
const { resetDB, seedDB } = require("../testUtils");

// simple health for CI/wait-on
router.get("/health", (_req, res) => res.json({ ok: true }));

// wipe all data
router.post("/reset", async (_req, res) => {
  try {
    await resetDB();
    res.sendStatus(204);
  } catch (e) {
    console.error("[TEST] reset error", e);
    res.status(500).json({ error: "reset_failed" });
  }
});

// load deterministic fixtures
router.post("/seed", async (_req, res) => {
  try {
    await seedDB();
    res.sendStatus(204);
  } catch (e) {
    console.error("[TEST] seed error", e);
    res.status(500).json({ error: "seed_failed" });
  }
});

module.exports = router;
