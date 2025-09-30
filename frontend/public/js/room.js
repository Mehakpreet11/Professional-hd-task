document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");
  let username = "";
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
    socket = io({ auth: { token } });
  
    socket.on("connect", () => {
      // First, check if we can access this room
      socket.emit("checkRoomAccess", { roomId });
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

  fetchUserAndConnect();
});