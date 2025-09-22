const mongoose = require("mongoose");
const User = require("./models/User");
const Room = require("./models/Room");
const Chat = require("./models/Chat");

async function resetDB() {
  const { connection } = mongoose;
  const colls = await connection.db.listCollections().toArray();
  // drop existing collections to reset indexes too
  for (const c of colls) {
    await connection.db.dropCollection(c.name).catch(() => {});
  }
}

async function seedDB() {
  // 1) test user (pre-save hook hashes password)
  const testUser = new User({
    username: "testuser",
    email: "test@example.com",
    password: "Passw0rd!",
    role: "user"
  });
  await testUser.save();

  // 2) one public room
  const publicRoom = await new Room({
    name: "Public Room A",
    creator: testUser._id,
    studyInterval: 25,
    breakInterval: 5,
    privacy: "public",
    participants: [testUser._id]
  }).save();

  // 3) one private room
  const privateRoom = await new Room({
    name: "Private Room X",
    creator: testUser._id,
    studyInterval: 25,
    breakInterval: 5,
    privacy: "private",
    code: "1234",
    participants: [testUser._id]
  }).save();

  // 4) a couple of chat messages in public room
  await Chat.create([
    { roomId: publicRoom._id, senderId: testUser._id, message: "hi team" },
    { roomId: publicRoom._id, senderId: testUser._id, message: "ready to study" }
  ]);

  return { testUser, publicRoom, privateRoom };
}

module.exports = { resetDB, seedDB };
