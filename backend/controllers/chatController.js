import Chat from "../models/Chat.js";

// POST /api/rooms/:id/messages → create a new message
export const postMessage = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const { message } = req.body;
    const senderId = req.user._id; // from passport JWT auth

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const chatMessage = new Chat({ roomId, senderId, message });
    await chatMessage.save();

    res.status(201).json({ message: "Message sent", chat: chatMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/rooms/:id/messages → fetch recent messages
export const getMessages = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50; // default 50 messages

    const messages = await Chat.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "username"); // get sender username

    res.json({ messages: messages.reverse() }); // oldest first
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
