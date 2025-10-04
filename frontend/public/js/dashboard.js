// Resolve API base injected by Nginx at container start
const API = window.API_BASE || 'http://localhost:5001';

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  let allRooms = [];
  let myRooms = [];
  let publicRooms = [];

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      const res = await fetch("https://studymate-nkce.onrender.com/api/rooms", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("Session expired. Please log in again.");
          localStorage.removeItem("token");
          window.location.href = "/login.html";
        }
        return;
      }

      const data = await res.json();
      allRooms = data.rooms || [];
      myRooms = data.myRooms || [];
      publicRooms = data.publicRooms || [];

      renderDashboard(data);

    } catch (err) {
      console.error("Fetch error:", err);
      alert("Could not load rooms. Please try again.");
    }
  };

  // Render dashboard
  const renderDashboard = (data) => {
    // User stats
    const username = data.username || "User";
    const sessions = data.sessions ?? 0;
    const streak = data.streak ?? 0;
    const timeStudied = data.timeStudied ?? 0;

    document.getElementById("username").textContent = username;
    document.getElementById("sessions").textContent = sessions;
    document.getElementById("streak").textContent = streak;
    document.getElementById("timeStudied").textContent = timeStudied;

    // Render rooms
    renderMyRooms(myRooms);
    renderPublicRooms(publicRooms);
  };

  // Render user's rooms (private + participated)
  const renderMyRooms = (rooms) => {
    const myRoomsSection = document.getElementById("myRoomsSection");
    const myRoomsList = document.getElementById("myRoomsList");

    if (!rooms || rooms.length === 0) {
      myRoomsSection.style.display = "none";
      return;
    }

    myRoomsSection.style.display = "block";
    myRoomsList.innerHTML = "";

    rooms.forEach(room => {
      const div = createRoomElement(room);
      myRoomsList.appendChild(div);
    });
  };

  // Render public rooms or search results
  const renderPublicRooms = (rooms) => {
    const publicRoomsList = document.getElementById("publicRoomsList");

    if (!rooms || rooms.length === 0) {
      publicRoomsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No public rooms available right now.</p>
          <p class="small">Create one to get started!</p>
        </div>
      `;
      return;
    }

    publicRoomsList.innerHTML = "";
    rooms.forEach(room => {
      const div = createRoomElement(room);
      publicRoomsList.appendChild(div);
    });
  };

  // Render search results
  const renderSearchResults = (results) => {
    const searchResultsSection = document.getElementById("searchResultsSection");
    const searchResultsList = document.getElementById("searchResultsList");
    const searchResultsTitle = document.getElementById("searchResultsTitle");

    searchResultsSection.style.display = "block";
    searchResultsTitle.textContent = `🔍 Search Results (${results.length})`;

    if (results.length === 0) {
      searchResultsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">😕</div>
          <p>No rooms found matching your search.</p>
          <p class="small">Try a different search term.</p>
        </div>
      `;
      return;
    }

    searchResultsList.innerHTML = "";
    results.forEach(room => {
      const div = createRoomElement(room);
      searchResultsList.appendChild(div);
    });
  };

  // Create room element
  const createRoomElement = (room) => {
    const div = document.createElement("div");
    div.className = "room-item";

    const privacyBadge = room.privacy === "private"
      ? '<span class="room-badge badge-private">🔒 Private</span>'
      : '<span class="room-badge badge-public">🌍 Public</span>';

    div.innerHTML = `
      <div>
        <strong>${room.name}</strong>
        ${privacyBadge}
        <span class="${room.status === 'active' ? 'status-active' : 'status-ended'}">
          ${room.status === 'active' ? '● Active' : '○ Ended'}
        </span>
        <div class="small text-muted mt-1">
          👥 ${room.participants?.length || 0} participants • 
          Created by ${room.creator?.username || "Unknown"}
        </div>
      </div>
      <button class="join-btn" data-id="${room._id}">
        ${room.status === "active" ? "Join" : "View"}
      </button>
    `;

    // Add click listener
    div.querySelector(".join-btn").addEventListener("click", () => {
      window.location.href = `/room.html?id=${room._id}`;
    });

    return div;
  };

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  let searchTimeout;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);

    const query = e.target.value.trim().toLowerCase();

    if (!query) {
      // If search is empty, hide search results
      document.getElementById("searchResultsSection").style.display = "none";
      return;
    }

    // Debounce search
    searchTimeout = setTimeout(() => {
      const results = allRooms.filter(room =>
        room.name.toLowerCase().includes(query) ||
        room.creator?.username?.toLowerCase().includes(query)
      );

      renderSearchResults(results);
    }, 300);
  });

  // Initial fetch
  await fetchDashboard();

  // Auto-refresh every 30s
  setInterval(fetchDashboard, 30000);

  // Create room button
  document.getElementById("createRoomBtn").addEventListener("click", () => {
    window.location.href = "/createRoom.html";
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  });
});