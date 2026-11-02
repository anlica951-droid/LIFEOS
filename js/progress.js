/* =========================================
   LIFEOS — PROGRESS ANALYTICS
   File: js/progress.js
========================================= */

(() => {
  "use strict";

  const TASKS_KEY = "lifeos_tasks";
  const FOCUS_KEY = "lifeos_focus_sessions";
  const JOURNAL_KEY = "lifeos_reflections";

  const elements = {
    totalTasks: document.getElementById("progressTotalTasks"),
    completedTasks: document.getElementById("progressCompletedTasks"),
    completedTasksSecondary: document.getElementById("progressCompletedTasksSecondary"),
    pendingTasks: document.getElementById("progressPendingTasks"),

    taskCompletionRate: document.getElementById("taskCompletionRate"),
    taskCompletionRateSecondary: document.getElementById("taskCompletionRateSecondary"),
    taskProgressBar: document.getElementById("taskProgressBar"),
    progressCircle: document.getElementById("progressCircle"),

    taskLegendCompleted: document.getElementById("taskLegendCompleted"),
    taskLegendPending: document.getElementById("taskLegendPending"),

    totalFocusSessions: document.getElementById("progressFocusSessions"),
    totalFocusTime: document.getElementById("progressFocusTime"),
    focusProgressBar: document.getElementById("focusProgressBar"),

    totalJournalEntries: document.getElementById("progressJournalEntries"),

    currentStreak: document.getElementById("progressCurrentStreak"),
    currentStreakSecondary: document.getElementById("progressCurrentStreakSecondary"),
    longestStreak: document.getElementById("progressLongestStreak"),

    weeklyChart: document.getElementById("weeklyActivityChart"),
    weeklySummary: document.getElementById("weeklyActivitySummary"),

    trendIcon: document.getElementById("progressTrendIcon"),
    trendLabel: document.getElementById("progressTrendLabel"),
    trendDescription: document.getElementById("progressTrendDescription"),
    trendValue: document.getElementById("progressTrendValue"),
    trendChart: document.getElementById("progressTrendChart"),

    refreshButton: document.getElementById("refreshProgress"),
    feedback: document.getElementById("progressFeedback")
  };

  /* -----------------------------------------
     STORAGE
  ----------------------------------------- */

  function readStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error(`Unable to read ${key}:`, error);
      return [];
    }
  }

  function getTasks() {
    return readStorage(TASKS_KEY);
  }

  function getFocusSessions() {
    return readStorage(FOCUS_KEY);
  }

  function getJournalEntries() {
    return readStorage(JOURNAL_KEY);
  }

  /* -----------------------------------------
     DATE HELPERS
  ----------------------------------------- */

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function parseDate(value) {
    if (!value) return null;

    // Parse date-only values as local dates.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      const parts = value.split("-").map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfDay(date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }

  function getPreviousDate(date) {
    const previous = new Date(date);
    previous.setDate(previous.getDate() - 1);
    return previous;
  }

  /* -----------------------------------------
     ACTIVITY DATA
  ----------------------------------------- */

  function getActivityDateSet(tasks, sessions, entries) {
    const activityDates = new Set();

    tasks.forEach(task => {
      if (!task.completed || !task.completedAt) return;

      const date = parseDate(task.completedAt);

      if (date) {
        activityDates.add(dateKey(date));
      }
    });

    sessions.forEach(session => {
      const date = parseDate(session.completedAt);

      if (date) {
        activityDates.add(dateKey(date));
      }
    });

    entries.forEach(entry => {
      const date = parseDate(entry.date);

      if (date) {
        activityDates.add(dateKey(date));
      }
    });

    return activityDates;
  }

  function getDailyActivity(tasks, sessions, entries, daysBack) {
    const today = startOfDay(new Date());
    const days = [];

    for (let offset = daysBack - 1; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);

      days.push({
        key: dateKey(date),
        label: date.toLocaleDateString(undefined, {
          weekday: "short"
        }),
        dateLabel: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        }),
        tasks: 0,
        focus: 0,
        sessions: 0,
        journal: 0,
        activity: 0
      });
    }

    const dayMap = new Map(
      days.map(day => [day.key, day])
    );

    tasks.forEach(task => {
      if (!task.completed || !task.completedAt) return;

      const date = parseDate(task.completedAt);
      if (!date) return;

      const day = dayMap.get(dateKey(date));

      if (day) day.tasks++;
    });

    sessions.forEach(session => {
      const date = parseDate(session.completedAt);
      if (!date) return;

      const day = dayMap.get(dateKey(date));

      if (day) {
        day.sessions++;
        day.focus += Number(session.duration) || 0;
      }
    });

    entries.forEach(entry => {
      const date = parseDate(entry.date);
      if (!date) return;

      const day = dayMap.get(dateKey(date));

      if (day) day.journal++;
    });

    days.forEach(day => {
      day.activity =
        day.tasks +
        day.journal +
        Math.ceil(day.focus / 1500);
    });

    return days;
  }

  /* -----------------------------------------
     STREAK CALCULATIONS
  ----------------------------------------- */

  function calculateStreaks(activityDates) {
    if (activityDates.size === 0) {
      return { current: 0, longest: 0 };
    }

    const todayKey = dateKey(startOfDay(new Date()));
    const yesterdayKey = dateKey(
      getPreviousDate(startOfDay(new Date()))
    );

    let current = 0;
    let longest = 0;
    let streak = 0;

    const sortedDates = [...activityDates].sort();

    sortedDates.forEach((key, index) => {
      if (index === 0) {
        streak = 1;
      } else {
        const previous = parseDate(sortedDates[index - 1]);
        const currentDate = parseDate(key);

        const difference = Math.round(
          (currentDate - previous) / 86400000
        );

        streak = difference === 1 ? streak + 1 : 1;
      }

      longest = Math.max(longest, streak);
    });

    const mostRecentDate = sortedDates[sortedDates.length - 1];

    if (
      mostRecentDate === todayKey ||
      mostRecentDate === yesterdayKey
    ) {
      current = 1;

      let checkDate = parseDate(mostRecentDate);

      while (true) {
        checkDate = getPreviousDate(checkDate);

        if (!activityDates.has(dateKey(checkDate))) {
          break;
        }

        current++;
      }
    }

    return { current, longest };
  }

  /* -----------------------------------------
     FORMATTING
  ----------------------------------------- */

  function formatDuration(seconds) {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${totalMinutes} min`;
    }

    return minutes
      ? `${hours} hr ${minutes} min`
      : `${hours} hr`;
  }

  function formatDays(value) {
    return `${value} ${value === 1 ? "day" : "days"}`;
  }

  function showFeedback(message) {
    if (!elements.feedback) return;

    elements.feedback.textContent = message;
    elements.feedback.hidden = false;

    clearTimeout(showFeedback.timeout);

    showFeedback.timeout = setTimeout(() => {
      elements.feedback.hidden = true;
    }, 3000);
  }

  /* -----------------------------------------
     TASK COMPLETION CIRCLE
  ----------------------------------------- */

  function renderCompletionRate(rate) {
    if (elements.taskCompletionRate) {
      elements.taskCompletionRate.textContent = `${rate}%`;
    }

    if (elements.taskCompletionRateSecondary) {
      elements.taskCompletionRateSecondary.textContent = `${rate}%`;
    }

    if (elements.progressCircle) {
      elements.progressCircle.style.setProperty(
        "--progress",
        `${rate}%`
      );

      elements.progressCircle.setAttribute(
        "aria-label",
        `${rate}% of tasks completed`
      );
    }

    if (elements.taskProgressBar) {
      elements.taskProgressBar.style.width = `${rate}%`;

      elements.taskProgressBar.setAttribute(
        "aria-valuenow",
        String(rate)
      );
    }
  }

  /* -----------------------------------------
     WEEKLY ACTIVITY
  ----------------------------------------- */

  function renderWeeklyActivity(days) {
    if (!elements.weeklyChart) return;

    const maximum = Math.max(
      1,
      ...days.map(day => day.activity)
    );

    elements.weeklyChart.innerHTML = days.map(day => {
      const height = day.activity > 0
        ? Math.max(8, (day.activity / maximum) * 100)
        : 3;

      const details = [
        `${day.tasks} tasks completed`,
        `${formatDuration(day.focus)} focused`,
        `${day.journal} journal entries`
      ].join(", ");

      return `
        <div class="weekly-chart-day" title="${details}">
          <div class="weekly-chart-track">
            <div
              class="weekly-chart-bar"
              style="height: ${height}%"
              role="img"
              aria-label="${details}"
            ></div>
          </div>

          <span class="weekly-chart-label">${day.label}</span>
        </div>
      `;
    }).join("");

    if (elements.weeklySummary) {
      const totals = days.reduce((result, day) => {
        result.tasks += day.tasks;
        result.focus += day.focus;
        result.journal += day.journal;

        return result;
      }, {
        tasks: 0,
        focus: 0,
        journal: 0
      });

      elements.weeklySummary.textContent =
        `${totals.tasks} tasks completed, ` +
        `${formatDuration(totals.focus)} focused, and ` +
        `${totals.journal} journal entries this week.`;
    }
  }

  /* -----------------------------------------
     ACTIVITY TREND
     Compare the latest 7 days with the
     previous 7 days.
  ----------------------------------------- */

  function renderTrend(days) {
    const previousWeek = days.slice(0, 7);
    const currentWeek = days.slice(7, 14);

    const previousTotal = previousWeek.reduce(
      (total, day) => total + day.activity,
      0
    );

    const currentTotal = currentWeek.reduce(
      (total, day) => total + day.activity,
      0
    );

    let label = "Getting started";
    let description = "Your activity trend will appear as you build your routine.";
    let change = "—";
    let direction = "neutral";
    let iconName = "minus";

    if (previousTotal === 0 && currentTotal > 0) {
      label = "A fresh start";
      description = "You've recorded activity in the latest 7 days.";
      change = "New activity";
      direction = "up";
      iconName = "trending-up";

    } else if (previousTotal > 0) {
      const percentage = Math.round(
        ((currentTotal - previousTotal) / previousTotal) * 100
      );

      if (percentage > 0) {
        label = "Moving upward";
        description = "Your recorded activity increased compared with the previous week.";
        change = `↑ ${percentage}%`;
        direction = "up";
        iconName = "trending-up";

      } else if (percentage < 0) {
        label = "A quieter week";
        description = "Your recorded activity decreased compared with the previous week.";
        change = `↓ ${Math.abs(percentage)}%`;
        direction = "down";
        iconName = "trending-down";

      } else {
        label = "Steady progress";
        description = "Your activity stayed at the same level as the previous week.";
        change = "0%";
        direction = "steady";
        iconName = "minus";
      }

    } else if (currentTotal === 0) {
      label = "Ready when you are";
      description = "There isn't enough recorded activity to show a trend yet.";
      change = "No data";
    }

    if (elements.trendLabel) {
      elements.trendLabel.textContent = label;
    }

    if (elements.trendDescription) {
      elements.trendDescription.textContent = description;
    }

    if (elements.trendValue) {
      elements.trendValue.textContent = change;
      elements.trendValue.dataset.trend = direction;
    }

    if (elements.trendIcon) {
      elements.trendIcon.dataset.trend = direction;
      elements.trendIcon.innerHTML =
        `<i data-lucide="${iconName}"></i>`;
    }

    renderTrendChart(days);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /* -----------------------------------------
     14-DAY TREND GRAPH
  ----------------------------------------- */

  function renderTrendChart(days) {
    if (!elements.trendChart) return;

    const width = 600;
    const height = 170;
    const paddingX = 12;
    const paddingY = 18;

    const maximum = Math.max(
      1,
      ...days.map(day => day.activity)
    );

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const points = days.map((day, index) => {
      const x = paddingX +
        (index / Math.max(1, days.length - 1)) * usableWidth;

      const y = height - paddingY -
        (day.activity / maximum) * usableHeight;

      return { x, y, day };
    });

    const line = points.map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    }).join(" ");

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const area = [
      line,
      `L ${lastPoint.x} ${height - paddingY}`,
      `L ${firstPoint.x} ${height - paddingY}`,
      "Z"
    ].join(" ");

    const markers = points.map((point, index) => {
      const isLast = index === points.length - 1;

      return `
        <circle
          cx="${point.x}"
          cy="${point.y}"
          r="${isLast ? 5 : 3}"
          class="${isLast ? "trend-point-current" : "trend-point"}"
        >
          <title>${point.day.dateLabel}: ${point.day.activity} activity units</title>
        </circle>
      `;
    }).join("");

    const labels = [
      { index: 0, text: points[0].day.dateLabel },
      { index: 6, text: points[6].day.dateLabel },
      { index: 13, text: points[13].day.dateLabel }
    ];

    const axisLabels = labels.map(item => {
      const point = points[item.index];

      return `
        <text
          x="${point.x}"
          y="${height - 2}"
          text-anchor="${item.index === 0 ? "start" : item.index === 13 ? "end" : "middle"}"
          class="trend-axis-label"
        >${item.text}</text>
      `;
    }).join("");

    elements.trendChart.innerHTML = `
      <svg
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="Activity trend over the last 14 days"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="progressTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#78977A" stop-opacity=".28"/>
            <stop offset="100%" stop-color="#78977A" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <path
          d="${area}"
          fill="url(#progressTrendGradient)"
        />

        <path
          d="${line}"
          class="trend-line"
          fill="none"
          stroke="#78977A"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        ${markers}
        ${axisLabels}
      </svg>
    `;
  }

  /* -----------------------------------------
     UPDATE DASHBOARD
  ----------------------------------------- */

  function updateProgress() {
    const tasks = getTasks();
    const sessions = getFocusSessions();
    const entries = getJournalEntries();

    const completedTasks = tasks.filter(
      task => task.completed
    ).length;

    const pendingTasks = tasks.length - completedTasks;

    const completionRate = tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;

    const focusSeconds = sessions.reduce((total, session) => {
      return total + (Number(session.duration) || 0);
    }, 0);

    const activityDates = getActivityDateSet(
      tasks,
      sessions,
      entries
    );

    const streaks = calculateStreaks(activityDates);

    // TASK COUNTS
    if (elements.totalTasks) {
      elements.totalTasks.textContent = tasks.length;
    }

    if (elements.completedTasks) {
      elements.completedTasks.textContent = completedTasks;
    }

    if (elements.completedTasksSecondary) {
      elements.completedTasksSecondary.textContent = completedTasks;
    }

    if (elements.pendingTasks) {
      elements.pendingTasks.textContent = pendingTasks;
    }

    renderCompletionRate(completionRate);

    if (elements.taskLegendCompleted) {
      elements.taskLegendCompleted.textContent = completedTasks;
    }

    if (elements.taskLegendPending) {
      elements.taskLegendPending.textContent = pendingTasks;
    }

    // FOCUS
    if (elements.totalFocusSessions) {
      elements.totalFocusSessions.textContent = sessions.length;
    }

    if (elements.totalFocusTime) {
      elements.totalFocusTime.textContent =
        formatDuration(focusSeconds);
    }

    if (elements.focusProgressBar) {
      const focusGoal = 120;
      const focusMinutes = Math.floor(focusSeconds / 60);

      const focusProgress = Math.min(
        100,
        Math.round((focusMinutes / focusGoal) * 100)
      );

      elements.focusProgressBar.style.width =
        `${focusProgress}%`;

      elements.focusProgressBar.setAttribute(
        "aria-valuenow",
        String(focusProgress)
      );
    }

    // JOURNAL
    if (elements.totalJournalEntries) {
      elements.totalJournalEntries.textContent = entries.length;
    }

    // STREAKS
    if (elements.currentStreak) {
      elements.currentStreak.textContent =
        formatDays(streaks.current);
    }

    if (elements.currentStreakSecondary) {
      elements.currentStreakSecondary.textContent =
        formatDays(streaks.current);
    }

    if (elements.longestStreak) {
      elements.longestStreak.textContent =
        formatDays(streaks.longest);
    }

    // WEEKLY ACTIVITY
    const weeklyActivity = getDailyActivity(
      tasks,
      sessions,
      entries,
      7
    );

    renderWeeklyActivity(weeklyActivity);

    // 14-DAY TREND
    const trendActivity = getDailyActivity(
      tasks,
      sessions,
      entries,
      14
    );

    renderTrend(trendActivity);
  }

  /* -----------------------------------------
     EVENTS
  ----------------------------------------- */

  elements.refreshButton?.addEventListener("click", () => {
    updateProgress();
    showFeedback("Your progress has been refreshed.");
  });

  window.addEventListener("storage", event => {
    if (
      event.key === TASKS_KEY ||
      event.key === FOCUS_KEY ||
      event.key === JOURNAL_KEY
    ) {
      updateProgress();
    }
  });

  // INITIALIZE
  updateProgress();

})();