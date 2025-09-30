// Show/hide Room Code field based on Privacy
const privacySelect = document.getElementById("privacy");
const roomCodeDiv = document.getElementById("roomCodeDiv");

privacySelect.addEventListener("change", () => {
  if (privacySelect.value === "private") {
    roomCodeDiv.style.display = "block";
  } else {
    roomCodeDiv.style.display = "none";
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

// Create Room form submission
document.getElementById("createRoomForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in first.");
    window.location.href = "/login.html";
    return;
  }

  const privacy = document.getElementById("privacy").value;
  const roomCode = document.getElementById("roomCode").value.trim();

  // Validate that private rooms have a code
  if (privacy === "private" && !roomCode) {
    alert("Please enter a room code for private rooms.");
    return;
  }

  const roomData = {
    name: document.getElementById("roomName").value.trim(),
    studyInterval: parseInt(document.getElementById("studyInterval").value),
    breakInterval: parseInt(document.getElementById("breakInterval").value),
    privacy: privacy,
    code: roomCode || null
  };

  try {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(roomData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create room");
    
    console.log("Room created:", data);

    // Get the room ID 
    const roomId = data.roomId || data._id || data.id;

    // IMPORTANT: Store room code in localStorage for creator (auto-join without prompt)
    if (privacy === "private" && roomCode) {
      localStorage.setItem(`roomCode_${roomId}`, roomCode);
    }

    alert(`Room "${data.name}" created successfully!`);
    window.location.href = `/room.html?id=${roomId}`;

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});