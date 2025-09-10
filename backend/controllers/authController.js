// backend/controllers/authController.js
// Placeholder functions until user model + logic is ready

exports.register = async (req, res) => {
  try {
    res.status(200).json({ message: "Register endpoint working" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    res.status(200).json({ message: "Login endpoint working" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
