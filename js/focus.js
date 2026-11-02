
/* =========================================
   LIFEOS — FOCUS
   File: js/focus.js
   ========================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "lifeos_focus_sessions";
  const DEFAULT_DURATION = 25 * 60;

  const elements = {
    timerDisplay: document.getElementById("timerDisplay"),
    timerProgress: document.getElementById("timerProgress"),

    startButton: document.getElementById("timerStart"),
    pauseButton: document.getElementById("timerPause"),
    resetButton: document.getElementById("timerReset"),

    durationInput: document.getElementById("focusDuration"),
    durationButtons: document.querySelectorAll("[data-duration]"),

    sessionCount: document.getElementById("focusSessionCount"),
    totalFocusTime: document.getElementById("totalFocusTime"),
    sessionHistory: document.getElementById("focusSessionHistory"),

    feedback: document.getElementById("focusFeedback")
  };

  let duration = DEFAULT_DURATION;
  let remaining = DEFAULT_DURATION;
  let intervalId = null;
  let running = false;
  let sessions = loadSessions();
  let lastTick = null;

  /* -----------------------------------------
     STORAGE
  ----------------------------------------- */

  function loadSessions() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error("Unable to load focus sessions:", error);
      return [];
    }
  }

  function saveSessions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      return true;
    } catch (error) {
      console.error("Unable to save focus session:", error);
      showFeedback("Your session could not be saved.");
      return false;
    }
  }

  /* -----------------------------------------
     HELPERS
  ----------------------------------------- */

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `focus-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes
      ? `${hours} hr ${remainingMinutes} min`
      : `${hours} hr`;
  }

  function showFeedback(message) {
    if (!elements.feedback) return;

    elements.feedback.textContent = message;
    elements.feedback.hidden = false;

    clearTimeout(showFeedback.timeout);

    showFeedback.timeout = setTimeout(() => {
      elements.feedback.hidden = true;
    }, 3500);
  }

  /* -----------------------------------------
     TIMER DISPLAY
  ----------------------------------------- */

  function updateDisplay() {
    if (elements.timerDisplay) {
      elements.timerDisplay.textContent = formatTime(remaining);
    }

    if (elements.timerProgress) {
      const progress = duration > 0
        ? ((duration - remaining) / duration) * 100
        : 0;

      elements.timerProgress.style.setProperty(
        "--progress",
        `${progress}%`
      );

      elements.timerProgress.setAttribute(
        "aria-valuenow",
        String(Math.round(progress))
      );
    }

    if (elements.startButton) {
      elements.startButton.disabled = running;
    }

    if (elements.pauseButton) {
      elements.pauseButton.disabled = !running;
    }
  }

  /* -----------------------------------------
     SESSION COMPLETION
  ----------------------------------------- */

  function completeSession() {
    stopTimer();

    const session = {
      id: createId(),
      duration,
      completedAt: new Date().toISOString()
    };

    sessions.unshift(session);

    if (!saveSessions()) {
      sessions.shift();
      renderHistory();
      showFeedback("Session finished, but could not be saved.");
      return;
    }

    remaining = duration;

    updateDisplay();
    renderHistory();

    showFeedback("Focus session completed. Great work!");

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("LIFEOS Focus", {
        body: "Your focus session is complete. Take a short break."
      });
    }
  }

  /* -----------------------------------------
     TIMER CONTROL
  ----------------------------------------- */

  function tick() {
    if (!running) return;

    const now = Date.now();
    const elapsed = Math.floor((now - lastTick) / 1000);

    if (elapsed <= 0) return;

    remaining = Math.max(0, remaining - elapsed);
    lastTick = now;

    updateDisplay();

    if (remaining <= 0) {
      completeSession();
    }
  }

  function startTimer() {
    if (running) return;

    if (remaining <= 0) {
      remaining = duration;
    }

    running = true;
    lastTick = Date.now();

    intervalId = setInterval(tick, 250);

    updateDisplay();
    showFeedback("Focus session started.");
  }

  function pauseTimer() {
    if (!running) return;

    tick();

    if (!running) return;

    stopTimer();
    updateDisplay();
    showFeedback("Timer paused.");
  }

  function stopTimer() {
    running = false;

    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }

    lastTick = null;
  }

  function resetTimer() {
    stopTimer();
    remaining = duration;

    updateDisplay();
    showFeedback("Timer reset.");
  }

  /* -----------------------------------------
     DURATION SELECTION
  ----------------------------------------- */

  function setDuration(minutes) {
    const parsed = Number(minutes);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 180) {
      showFeedback("Choose a duration between 1 and 180 minutes.");
      return;
    }

    stopTimer();

    duration = Math.round(parsed) * 60;
    remaining = duration;

    if (elements.durationInput) {
      elements.durationInput.value = String(Math.round(parsed));
    }

    elements.durationButtons.forEach(button => {
      button.classList.toggle(
        "active",
        Number(button.dataset.duration) === Math.round(parsed)
      );
    });

    updateDisplay();
  }

  /* -----------------------------------------
     SESSION HISTORY
  ----------------------------------------- */

  function renderHistory() {
    const totalSessions = sessions.length;

    const totalSeconds = sessions.reduce((sum, session) => {
      return sum + (Number(session.duration) || 0);
    }, 0);

    if (elements.sessionCount) {
      elements.sessionCount.textContent = totalSessions;
    }

    if (elements.totalFocusTime) {
      elements.totalFocusTime.textContent = formatDuration(totalSeconds);
    }

    if (!elements.sessionHistory) return;

    if (sessions.length === 0) {
      elements.sessionHistory.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="timer"></i>
          </div>
          <h3>No focus sessions yet</h3>
          <p>Your completed sessions will appear here.</p>
        </div>
      `;
    } else {
      elements.sessionHistory.innerHTML = sessions
        .slice(0, 10)
        .map(session => {
          const date = new Date(session.completedAt);

          const dateLabel = Number.isNaN(date.getTime())
            ? "Unknown date"
            : date.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
              });

          return `
            <article class="focus-history-item">
              <div class="focus-history-icon">
                <i data-lucide="check-circle-2"></i>
              </div>

              <div class="focus-history-details">
                <h3>Focus session completed</h3>
                <p>${escapeHTML(dateLabel)}</p>
              </div>

              <span class="focus-history-duration">
                ${escapeHTML(formatDuration(Number(session.duration) || 0))}
              </span>
            </article>
          `;
        })
        .join("");
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /* -----------------------------------------
     BUTTON EVENTS
  ----------------------------------------- */

  elements.startButton?.addEventListener("click", startTimer);
  elements.pauseButton?.addEventListener("click", pauseTimer);
  elements.resetButton?.addEventListener("click", resetTimer);

  elements.durationButtons.forEach(button => {
    button.addEventListener("click", () => {
      setDuration(button.dataset.duration);
    });
  });

  elements.durationInput?.addEventListener("change", () => {
    setDuration(elements.durationInput.value);
  });

  /* -----------------------------------------
     CROSS-TAB SYNCHRONIZATION
  ----------------------------------------- */

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      sessions = loadSessions();
      renderHistory();
    }
  });

  /* -----------------------------------------
     INITIALIZE
  ----------------------------------------- */

  updateDisplay();
  renderHistory();

})();
