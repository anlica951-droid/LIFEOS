
/* =========================================
   LIFEOS — STUDY SESSIONS
   File: js/focus.js
   Database: Supabase
   ========================================= */

import { supabase } from "./supabase.js";

(() => {
  "use strict";

  const DEFAULT_FOCUS = 25 * 60;
  const SHORT_BREAK = 5 * 60;
  const LONG_BREAK = 20 * 60;

  const el = {
    timerDisplay: document.getElementById("timerDisplay"),
    timerProgress: document.getElementById("timerProgress"),
    timerLabel: document.getElementById("focusTimerLabel"),

    start: document.getElementById("timerStart"),
    pause: document.getElementById("timerPause"),
    reset: document.getElementById("timerReset"),

    durationInput: document.getElementById("focusDuration"),
    durationButtons: document.querySelectorAll("[data-duration]"),
    durationOptions: document.querySelector(".focus-duration-options"),

    modeButtons: document.querySelectorAll("[data-mode]"),

    subject: document.getElementById("studySubject"),
    studyType: document.getElementById("studyType"),
    title: document.getElementById("studyTitle"),
    notes: document.getElementById("studyNotes"),

    sessionCount: document.getElementById("focusSessionCount"),
    totalTime: document.getElementById("totalFocusTime"),
    weeklyTime: document.getElementById("weeklyStudyTime"),
    history: document.getElementById("focusSessionHistory"),
    feedback: document.getElementById("focusFeedback")
  };

  let user = null;
  let subjects = [];
  let sessions = [];

  let mode = "focus";
  let focusDuration = DEFAULT_FOCUS;
  let duration = DEFAULT_FOCUS;
  let remaining = DEFAULT_FOCUS;

  let running = false;
  let intervalId = null;
  let lastTick = null;
  let startedAt = null;
  let saving = false;

  /* -----------------------------------------
     HELPERS
  ----------------------------------------- */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    return remainder
      ? `${hours} hr ${remainder} min`
      : `${hours} hr`;
  }

  function showFeedback(message) {
    if (!el.feedback) return;

    el.feedback.textContent = message;
    el.feedback.hidden = false;

    clearTimeout(showFeedback.timeout);

    showFeedback.timeout = setTimeout(() => {
      el.feedback.hidden = true;
    }, 3500);
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  /* -----------------------------------------
     AUTHENTICATION
  ----------------------------------------- */

  async function initializeUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      showFeedback("Please sign in to use your study sessions.");
      if (el.start) el.start.disabled = true;
      return false;
    }

    user = data.user;
    return true;
  }

  /* -----------------------------------------
     SUBJECTS
  ----------------------------------------- */

  async function loadSubjects() {
    if (!el.subject) return;

    const { data, error } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Subject loading error:", error);
      el.subject.innerHTML = `<option value="">Unable to load subjects</option>`;
      return;
    }

    subjects = data || [];

    el.subject.innerHTML = `
      <option value="">No subject selected</option>
      ${subjects.map(subject => `
        <option value="${escapeHTML(subject.id)}">
          ${escapeHTML(subject.name)}
        </option>
      `).join("")}
    `;
  }

  function getSubjectName(subjectId) {
    return subjects.find(subject => subject.id === subjectId)?.name || "General study";
  }

  /* -----------------------------------------
     TIMER DISPLAY
  ----------------------------------------- */

  function updateDisplay() {
    if (el.timerDisplay) {
      el.timerDisplay.textContent = formatTime(remaining);
    }

    if (el.timerProgress) {
      const progress = duration > 0
        ? ((duration - remaining) / duration) * 100
        : 0;

      el.timerProgress.style.setProperty("--progress", `${progress}%`);
      el.timerProgress.setAttribute("aria-valuenow", String(Math.round(progress)));
    }

    if (el.start) el.start.disabled = running || saving;
    if (el.pause) el.pause.disabled = !running;
    if (el.reset) el.reset.disabled = saving;

    if (el.start) {
      const label = el.start.querySelector("span");
      if (label) {
        label.textContent = running
          ? "Studying..."
          : mode === "focus"
            ? "Start studying"
            : "Start break";
      }
    }
  }

  /* -----------------------------------------
     TIMER MODES
  ----------------------------------------- */

  function setMode(newMode) {
    if (!["focus", "short_break", "long_break"].includes(newMode)) return;
    if (saving) return;

    stopTimer();

    mode = newMode;

    if (mode === "focus") {
      duration = focusDuration;
      if (el.timerLabel) el.timerLabel.textContent = "YOUR STUDY SESSION";
      if (el.durationOptions) el.durationOptions.hidden = false;
    } else if (mode === "short_break") {
      duration = SHORT_BREAK;
      if (el.timerLabel) el.timerLabel.textContent = "SHORT BREAK";
      if (el.durationOptions) el.durationOptions.hidden = true;
    } else {
      duration = LONG_BREAK;
      if (el.timerLabel) el.timerLabel.textContent = "LONG BREAK";
      if (el.durationOptions) el.durationOptions.hidden = true;
    }

    remaining = duration;
    startedAt = null;

    el.modeButtons.forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    updateDisplay();
  }

  function setFocusDuration(minutes) {
    const value = Number(minutes);

    if (!Number.isFinite(value) || value < 1 || value > 180) {
      showFeedback("Choose a duration between 1 and 180 minutes.");
      return;
    }

    if (mode !== "focus" || saving) return;

    stopTimer();

    focusDuration = Math.round(value) * 60;
    duration = focusDuration;
    remaining = duration;
    startedAt = null;

    if (el.durationInput) {
      el.durationInput.value = String(value);
    }

    el.durationButtons.forEach(button => {
      const active = Number(button.dataset.duration) === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    updateDisplay();
  }

  /* -----------------------------------------
     TIMER CONTROL
  ----------------------------------------- */

  function startTimer() {
    if (running || saving) return;

    if (remaining <= 0) {
      remaining = duration;
    }

    if (mode === "focus" && !startedAt) {
      startedAt = new Date().toISOString();
    }

    running = true;
    lastTick = Date.now();

    intervalId = setInterval(tick, 250);

    updateDisplay();
    showFeedback(mode === "focus" ? "Study session started. Stay focused!" : "Break started. Take your time.");
  }

  function tick() {
    if (!running) return;

    const now = Date.now();
    const elapsed = Math.floor((now - lastTick) / 1000);

    if (elapsed <= 0) return;

    remaining = Math.max(0, remaining - elapsed);
    lastTick += elapsed * 1000;

    updateDisplay();

    if (remaining <= 0) {
      if (mode === "focus") {
        completeStudySession();
      } else {
        stopTimer();
        remaining = 0;
        updateDisplay();
        showFeedback("Break completed. You're ready to continue!");
      }
    }
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
    if (saving) return;

    stopTimer();
    remaining = duration;
    startedAt = null;

    updateDisplay();
    showFeedback("Timer reset.");
  }

  /* -----------------------------------------
     SAVE COMPLETED STUDY SESSION
  ----------------------------------------- */

  async function completeStudySession() {
    if (saving) return;

    stopTimer();
    saving = true;
    updateDisplay();

    const endedAt = new Date().toISOString();
    const selectedSubject = el.subject?.value || null;

    const session = {
      user_id: user.id,
      subject_id: selectedSubject,
      title: el.title?.value.trim() || null,
      session_type: el.studyType?.value || "general_study",
      duration_seconds: duration,
      started_at: startedAt || endedAt,
      ended_at: endedAt,
      notes: el.notes?.value.trim() || null
    };

    const { error } = await supabase
      .from("study_sessions")
      .insert(session);

    saving = false;

    if (error) {
      console.error("Study session save error:", error);
      remaining = 0;
      updateDisplay();
      showFeedback("Session completed, but it could not be saved. Please check your connection and try again.");
      return;
    }

    remaining = duration;
    startedAt = null;

    if (el.title) el.title.value = "";
    if (el.notes) el.notes.value = "";

    updateDisplay();

    await loadSessions();

    showFeedback("Study session saved! Great work.");

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("LIFEOS Study Sessions", {
        body: "Your study session is complete. Take a break!"
      });
    }
  }

  /* -----------------------------------------
     LOAD STUDY HISTORY
  ----------------------------------------- */

  async function loadSessions() {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("id, subject_id, title, session_type, duration_seconds, started_at, ended_at, notes")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Study history loading error:", error);
      showFeedback("Unable to load study history.");
      return;
    }

    sessions = data || [];
    renderHistory();
  }

  /* -----------------------------------------
     STATISTICS
  ----------------------------------------- */

  function getWeekStart() {
    const date = new Date();
    const day = date.getDay();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((day + 6) % 7));

    return date;
  }

  function renderStatistics() {
    const totalSeconds = sessions.reduce(
      (sum, session) => sum + (Number(session.duration_seconds) || 0),
      0
    );

    const weekStart = getWeekStart();

    const weeklySessions = sessions.filter(session => {
      return new Date(session.started_at) >= weekStart;
    });

    const weeklySeconds = weeklySessions.reduce(
      (sum, session) => sum + (Number(session.duration_seconds) || 0),
      0
    );

    if (el.sessionCount) {
      el.sessionCount.textContent = sessions.length;
    }

    if (el.totalTime) {
      el.totalTime.textContent = formatDuration(totalSeconds);
    }

    if (el.weeklyTime) {
      el.weeklyTime.textContent = formatDuration(weeklySeconds);
    }
  }

  /* -----------------------------------------
     SESSION HISTORY DISPLAY
  ----------------------------------------- */

  function getTypeLabel(type) {
    const labels = {
      general_study: "General study",
      reading: "Reading",
      reviewing: "Reviewing",
      assignment: "Assignment",
      exam_preparation: "Exam preparation"
    };

    return labels[type] || "Study session";
  }

  function renderHistory() {
    renderStatistics();

    if (!el.history) return;

    if (!sessions.length) {
      el.history.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="book-open"></i>
          </div>
          <h3>No study sessions yet</h3>
          <p>Your completed study sessions will appear here.</p>
        </div>
      `;

      refreshIcons();
      return;
    }

    el.history.innerHTML = sessions.slice(0, 15).map(session => {
      const date = new Date(session.started_at);

      const dateLabel = Number.isNaN(date.getTime())
        ? "Unknown date"
        : date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          });

      const subjectName = getSubjectName(session.subject_id);
      const title = session.title || getTypeLabel(session.session_type);

      return `
        <article class="focus-history-item">
          <div class="focus-history-icon">
            <i data-lucide="book-check"></i>
          </div>

          <div class="focus-history-details">
            <h3>${escapeHTML(title)}</h3>
            <p>
              ${escapeHTML(subjectName)}
              · ${escapeHTML(getTypeLabel(session.session_type))}
              · ${escapeHTML(dateLabel)}
            </p>
          </div>

          <span class="focus-history-duration">
            ${escapeHTML(formatDuration(Number(session.duration_seconds) || 0))}
          </span>
        </article>
      `;
    }).join("");

    refreshIcons();
  }

  /* -----------------------------------------
     EVENTS
  ----------------------------------------- */

  el.start?.addEventListener("click", startTimer);
  el.pause?.addEventListener("click", pauseTimer);
  el.reset?.addEventListener("click", resetTimer);

  el.modeButtons.forEach(button => {
    button.addEventListener("click", () => {
      setMode(button.dataset.mode);
    });
  });

  el.durationButtons.forEach(button => {
    button.addEventListener("click", () => {
      setFocusDuration(button.dataset.duration);
    });
  });

  el.durationInput?.addEventListener("change", () => {
    setFocusDuration(el.durationInput.value);
  });

  /* -----------------------------------------
     INITIALIZE
  ----------------------------------------- */

  async function initialize() {
    updateDisplay();

    const authenticated = await initializeUser();

    if (!authenticated) return;

    await loadSubjects();
    await loadSessions();

    updateDisplay();
  }

  initialize();

})();
