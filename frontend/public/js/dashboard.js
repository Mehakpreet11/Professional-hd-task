// =======================
// dashboard.js
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  // Fetch dashboard/rooms
  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/rooms", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) { // Unauthorized
          alert("Session expired. Please log in again.");
          localStorage.removeItem("token");
          window.location.href = "/login.html";
        } else {
          console.warn("Failed to fetch rooms, status:", res.status);
        }
        return;
      }

      const data = await res.json();
      renderDashboard(data);

    } catch (err) {
      console.error("Fetch error:", err);
      alert("Could not load rooms. Please try again.");
    }
  };

  // Render user + rooms
  const renderDashboard = (data) => {
    // Backend may return { username, sessions, streak, rooms: [...] } or just array
    const username = data.username || "User";
    const sessions = data.sessions ?? 0;
    const streak = data.streak ?? 0;
    const timeStudied = data.timeStudied ?? 0;

    document.getElementById("username").textContent = username;
    document.getElementById("sessions").textContent = sessions;
    document.getElementById("streak").textContent = streak;
    document.getElementById("timeStudied").textContent = timeStudied;

    const rooms = data.rooms || data;

    const roomsList = document.getElementById("roomsList");
    roomsList.innerHTML = "";

    (rooms || []).forEach(room => {
      const div = document.createElement("div");
      div.className = "room-item";
      div.innerHTML = `
        <div>
          <strong>${room.name}</strong> (${room.participants?.length || 0} participants)
          <span class="${room.status === 'active' ? 'status-active' : 'status-ended'}">
            ${room.status === 'active' ? 'Active' : 'Ended'}
          </span>
          <div class="small text-muted">Created by: ${room.creator?.username || "Unknown"}</div>
        </div>
        <button class="rejoin-btn" data-id="${room._id}">
          ${room.status === "active" ? "Join" : "View"}
        </button>
      `;
      roomsList.appendChild(div);
    });

    document.querySelectorAll(".rejoin-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const roomId = btn.dataset.id;
        window.location.href = `/room.html?id=${roomId}`;
      });
    });
  };

  // Initial fetch
  await fetchDashboard();

  // Auto-refresh every 30s
  setInterval(fetchDashboard, 30000);

  // Create room redirect
  document.getElementById("createRoomBtn").addEventListener("click", () => {
    window.location.href = "/createRoom.html";
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  });

  // Join room input
  document.getElementById("joinRoomBtn").addEventListener("click", () => {
    const roomCode = document.getElementById("roomCode").value.trim();
    if (!roomCode) return alert("Please enter a room code");
    window.location.href = `/room.html?id=${roomCode}`;
  });
});