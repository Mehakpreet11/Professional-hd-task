document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");
  let username = "";
  let roomData = null;
  let isAdmin = false;
  let isCreator = false;
  let currentUserId = null;
  let socket;

  const messagesEl = document.getElementById("chatMessages");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const participantsEl = document.getElementById("participantsList");
  const participantsHeader = document.querySelector(".participants-section h5");

  const timerDisplay = document.getElementById("timerDisplay");
  const phaseIndicator = document.getElementById("phaseIndicator");
  const currentSessionEl = document.getElementById("currentSession");
  const totalSessionsEl = document.getElementById("totalSessions");

  const playBtn = document.getElementById("playBtn");
  const resetBtn = document.getElementById("resetBtn");
  const skipBtn = document.getElementById("skipBtn");

  const leaveBtn = document.getElementById("leaveBtn");

  // Add copy link button functionality
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      const roomUrl = window.location.href;
      navigator.clipboard.writeText(roomUrl).then(() => {
        const originalText = copyLinkBtn.textContent;
        copyLinkBtn.textContent = "✓ Copied!";
        copyLinkBtn.style.background = "#059669";
        setTimeout(() => {
          copyLinkBtn.textContent = originalText;
          copyLinkBtn.style.background = "";
        }, 2000);
      }).catch(err => {
        console.error("Failed to copy:", err);
        alert("Failed to copy link. Please copy manually: " + roomUrl);
      });
    });
  }

  if (!roomId) {
    alert("Invalid room URL");
    window.location.href = "/dashboard.html";
    return;
  }

  async function fetchUserAndConnect() {
    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "/login.html";

    try {
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      username = data.user?.username || "";
      connectSocket(token);
    } catch {
      window.location.href = "/login.html";
    }
  }

  function connectSocket(token) {
    let isAdmin = false;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    socket = io(socketUrl, { auth: { token } });

    socket.on("connect", () => {
      // First, check if we can access this room
      socket.emit("checkRoomAccess", { roomId });
    });
    addRoomManagementListeners();

    // Request room data after joining
    socket.on("roomJoinSuccess", ({ roomName, roomId: joinedRoomId, isPrivate }) => {
      console.log(`Successfully joined room: ${roomName}`);
      socket.emit("getRoomData", { roomId }); // Request full room data
    });

    // Handle room access info
    socket.on("roomAccessInfo", ({ roomName, isPrivate, isCreator, requiresCode }) => {
      document.getElementById("roomName").textContent = roomName;

      let roomCode = null;

      // If room requires code and user is not creator
      if (requiresCode) {
        // Check localStorage for saved code
        const storageKey = `roomCode_${roomId}`;
        roomCode = localStorage.getItem(storageKey);

        // If no saved code, prompt user
        if (!roomCode) {
          roomCode = prompt("This is a private room. Enter the room code:");

          if (!roomCode) {
            alert("Room code is required to join this room!");
            window.location.href = "/dashboard.html";
            return;
          }

          // Save code to localStorage for future visits
          localStorage.setItem(storageKey, roomCode);
        }
      }

      // Attempt to join the room
      socket.emit("joinRoom", { roomId, roomCode });
    });

    // Handle access denied
    socket.on("roomAccessDenied", ({ reason }) => {
      alert(reason || "Access denied!");

      // Clear any saved room code (it was wrong)
      localStorage.removeItem(`roomCode_${roomId}`);

      // Redirect back to dashboard
      window.location.href = "/dashboard.html";
    });

    // Handle successful join
    socket.on("roomJoinSuccess", ({ roomName, roomId: joinedRoomId, isPrivate }) => {
      console.log(`Successfully joined room: ${roomName}`);
    });

    // Participants
    socket.on("participantsUpdate", ({ participants, adminId }) => {
      participantsEl.innerHTML = "";
      participants.forEach(p => {
        const div = document.createElement("div");
        div.className = "participant";
        const color = "#3B82F6";
        const initial = p.username?.[0] || "?";
        div.innerHTML = `
          <div class="participant-avatar" style="background:${color}">${initial}</div>
          <div class="participant-name">
            ${p.username || "Unknown"}${p.socketId === socket.id ? " (You)" : ""}${p.socketId === adminId ? " ★" : ""}
          </div>
        `;
        participantsEl.appendChild(div);
      });
      participantsHeader.textContent = `Participants (${participants.length})`;
      isAdmin = socket.id === adminId;
      // Update room data if exists
      if (roomData) {
        roomData.participants = participants;
        roomData.adminSocketId = adminId;
        const adminP = participants.find(p => p.socketId === adminId);
        if (adminP) roomData.adminUsername = adminP.username;
      }

      // Enable/disable timer buttons based on admin status
      [playBtn, skipBtn, resetBtn].forEach(btn => {
        if (btn) btn.disabled = !isAdmin;
      });
    });

    // Messages
    socket.on("systemMessage", text => {
      const div = document.createElement("div");
      div.className = "system-message";
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    socket.on("newMessage", ({ username: sender, message }) => {
      const color = sender === username ? "#059669" : "#3B82F6";
      addUserMessage(sender, message, color, sender?.[0] || "?");
    });

    socket.on("loadMessages", messages => {
      messagesEl.innerHTML = "";
      messages.forEach(m => {
        const color = m.username === username ? "#059669" : "#3B82F6";
        addUserMessage(m.username, m.message, color, m.username?.[0] || "?");
      });
    });

    // Timer & session updates
    socket.on("timerUpdate", timer => {
      const minutes = String(Math.floor(timer.timeLeft / 60)).padStart(2, "0");
      const seconds = String(timer.timeLeft % 60).padStart(2, "0");
      timerDisplay.textContent = `${minutes}:${seconds}`;
      phaseIndicator.textContent = timer.phase;
      playBtn.textContent = timer.running ? "⏸" : "▶";
    });

    socket.on("sessionUpdate", ({ currentSession, totalSessions }) => {
      currentSessionEl.textContent = currentSession;
      totalSessionsEl.textContent = totalSessions;
    });

    // Show backend error messages
    socket.on("errorMessage", msg => {
      console.warn("Socket error:", msg);

      const div = document.createElement("div");
      div.className = "system-message blocked-message";
      div.textContent = msg;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    // Timer controls
    const flashButton = btn => {
      btn.classList.add("flash");
      setTimeout(() => btn.classList.remove("flash"), 200);
    };

    playBtn?.addEventListener("click", () => {
      socket.emit("toggleTimer", { roomId });
      flashButton(playBtn);
    });

    skipBtn?.addEventListener("click", () => {
      socket.emit("skipPhase", { roomId });
      flashButton(skipBtn);
    });

    resetBtn?.addEventListener("click", () => {
      socket.emit("resetTimer", { roomId });
      flashButton(resetBtn);
    });
  }

  function addUserMessage(sender, text, color, initial) {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `
      <div class="message-avatar" style="background:${color}">${initial}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-sender">${sender}</span>
          <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="message-text">${text}</div>
      </div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Sending messages
  sendBtn?.addEventListener("click", () => {
    const token = localStorage.getItem("token");
    const message = messageInput.value.trim();
    if (!message || !socket) return;
    socket.emit("sendMessage", { roomId, message, token });
    messageInput.value = "";
  });

  messageInput?.addEventListener("keypress", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Leave room
  leaveBtn?.addEventListener("click", () => {
    if (!socket) return;
    socket.emit("leaveRoom", { roomId });
    window.location.href = "/dashboard.html";
  });


// Open settings modal
document.getElementById("settingsBtn")?.addEventListener("click", () => {
  console.log("Settings clicked. roomData:", roomData, "isAdmin:", isAdmin);
  if (roomData) {
    populateSettingsModal();
    const modal = new bootstrap.Modal(document.getElementById("roomSettingsModal"));
    modal.show();
  } else {
    alert("Room data not loaded yet. Please try again in a moment.");
  }
});

// Populate settings modal with room data
function populateSettingsModal() {
  // Update isAdmin status from roomData
  isAdmin = roomData.adminSocketId === socket.id;
  isCreator = roomData.isCreator;
  currentUserId = roomData.currentUserId;

  // Room Info
  document.getElementById("modalRoomName").textContent = roomData.name;
  document.getElementById("modalCreator").textContent = roomData.creatorUsername;
  document.getElementById("modalCreatedDate").textContent = new Date(roomData.createdAt).toLocaleDateString();
  document.getElementById("modalPrivacy").textContent = roomData.isPrivate ? "🔒 Private" : "🌍 Public";
  document.getElementById("modalAdmin").textContent = roomData.adminUsername + " ★";
  document.getElementById("modalTotalSessions").textContent = roomData.completedSessions || 0;

  // Show room code only if creator and private
  if (isCreator && roomData.isPrivate) {
    document.getElementById("roomCodeRow").style.display = "flex";
    document.getElementById("modalRoomCode").textContent = roomData.code || "N/A";
  } else {
    document.getElementById("roomCodeRow").style.display = "none";
  }

  // Enable/disable controls based on admin status
  const controls = [
    "editRoomName",
    "editStudyInterval", 
    "editBreakInterval",
    "saveRoomNameBtn",
    "saveIntervalsBtn",
    "endRoomBtn"
  ];

  controls.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isAdmin;
  });

  // Show/hide password change for private rooms
  const passwordGroup = document.getElementById("changePasswordGroup");
  if (roomData.isPrivate && isCreator) {
    passwordGroup.style.display = "block";
    document.getElementById("newPassword").disabled = false;
    document.getElementById("savePasswordBtn").disabled = false;
  } else {
    passwordGroup.style.display = "none";
  }

  // Pre-fill current values
  document.getElementById("editRoomName").value = roomData.name;
  document.getElementById("editStudyInterval").value = roomData.studyInterval || 25;
  document.getElementById("editBreakInterval").value = roomData.breakInterval || 5;

  // Populate participants list for kicking
  populateParticipantsManage();
}

// Populate participants for management
function populateParticipantsManage() {
  const container = document.getElementById("participantsManage");
  container.innerHTML = "";

  if (!roomData.participants || roomData.participants.length === 0) {
    container.innerHTML = '<p class="text-muted small">No participants</p>';
    return;
  }

  roomData.participants.forEach(p => {
    const div = document.createElement("div");
    div.className = "participant-manage-item";
    
    const isCurrentUser = p.userId === currentUserId;
    const isCurrentAdmin = p.socketId === roomData.adminSocketId;
    
    div.innerHTML = `
      <div class="participant-manage-info">
        <div class="participant-manage-avatar" style="background: #3B82F6">${p.username?.[0] || "?"}</div>
        <span class="participant-manage-name">
          ${p.username}${isCurrentUser ? " (You)" : ""}${isCurrentAdmin ? " ★" : ""}
        </span>
      </div>
      ${!isCurrentUser && isAdmin ? `<button class="kick-btn" data-socket-id="${p.socketId}" data-username="${p.username}">Kick</button>` : ""}
    `;
    
    container.appendChild(div);
  });

  // Attach kick button listeners
  if (isAdmin) {
    container.querySelectorAll(".kick-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const socketId = btn.dataset.socketId;
        const username = btn.dataset.username;
        if (confirm(`Kick ${username} from the room?`)) {
          socket.emit("kickParticipant", { roomId, socketId });
        }
      });
    });
  }
}

// Copy room code button
document.getElementById("copyCodeBtn")?.addEventListener("click", () => {
  const code = document.getElementById("modalRoomCode").textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById("copyCodeBtn");
    const original = btn.textContent;
    btn.textContent = "✓";
    setTimeout(() => btn.textContent = original, 1500);
  });
});

// Save room name
document.getElementById("saveRoomNameBtn")?.addEventListener("click", () => {
  const newName = document.getElementById("editRoomName").value.trim();
  if (!newName) return alert("Room name cannot be empty");
  
  socket.emit("updateRoomName", { roomId, name: newName });
});

// Save timer intervals
document.getElementById("saveIntervalsBtn")?.addEventListener("click", () => {
  const study = parseInt(document.getElementById("editStudyInterval").value);
  const breakTime = parseInt(document.getElementById("editBreakInterval").value);
  
  if (study < 1 || study > 120) return alert("Study interval must be between 1-120 minutes");
  if (breakTime < 1 || breakTime > 30) return alert("Break interval must be between 1-30 minutes");
  
  socket.emit("updateTimerIntervals", { roomId, studyInterval: study, breakInterval: breakTime });
});

// Change password
document.getElementById("savePasswordBtn")?.addEventListener("click", () => {
  const newPassword = document.getElementById("newPassword").value.trim();
  if (!newPassword) return alert("Password cannot be empty");
  
  if (confirm("Are you sure you want to change the room password?")) {
    socket.emit("updateRoomPassword", { roomId, password: newPassword });
  }
});

// End room
document.getElementById("endRoomBtn")?.addEventListener("click", () => {
  if (confirm("Are you sure you want to END this room? All participants will be kicked out.")) {
    socket.emit("endRoom", { roomId });
  }
});

// Socket listeners for room updates (add these in connectSocket function)
function addRoomManagementListeners() {
  // Receive room data
  socket.on("roomData", (data) => {
    roomData = data;
    isCreator = data.isCreator;
    currentUserId = data.currentUserId;
  });

  // Room name updated
  socket.on("roomNameUpdated", ({ name }) => {
    document.getElementById("roomName").textContent = name;
    if (roomData) roomData.name = name;
    alert("Room name updated!");
  });

  // Timer intervals updated
  socket.on("timerIntervalsUpdated", ({ studyInterval, breakInterval }) => {
    if (roomData) {
      roomData.studyInterval = studyInterval;
      roomData.breakInterval = breakInterval;
    }
    alert("Timer intervals updated!");
  });

  // Password updated
  socket.on("roomPasswordUpdated", ({ code }) => {
    if (roomData) roomData.code = code;
    // Update localStorage with new code
    localStorage.setItem(`roomCode_${roomId}`, code);
    alert("Room password updated!");
  });

  // Participant kicked
  socket.on("participantKicked", ({ username }) => {
    alert(`${username} was kicked from the room`);
  });

  // You were kicked
  socket.on("youWereKicked", () => {
    alert("You have been kicked from the room");
    window.location.href = "/dashboard.html";
  });

  // Room ended
  socket.on("roomEnded", () => {
    alert("This room has been ended by the admin");
    window.location.href = "/dashboard.html";
  });
}
  fetchUserAndConnect();
});