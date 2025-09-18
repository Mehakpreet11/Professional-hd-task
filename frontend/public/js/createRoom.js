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

  const roomData = {
    name: document.getElementById("roomName").value.trim(),
    studyInterval: parseInt(document.getElementById("studyInterval").value),
    breakInterval: parseInt(document.getElementById("breakInterval").value),
    privacy: document.getElementById("privacy").value,
    code: document.getElementById("roomCode").value.trim() || null
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
    console.log(data);
    alert(`Room "${data.name}" created successfully!`);
    window.location.href = `/room.html?id=${data.roomId}`;

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});