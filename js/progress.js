/* =========================================
   LIFEOS — SIMPLE PROGRESS
   File: js/progress.js

   Activity sources:
   - personal_tasks
   - study_sessions

   Displays:
   - Daily activity
   - Weekly activity
   - Monthly activity
   - Overall task completion
========================================= */

import { supabase } from "./supabase.js";

(() => {
  "use strict";

  const STORAGE_KEYS = {
    tasks: "lifeos_tasks",
    sessions: "lifeos_focus_sessions"
  };

  const elements = {
    chart: document.getElementById("activityChart"),
    periodLabel: document.getElementById("activityPeriodLabel"),

    completionRate: document.getElementById("overallCompletionRate"),
    completionBar: document.getElementById("overallCompletionBar"),
    completionFill: document.getElementById("overallCompletionFill"),
    completionDescription: document.getElementById("completionDescription"),
    completionCount: document.getElementById("completionTaskCount"),

    refreshButton: document.getElementById("refreshProgress"),
    feedback: document.getElementById("progressFeedback"),

    periodButtons: document.querySelectorAll(".period-button")
  };

  let currentPeriod = "weekly";
  let taskRecords = [];
  let sessionRecords = [];
  let isLoading = false;

  /* =========================================
     LOCAL STORAGE FALLBACK
  ========================================= */

  function readLocalStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error(`Could not read ${key}:`, error);
      return [];
    }
  }

  function getLocalTasks() {
    return readLocalStorage(STORAGE_KEYS.tasks);
  }

  function getLocalSessions() {
    return readLocalStorage(STORAGE_KEYS.sessions);
  }

  /* =========================================
     DATE HELPERS
  ========================================= */

  function startOfDay(date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function parseDate(value) {
    if (!value) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      const [year, month, day] = String(value).split("-").map(Number);
      const date = new Date(year, month - 1, day);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getMonday(date) {
    const result = startOfDay(date);
    const day = result.getDay();

    result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));

    return result;
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function sameMonth(first, second) {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth()
    );
  }

  /* =========================================
     NORMALIZE RECORDS
  ========================================= */

  function isTaskCompleted(task) {
    return (
      task.completed === true ||
      String(task.status || "").toLowerCase() === "completed"
    );
  }

  function getTaskCompletionDate(task) {
    return parseDate(
      task.completed_at ||
      task.completedAt ||
      task.updated_at ||
      task.created_at
    );
  }

  function getSessionDate(session) {
    return parseDate(
      session.ended_at ||
      session.completedAt ||
      session.started_at
    );
  }

  /* =========================================
     LOAD DATABASE RECORDS
  ========================================= */

  async function loadTasks() {
    try {
      const { data, error } = await supabase
        .from("personal_tasks")
        .select("id, status, completed_at, created_at, updated_at");

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        return data;
      }

      // Use older local records if the database is still empty.
      return getLocalTasks();

    } catch (error) {
      console.warn("Using local task records:", error.message);
      return getLocalTasks();
    }
  }

  async function loadStudySessions() {
    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("id, duration_seconds, started_at, ended_at")
        .not("ended_at", "is", null);

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        return data;
      }

      return getLocalSessions();

    } catch (error) {
      console.warn("Using local study session records:", error.message);
      return getLocalSessions();
    }
  }

  /* =========================================
     CREATE CHART PERIODS
  ========================================= */

  function getDailyPeriods() {
    const today = startOfDay(new Date());
    const monday = getMonday(today);

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(monday, index);

      return {
        key: dateKey(date),
        label: date.toLocaleDateString(undefined, {
          weekday: "short"
        }),
        fullLabel: date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric"
        }),
        start: date,
        end: addDays(date, 1),
        isCurrent: dateKey(date) === dateKey(today)
      };
    });
  }

  function getWeeklyPeriods() {
  const today = startOfDay(new Date());

  const firstDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const nextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1
  );

  let weekStart = getMonday(firstDay);
  const periods = [];
  let weekNumber = 1;

  while (weekStart < nextMonth) {
    const nextWeek = addDays(weekStart, 7);

    const periodStart = weekStart < firstDay
      ? firstDay
      : weekStart;

    const periodEnd = nextWeek > nextMonth
      ? nextMonth
      : nextWeek;

    periods.push({
      key: `week-${weekNumber}`,
      label: `W${weekNumber}`,
      fullLabel: `Week ${weekNumber}`,
      start: periodStart,
      end: periodEnd,
      isCurrent: today >= periodStart && today < periodEnd
    });

    weekStart = nextWeek;
    weekNumber++;
  }

  return periods;
}

  function getMonthlyPeriods() {
    const today = new Date();
    const year = today.getFullYear();

    return Array.from({ length: 12 }, (_, index) => {
      const start = new Date(year, index, 1);
      const end = new Date(year, index + 1, 1);

      return {
        key: `month-${index}`,
        label: start.toLocaleDateString(undefined, {
          month: "short"
        }),
        fullLabel: start.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric"
        }),
        start,
        end,
        isCurrent: index === today.getMonth()
      };
    });
  }

  /* =========================================
     COUNT ACTIVITY
  ========================================= */

  function getActivityForPeriod(period) {
    const completedTasks = taskRecords.filter(task => {
      if (!isTaskCompleted(task)) return false;

      const date = getTaskCompletionDate(task);

      return date && date >= period.start && date < period.end;
    }).length;

    const completedSessions = sessionRecords.filter(session => {
      const date = getSessionDate(session);

      return date && date >= period.start && date < period.end;
    }).length;

    return {
      tasks: completedTasks,
      sessions: completedSessions,
      total: completedTasks + completedSessions
    };
  }

  /* =========================================
     RENDER ACTIVITY CHART
  ========================================= */

  function renderChart() {
    if (!elements.chart) return;

    let periods = [];
    let heading = "";

    if (currentPeriod === "daily") {
      periods = getDailyPeriods();
      heading = "Your activity this week";

    } else if (currentPeriod === "weekly") {
      periods = getWeeklyPeriods();
      heading = "Your activity this month";

    } else {
      periods = getMonthlyPeriods();
      heading = `Your activity in ${new Date().getFullYear()}`;
    }

    if (elements.periodLabel) {
      elements.periodLabel.textContent = heading;
    }

    const chartData = periods.map(period => ({
      ...period,
      ...getActivityForPeriod(period)
    }));

    const maximum = Math.max(
      1,
      ...chartData.map(item => item.total)
    );

    elements.chart.innerHTML = chartData.map(item => {
      const height = item.total > 0
        ? Math.max(7, (item.total / maximum) * 100)
        : 3;

      const details =
        `${item.fullLabel}: ${item.tasks} completed tasks and ` +
        `${item.sessions} study sessions`;

      return `
        <div
          class="activity-column ${item.isCurrent ? "current-period" : ""}"
          title="${details}"
        >
          <span class="activity-value">${item.total}</span>

          <div class="activity-bar-track">
            <div
              class="activity-bar-fill"
              style="height: ${height}%"
              role="img"
              aria-label="${details}"
            ></div>
          </div>

          <span class="activity-label">${item.label}</span>
        </div>
      `;
    }).join("");
  }

  /* =========================================
     RENDER OVERALL COMPLETION
  ========================================= */

  function renderCompletion() {
    const total = taskRecords.length;

    const completed = taskRecords.filter(
      isTaskCompleted
    ).length;

    const rate = total > 0
      ? Math.round((completed / total) * 100)
      : 0;

    if (elements.completionRate) {
      elements.completionRate.textContent = `${rate}%`;
    }

    if (elements.completionFill) {
      elements.completionFill.style.width = `${rate}%`;
    }

    if (elements.completionBar) {
      elements.completionBar.setAttribute(
        "aria-valuenow",
        String(rate)
      );
    }

    if (elements.completionCount) {
      elements.completionCount.textContent =
        `${completed} of ${total} tasks`;
    }

    if (elements.completionDescription) {
      if (total === 0) {
        elements.completionDescription.textContent =
          "No tasks added yet";
      } else if (completed === total) {
        elements.completionDescription.textContent =
          "All tasks completed";
      } else if (completed === 0) {
        elements.completionDescription.textContent =
          "Ready for your first completed task";
      } else {
        elements.completionDescription.textContent =
          "Keep making progress";
      }
    }
  }

  /* =========================================
     FEEDBACK
  ========================================= */

  function showFeedback(message) {
    if (!elements.feedback) return;

    elements.feedback.textContent = message;
    elements.feedback.hidden = false;

    clearTimeout(showFeedback.timeout);

    showFeedback.timeout = setTimeout(() => {
      elements.feedback.hidden = true;
    }, 2500);
  }

  /* =========================================
     PERIOD SELECTOR
  ========================================= */

  function setPeriod(period) {
    if (!["daily", "weekly", "monthly"].includes(period)) {
      return;
    }

    currentPeriod = period;

    elements.periodButtons.forEach(button => {
      const active = button.dataset.period === period;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    renderChart();
  }

  elements.periodButtons.forEach(button => {
    button.addEventListener("click", () => {
      setPeriod(button.dataset.period);
    });
  });

  /* =========================================
     REFRESH
  ========================================= */

  async function updateProgress(showMessage = false) {
    if (isLoading) return;

    isLoading = true;

    if (elements.refreshButton) {
      elements.refreshButton.classList.add("is-loading");
      elements.refreshButton.disabled = true;
    }

    try {
      const [tasks, sessions] = await Promise.all([
        loadTasks(),
        loadStudySessions()
      ]);

      taskRecords = tasks;
      sessionRecords = sessions;

      renderChart();
      renderCompletion();

      if (showMessage) {
        showFeedback("Progress updated.");
      }

    } catch (error) {
      console.error("Unable to update progress:", error);
      showFeedback("Unable to load your progress. Please try again.");

    } finally {
      isLoading = false;

      if (elements.refreshButton) {
        elements.refreshButton.classList.remove("is-loading");
        elements.refreshButton.disabled = false;
      }
    }
  }

  elements.refreshButton?.addEventListener("click", () => {
    updateProgress(true);
  });

  window.addEventListener("storage", event => {
    if (
      event.key === STORAGE_KEYS.tasks ||
      event.key === STORAGE_KEYS.sessions
    ) {
      updateProgress();
    }
  });

  /* =========================================
     INITIALIZE
  ========================================= */

  setPeriod("weekly");
  updateProgress();

})();