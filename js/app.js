
/* =========================================
   LIFEOS — HOMEPAGE FUNCTIONALITY
   File: js/app.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* ---------- STORAGE ---------- */

    const STORAGE_KEYS = {
        tasks: "lifeos_tasks",
        focusSessions: "lifeos_focus_sessions",
        calendarEvents: "lifeos_calendar_events",
        readNotifications: "lifeos_read_notifications"
    };

    function readStorage(key, fallback = []) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch (error) {
            console.error(`Could not read ${key}:`, error);
            return fallback;
        }
    }

    function saveStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Could not save ${key}:`, error);
            return false;
        }
    }

    /* ---------- ELEMENT HELPERS ---------- */

    const get = (id) => document.getElementById(id);

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    /* ---------- DATE HELPERS ---------- */

    function localDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatReminderDate(dateString) {
        if (!dateString) return "";

        const parts = dateString.split("-").map(Number);

        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            return dateString;
        }

        const date = new Date(parts[0], parts[1] - 1, parts[2]);

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
    }

    /* ---------- GREETING ---------- */

    function updateGreeting() {
        const greetingLabel = get("greetingLabel");
        const greetingTitle = get("greetingTitle");
        const taskSummary = get("taskSummary");

        const hour = new Date().getHours();

        let greeting = "Good evening";

        if (hour < 12) {
            greeting = "Good morning";
        } else if (hour < 18) {
            greeting = "Good afternoon";
        }

        if (greetingLabel) {
            greetingLabel.textContent = greeting;
        }

        if (greetingTitle) {
            greetingTitle.textContent = "Make today count.";
        }

        if (taskSummary) {
            const tasks = readStorage(STORAGE_KEYS.tasks);
            const pending = tasks.filter(task => !task.completed).length;

            taskSummary.textContent = pending === 0
                ? "You're all caught up. Enjoy your day."
                : `You have ${pending} task${pending === 1 ? "" : "s"} to work on.`;
        }
    }

    /* ---------- MINI CALENDAR ---------- */

    const calendarTitle = get("calendarTitle");
    const calendarDays = get("calendarDays");
    const previousMonth = get("prevMonth");
    const nextMonth = get("nextMonth");

    let displayedMonth = new Date();
    displayedMonth.setDate(1);

    function renderMiniCalendar() {
        if (!calendarDays || !calendarTitle) return;

        calendarDays.replaceChildren();

        const year = displayedMonth.getFullYear();
        const month = displayedMonth.getMonth();

        calendarTitle.textContent = displayedMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousMonthDays = new Date(year, month, 0).getDate();

        const today = new Date();

        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

        for (let index = 0; index < totalCells; index++) {
            let dayNumber;
            let outsideMonth = false;
            let date;

            if (index < firstDay) {
                dayNumber = previousMonthDays - firstDay + index + 1;
                date = new Date(year, month - 1, dayNumber);
                outsideMonth = true;
            } else if (index >= firstDay + daysInMonth) {
                dayNumber = index - firstDay - daysInMonth + 1;
                date = new Date(year, month + 1, dayNumber);
                outsideMonth = true;
            } else {
                dayNumber = index - firstDay + 1;
                date = new Date(year, month, dayNumber);
            }

            const day = createElement("button", "calendar-day", dayNumber);
            day.type = "button";
            day.setAttribute("aria-label", date.toDateString());

            if (outsideMonth) {
                day.classList.add("outside-month");
            }

            if (
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()
            ) {
                day.classList.add("today");
                day.setAttribute("aria-current", "date");
            }

            day.addEventListener("click", () => {
                window.location.href =
                    `pages/calendar.html?date=${encodeURIComponent(localDateKey(date))}`;
            });

            calendarDays.appendChild(day);
        }
    }

    previousMonth?.addEventListener("click", () => {
        displayedMonth.setMonth(displayedMonth.getMonth() - 1);
        renderMiniCalendar();
    });

    nextMonth?.addEventListener("click", () => {
        displayedMonth.setMonth(displayedMonth.getMonth() + 1);
        renderMiniCalendar();
    });

    renderMiniCalendar();

    /* ---------- TASK PREVIEW ---------- */

    const tasksList = get("tasksList");
    const completedCount = get("completedCount");

    function renderTasks() {
        if (!tasksList) return;

        const tasks = readStorage(STORAGE_KEYS.tasks);

        tasksList.replaceChildren();

        if (tasks.length === 0) {
            tasksList.appendChild(createElement(
                "p",
                "empty-preview",
                "No tasks yet. Add your first task on the Tasks page."
            ));

            if (completedCount) {
                completedCount.textContent = "0 completed";
            }

            updateGreeting();
            return;
        }

        const sortedTasks = [...tasks].sort((a, b) => {
            return Number(Boolean(a.completed)) - Number(Boolean(b.completed));
        });

        sortedTasks.slice(0, 5).forEach(task => {
            const item = createElement("div", "task-item");
            const checkbox = createElement("input", "task-checkbox");

            checkbox.type = "checkbox";
            checkbox.checked = Boolean(task.completed);
            checkbox.setAttribute("aria-label", `Complete ${task.name || "task"}`);

            const details = createElement("div", "task-details");
            const name = createElement(
                "span",
                "task-name",
                task.name || "Untitled task"
            );

            details.appendChild(name);

            if (task.date || task.time) {
                details.appendChild(createElement(
                    "span",
                    "task-meta",
                    [task.date, task.time].filter(Boolean).join(" • ")
                ));
            }

            if (task.completed) {
                item.classList.add("completed");
            }

            checkbox.addEventListener("change", () => {
                const currentTasks = readStorage(STORAGE_KEYS.tasks);
                const taskIndex = currentTasks.findIndex(
                    entry => entry.id === task.id
                );

                if (taskIndex === -1) return;

                currentTasks[taskIndex].completed = checkbox.checked;

                if (!saveStorage(STORAGE_KEYS.tasks, currentTasks)) {
                    checkbox.checked = !checkbox.checked;
                    return;
                }

                renderTasks();
                renderProgress();
                renderNotifications();
            });

            item.append(checkbox, details);
            tasksList.appendChild(item);
        });

        if (completedCount) {
            const completed = tasks.filter(task => task.completed).length;
            completedCount.textContent = `${completed} completed`;
        }

        updateGreeting();
    }

    /* ---------- FOCUS TIMER ---------- */

    const timerDisplay = get("timerDisplay");
    const timerStart = get("timerStart");
    const timerReset = get("timerReset");

    let timerDuration = 25 * 60;
    let remainingSeconds = timerDuration;
    let timerInterval = null;
    let timerRunning = false;

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    }

    function updateTimerDisplay() {
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(remainingSeconds);
        }

        if (timerStart) {
            timerStart.textContent = timerRunning ? "Pause" : "Start";
        }
    }

    function finishFocusSession() {
        clearInterval(timerInterval);

        timerInterval = null;
        timerRunning = false;
        remainingSeconds = 0;

        updateTimerDisplay();

        const sessions = readStorage(STORAGE_KEYS.focusSessions);

        sessions.push({
            id: `focus-${Date.now()}`,
            duration: timerDuration / 60,
            completedAt: new Date().toISOString()
        });

        saveStorage(STORAGE_KEYS.focusSessions, sessions);

        renderProgress();
    }

    function startTimer() {
        if (timerRunning) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerRunning = false;
            updateTimerDisplay();
            return;
        }

        if (remainingSeconds <= 0) {
            remainingSeconds = timerDuration;
        }

        timerRunning = true;
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            if (remainingSeconds > 0) {
                remainingSeconds--;
                updateTimerDisplay();
            }

            if (remainingSeconds <= 0) {
                finishFocusSession();
            }
        }, 1000);
    }

    function resetTimer() {
        clearInterval(timerInterval);

        timerInterval = null;
        timerRunning = false;
        remainingSeconds = timerDuration;

        updateTimerDisplay();
    }

    timerStart?.addEventListener("click", startTimer);
    timerReset?.addEventListener("click", resetTimer);

    updateTimerDisplay();

    /* ---------- PROGRESS PREVIEW ---------- */

    function renderProgress() {
        const tasks = readStorage(STORAGE_KEYS.tasks);
        const sessions = readStorage(STORAGE_KEYS.focusSessions);

        const completedTasks = tasks.filter(task => task.completed).length;
        const totalTasks = tasks.length;

        const progressTasksDone = get("progressTasksDone");
        const progressStreak = get("progressStreak");
        const progressGoal = get("progressGoal");
        const progressFill = get("progressFill");

        if (progressTasksDone) {
            progressTasksDone.textContent = completedTasks;
        }

        if (progressGoal) {
            progressGoal.textContent = totalTasks;
        }

        if (progressFill) {
            const percentage = totalTasks
                ? (completedTasks / totalTasks) * 100
                : 0;

            progressFill.style.width = `${percentage}%`;
            progressFill.setAttribute("aria-valuenow", String(Math.round(percentage)));
        }

        if (progressStreak) {
            const completedDates = new Set(
                tasks
                    .filter(task => task.completed && task.completedAt)
                    .map(task => new Date(task.completedAt).toDateString())
            );

            let streak = 0;
            const date = new Date();

            while (completedDates.has(date.toDateString())) {
                streak++;
                date.setDate(date.getDate() - 1);
            }

            progressStreak.textContent = streak;
        }

        return sessions;
    }

    /* ---------- NOTIFICATIONS ---------- */

    const notificationBtn = get("notificationBtn");
    const notificationPanel = get("notificationPanel");
    const notificationList = get("notificationList");
    const closeNotifications = get("closeNotifications");

    let notificationItems = [];

    function getCurrentNotifications() {
        const today = localDateKey();
        const notifications = [];

        const tasks = readStorage(STORAGE_KEYS.tasks);
        const events = readStorage(STORAGE_KEYS.calendarEvents);

        // Incomplete tasks due today or earlier.
        tasks.forEach(task => {
            if (task.completed || !task.date) return;

            if (task.date > today) return;

            const isOverdue = task.date < today;
            const taskName = task.name || "Untitled task";

            notifications.push({
                id: `task-${task.id ?? `${taskName}-${task.date}`}`,
                type: "task",
                title: isOverdue ? "Overdue task" : "Task due today",
                message: taskName,
                date: task.date,
                icon: isOverdue ? "alert-circle" : "check-circle",
                status: isOverdue ? "Overdue" : "Due today"
            });
        });

        // Calendar events scheduled for today.
        events.forEach(event => {
            if (!event.date || event.date !== today) return;

            const eventName = event.title || "Untitled event";

            notifications.push({
                id: `event-${event.id ?? `${eventName}-${event.date}`}`,
                type: "event",
                title: "Calendar event today",
                message: eventName,
                date: event.date,
                time: event.time || "",
                icon: "calendar-days",
                status: "Today"
            });
        });

        return notifications;
    }

    function getReadNotifications() {
        const saved = readStorage(STORAGE_KEYS.readNotifications, []);
        return Array.isArray(saved) ? saved : [];
    }

    function updateNotificationDot(unreadCount) {
        if (!notificationBtn) return;

        const dot = notificationBtn.querySelector(".notification-dot");

        if (dot) {
            dot.hidden = unreadCount === 0;
        }

        notificationBtn.classList.toggle("has-unread", unreadCount > 0);

        notificationBtn.setAttribute(
            "aria-label",
            unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
        );
    }

    function renderNotifications() {
        if (!notificationBtn || !notificationPanel || !notificationList) return;

        notificationItems = getCurrentNotifications();

        const readItems = getReadNotifications();
        const unreadItems = notificationItems.filter(
            item => !readItems.includes(item.id)
        );

        updateNotificationDot(unreadItems.length);

        notificationList.replaceChildren();

        if (notificationItems.length === 0) {
            const empty = createElement("div", "notification-empty");

            const icon = createElement("i");
            icon.setAttribute("data-lucide", "bell-ring");

            empty.append(
                icon,
                createElement("strong", "", "You're all caught up!"),
                createElement("p", "", "No tasks due or calendar events scheduled for today.")
            );

            notificationList.appendChild(empty);
        } else {
            notificationItems.forEach(item => {
                const isUnread = !readItems.includes(item.id);

                const notification = createElement(
                    "article",
                    `notification-item${isUnread ? " unread" : ""}`
                );

                const iconWrap = createElement("div", "notification-item-icon");
                const icon = createElement("i");
                icon.setAttribute("data-lucide", item.icon);
                iconWrap.appendChild(icon);

                const details = createElement("div", "notification-item-details");

                details.append(
                    createElement("strong", "", item.title),
                    createElement("p", "", item.message)
                );

                const metaText = item.time
                    ? `${item.status} · ${item.time}`
                    : item.status;

                details.appendChild(
                    createElement("span", "notification-item-meta", metaText)
                );

                notification.append(iconWrap, details);

                if (isUnread) {
                    notification.appendChild(
                        createElement("span", "notification-unread-dot")
                    );
                }

                notificationList.appendChild(notification);
            });
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function markNotificationsAsRead() {
        const readItems = getReadNotifications();
        const updatedReadItems = new Set(readItems);

        notificationItems.forEach(item => {
            updatedReadItems.add(item.id);
        });

        saveStorage(
            STORAGE_KEYS.readNotifications,
            [...updatedReadItems]
        );

        renderNotifications();
    }

    function openNotifications() {
        if (!notificationPanel || !notificationBtn) return;

        notificationPanel.hidden = false;
        notificationBtn.setAttribute("aria-expanded", "true");

        // Opening the panel marks the current reminders as read.
        markNotificationsAsRead();
    }

    function closeNotificationPanel() {
        if (!notificationPanel || !notificationBtn) return;

        notificationPanel.hidden = true;
        notificationBtn.setAttribute("aria-expanded", "false");
    }

    if (notificationBtn && notificationPanel && notificationList) {
        renderNotifications();

        notificationBtn.addEventListener("click", event => {
            event.stopPropagation();

            if (notificationPanel.hidden) {
                openNotifications();
            } else {
                closeNotificationPanel();
            }
        });

        closeNotifications?.addEventListener(
            "click",
            closeNotificationPanel
        );

        document.addEventListener("click", event => {
            if (
                !notificationPanel.contains(event.target) &&
                !notificationBtn.contains(event.target)
            ) {
                closeNotificationPanel();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeNotificationPanel();
            }
        });
    }

    /* ---------- MOBILE SIDEBAR ---------- */

    const sidebar = get("sidebar");
    const menuToggle = get("menuToggle");

    if (sidebar && menuToggle) {
        menuToggle.addEventListener("click", () => {
            const isOpen = sidebar.classList.toggle("open");

            menuToggle.setAttribute("aria-expanded", String(isOpen));
        });

        sidebar.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                sidebar.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                sidebar.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    /* ---------- HOMEPAGE SEARCH ---------- */

    const searchInput = get("searchInput");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();

            const searchableCards = document.querySelectorAll(
                ".dashboard-card, .welcome-card"
            );

            searchableCards.forEach(card => {
                const content = card.textContent.toLowerCase();
                card.hidden = query !== "" && !content.includes(query);
            });
        });
    }

    /* ---------- CROSS-TAB UPDATES ---------- */

    window.addEventListener("storage", event => {
        if (
            event.key === STORAGE_KEYS.tasks ||
            event.key === STORAGE_KEYS.focusSessions
        ) {
            renderTasks();
            renderProgress();
        }

        if (
            event.key === STORAGE_KEYS.tasks ||
            event.key === STORAGE_KEYS.calendarEvents ||
            event.key === STORAGE_KEYS.readNotifications
        ) {
            renderNotifications();
        }
    });

    /* ---------- INITIALIZE ---------- */

    renderTasks();
    renderProgress();
    renderNotifications();
    updateGreeting();

    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
});
