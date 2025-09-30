const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");
  let username = "";
  let roomData = null;
  let isAdmin = false;
  let isCreator = false;
  let currentUserId = null;
  let socket;

  const loadingOverlay = document.getElementById("loadingOverlay");
  const messagesEl = document.getElementById("chatMessages");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const participantsEl = document.getElementById("participantsList");
  const participantCount = document.getElementById("participantCount");
  const scrollToBottomBtn = document.getElementById("scrollToBottom");

  const timerDisplay = document.getElementById("timerDisplay");
  const phaseIndicator = document.getElementById("phaseIndicator");
  const currentSessionEl = document.getElementById("currentSession");
  const totalSessionsEl = document.getElementById("totalSessions");

  const playBtn = document.getElementById("playBtn");
  const resetBtn = document.getElementById("resetBtn");
  const skipBtn = document.getElementById("skipBtn");
  const leaveBtn = document.getElementById("leaveBtn");

  // Auto-hide loading overlay after connection
  setTimeout(() => {
    if (loadingOverlay) loadingOverlay.style.display = "none";
  }, 2000);

  // Scroll to bottom functionality
  messagesEl.addEventListener("scroll", () => {
    const isScrolledUp = messagesEl.scrollHeight - messagesEl.scrollTop > messagesEl.clientHeight + 100;
    scrollToBottomBtn.classList.toggle("show", isScrolledUp);
  });

  scrollToBottomBtn.addEventListener("click", () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  // Copy link button
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      const roomUrl = window.location.href;
      navigator.clipboard.writeText(roomUrl)
        .then(() => {
          const originalHTML = copyLinkBtn.innerHTML;
          copyLinkBtn.innerHTML = '<i class="bi bi-check"></i><span>Copied!</span>';
          copyLinkBtn.style.background = "rgba(16, 185, 129, 0.9)";
          setTimeout(() => {
            copyLinkBtn.innerHTML = originalHTML;
            copyLinkBtn.style.background = "";
          }, 2000);
        })
        .catch(err => {
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
      const res = await fetch(`${socketUrl}/api/auth/profile`, {
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
    socket = io(socketUrl, { auth: { token } });

    socket.on("connect", () => {
      loadingOverlay.style.display = "none";
      socket.emit("checkRoomAccess", { roomId });
    });

    socket.on("disconnect", () => {
      document.querySelector(".room-status span:last-child").textContent = "Disconnected";
      document.querySelector(".status-indicator").style.background = "#EF4444";
    });

    socket.on("connect_error", () => {
      loadingOverlay.style.display = "none";
      alert("Connection error. Please refresh the page.");
    });

    addRoomManagementListeners();

    socket.on("roomAccessInfo", ({ roomName, isPrivate, isCreator: creatorFlag, requiresCode }) => {
      document.getElementById("roomName").textContent = roomName;
      isCreator = creatorFlag;

      let roomCode = null;
      if (requiresCode && !isCreator) {
        const storageKey = `roomCode_${roomId}`;
        roomCode = localStorage.getItem(storageKey) || prompt("This is a private room. Enter the room code:");
        if (!roomCode) {
          alert("Room code is required!");
          window.location.href = "/dashboard.html";
          return;
        }
        localStorage.setItem(storageKey, roomCode);
      }

      socket.emit("joinRoom", { roomId, roomCode });
    });

    socket.on("roomAccessDenied", ({ reason }) => {
      alert(reason || "Access denied!");
      localStorage.removeItem(`roomCode_${roomId}`);
      window.location.href = "/dashboard.html";
    });

    socket.on("roomJoinSuccess", ({ roomName }) => {
      console.log(`Joined room: ${roomName}`);
      socket.emit("getRoomData", { roomId });
    });

    // Participants
    socket.on("participantsUpdate", ({ participants, adminId }) => {
      participantsEl.innerHTML = "";
      if (participants.length === 0) {
        participantsEl.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i><p>No participants yet</p></div>';
      } else {
        participants.forEach(p => {
          const div = document.createElement("div");
          div.className = "participant";
          const color = "#3B82F6";
          const initial = p.username?.[0] || "?";
          const isCurrentAdmin = p.socketId === adminId;
          div.innerHTML = `
            <div class="participant-avatar" style="background:${color}">
              ${initial}
              <div class="status-dot"></div>
            </div>
            <div class="participant-info">
              <div class="participant-name">${p.username || "Unknown"}${p.socketId === socket.id ? " (You)" : ""}</div>
              ${isCurrentAdmin ? '<div class="participant-badge"><i class="bi bi-star-fill admin-star"></i> Admin</div>' : ''}
            </div>
          `;
          participantsEl.appendChild(div);
        });
      }
      participantCount.textContent = participants.length;
      isAdmin = socket.id === adminId;

      if (roomData) {
        roomData.participants = participants;
        roomData.adminSocketId = adminId;
        const adminP = participants.find(p => p.socketId === adminId);
        if (adminP) roomData.adminUsername = adminP.username;
      }

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
      const isOwnMessage = sender === username;
      const color = isOwnMessage ? "#059669" : "#3B82F6";
      addUserMessage(sender, message, color, sender?.[0] || "?", isOwnMessage);
    });

    socket.on("loadMessages", messages => {
      messagesEl.innerHTML = "";
      if (messages.length === 0) {
        messagesEl.innerHTML = '<div class="empty-state"><i class="bi bi-chat-dots"></i><p>No messages yet</p></div>';
      } else {
        messages.forEach(m => {
          const isOwnMessage = m.username === username;
          const color = isOwnMessage ? "#059669" : "#3B82F6";
          addUserMessage(m.username, m.message, color, m.username?.[0] || "?", isOwnMessage);
        });
      }
    });

    // Timer & sessions
    socket.on("timerUpdate", timer => {
      timerDisplay.textContent = `${String(Math.floor(timer.timeLeft / 60)).padStart(2, "0")}:${String(timer.timeLeft % 60).padStart(2, "0")}`;
      phaseIndicator.textContent = timer.phase;
      playBtn.textContent = timer.running ? "⏸" : "▶";
    });

    socket.on("sessionUpdate", ({ currentSession, totalSessions }) => {
      currentSessionEl.textContent = currentSession;
      totalSessionsEl.textContent = totalSessions;
    });

    socket.on("errorMessage", msg => {
      console.warn("Socket error:", msg);
      const div = document.createElement("div");
      div.className = "system-message blocked-message";
      div.textContent = msg;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    const flashButton = btn => {
      btn.classList.add("flash");
      setTimeout(() => btn.classList.remove("flash"), 200);
    };

    playBtn?.addEventListener("click", () => { socket.emit("toggleTimer", { roomId }); flashButton(playBtn); });
    skipBtn?.addEventListener("click", () => { socket.emit("skipPhase", { roomId }); flashButton(skipBtn); });
    resetBtn?.addEventListener("click", () => { socket.emit("resetTimer", { roomId }); flashButton(resetBtn); });
  }

  function addUserMessage(sender, text, color, initial, isOwn = false) {
    const div = document.createElement("div");
    div.className = isOwn ? "message own-message" : "message";
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

  // Send messages
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

  // Settings modal
  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    if (roomData) {
      populateSettingsModal();
      new bootstrap.Modal(document.getElementById("roomSettingsModal")).show();
    } else alert("Room data not loaded yet. Please try again.");
  });

  function populateSettingsModal() {
    if (!roomData) return;
    isAdmin = roomData.adminSocketId === socket.id;
    currentUserId = roomData.currentUserId;

    document.getElementById("modalRoomName").textContent = roomData.name;
    document.getElementById("modalCreator").textContent = roomData.creatorUsername;
    document.getElementById("modalCreatedDate").textContent = new Date(roomData.createdAt).toLocaleDateString();
    document.getElementById("modalPrivacy").textContent = roomData.isPrivate ? "🔒 Private" : "🌍 Public";
    document.getElementById("modalAdmin").textContent = roomData.adminUsername + " ⭐";
    document.getElementById("modalTotalSessions").textContent = roomData.completedSessions || 0;

    if (isCreator && roomData.isPrivate) {
      document.getElementById("roomCodeRow").style.display = "flex";
      document.getElementById("modalRoomCode").textContent = roomData.code || "N/A";
    } else document.getElementById("roomCodeRow").style.display = "none";

    const controls = ["editRoomName", "editStudyInterval", "editBreakInterval", "saveRoomNameBtn", "saveIntervalsBtn", "endRoomBtn"];
    controls.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !isAdmin; });

    const passwordGroup = document.getElementById("changePasswordGroup");
    if (roomData.isPrivate && isCreator) {
      passwordGroup.style.display = "block";
      document.getElementById("newPassword").disabled = false;
      document.getElementById("savePasswordBtn").disabled = false;
    } else passwordGroup.style.display = "none";

    document.getElementById("editRoomName").value = roomData.name;
    document.getElementById("editStudyInterval").value = roomData.studyInterval || 25;
    document.getElementById("editBreakInterval").value = roomData.breakInterval || 5;

    populateParticipantsManage();
  }

  function populateParticipantsManage() {
    const container = document.getElementById("participantsManage");
    container.innerHTML = "";
    if (!roomData.participants?.length) {
      container.innerHTML = '<div class="text-center text-muted py-3"><small>No participants</small></div>';
      return;
    }

    roomData.participants.forEach(p => {
      const div = document.createElement("div");
      div.className = "participant-manage-item";
      const isCurrentUser = p.socketId === socket.id;
      const isCurrentAdmin = p.socketId === roomData.adminSocketId;
      div.innerHTML = `
        <div class="participant-manage-info">
          <div class="participant-manage-avatar" style="background: #3B82F6">${p.username?.[0] || "?"}</div>
          <span class="participant-manage-name">${p.username}${isCurrentUser ? " (You)" : ""}${isCurrentAdmin ? " ⭐" : ""}</span>
        </div>
        ${!isCurrentUser && isAdmin ? `<button class="kick-btn" data-socket-id="${p.socketId}" data-username="${p.username}">Kick</button>` : ""}
      `;
      container.appendChild(div);
    });

    if (isAdmin) {
      container.querySelectorAll(".kick-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const socketId = btn.dataset.socketId;
          const username = btn.dataset.username;
          if (confirm(`Kick ${username}?`)) socket.emit("kickParticipant", { roomId, socketId });
        });
      });
    }
  }

  // Copy room code button
  document.getElementById("copyCodeBtn")?.addEventListener("click", () => {
    const code = document.getElementById("modalRoomCode").textContent;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById("copyCodeBtn");
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check"></i>';
      setTimeout(() => btn.innerHTML = original, 1500);
    });
  });

  // Save room name
  document.getElementById("saveRoomNameBtn")?.addEventListener("click", () => {
    const newName = document.getElementById("editRoomName").value.trim();
    if (!newName) return alert("Room name cannot be empty");
    socket.emit("updateRoomName", { roomId, name: newName });
  });

  // Save intervals
  document.getElementById("saveIntervalsBtn")?.addEventListener("click", () => {
    const study = parseInt(document.getElementById("editStudyInterval").value);
    const breakTime = parseInt(document.getElementById("editBreakInterval").value);
    if (study < 1 || study > 120) return alert("Study interval 1-120 min");
    if (breakTime < 1 || breakTime > 30) return alert("Break interval 1-30 min");
    socket.emit("updateTimerIntervals", { roomId, studyInterval: study, breakInterval: breakTime });
  });

  // Change password
  document.getElementById("savePasswordBtn")?.addEventListener("click", () => {
    const newPassword = document.getElementById("newPassword").value.trim();
    if (!newPassword) return alert("Password cannot be empty");
    if (confirm("Change room password?")) socket.emit("updateRoomPassword", { roomId, password: newPassword });
  });

  // End room
  document.getElementById("endRoomBtn")?.addEventListener("click", () => {
    if (confirm("END this room? All participants will be kicked.")) socket.emit("endRoom", { roomId });
  });

  // Socket listeners for management
  function addRoomManagementListeners() {
    socket.on("roomData", (data) => {
      roomData = data;
      currentUserId = data.currentUserId;
      isCreator = data.isCreator;
    });

    socket.on("roomNameUpdated", ({ name }) => {
      document.getElementById("roomName").textContent = name;
      if (roomData) roomData.name = name;
      alert("Room name updated!");
    });

    socket.on("timerIntervalsUpdated", ({ studyInterval, breakInterval }) => {
      if (roomData) {
        roomData.studyInterval = studyInterval;
        roomData.breakInterval = breakInterval;
      }
      alert("Timer intervals updated!");
    });

    socket.on("roomPasswordUpdated", ({ code }) => {
      if (roomData) roomData.code = code;
      localStorage.setItem(`roomCode_${roomId}`, code);
      alert("Room password updated!");
    });

    socket.on("participantKicked", ({ username }) => alert(`${username} was kicked`));
    socket.on("youWereKicked", () => { alert("You were kicked"); window.location.href = "/dashboard.html"; });
    socket.on("roomEnded", () => { alert("Room ended by admin"); window.location.href = "/dashboard.html"; });
  }

  fetchUserAndConnect();
});