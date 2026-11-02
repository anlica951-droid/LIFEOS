
/* =========================================
   LIFEOS — CALENDAR FUNCTIONALITY
   File: js/calendar.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* ---------- STORAGE ---------- */

    const STORAGE_KEY = "lifeos_calendar_events";

    function readEvents() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const events = saved ? JSON.parse(saved) : [];
            return Array.isArray(events) ? events : [];
        } catch (error) {
            console.error("Could not load calendar events:", error);
            return [];
        }
    }

    function saveEvents(events) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
            return true;
        } catch (error) {
            console.error("Could not save calendar events:", error);
            showFeedback("Unable to save your event. Check your browser storage.");
            return false;
        }
    }

    /* ---------- ELEMENT HELPERS ---------- */

    const get = id => document.getElementById(id);

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

    function localDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseLocalDate(value) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    function formatDate(value, options = {
        month: "long",
        day: "numeric",
        year: "numeric"
    }) {
        if (!value) return "";

        return parseLocalDate(value).toLocaleDateString("en-US", options);
    }

    function showFeedback(message, isError = true) {
        const feedback = get("calendarFeedback");

        if (!feedback) return;

        feedback.textContent = message;
        feedback.classList.toggle("error", isError);
    }

    /* ---------- ELEMENTS ---------- */

    const calendarDays = get("fullCalendarDays");
    const calendarTitle = get("fullCalendarTitle");

    const previousButton = get("calendarPrevious");
    const nextButton = get("calendarNext");
    const todayButton = get("calendarToday");

    const selectedDateLabel = get("selectedDateLabel");
    const eventsList = get("calendarEventsList");

    const eventDialog = get("calendarEventDialog");
    const openEventButton = get("addCalendarEvent");
    const closeEventButton = get("closeCalendarDialog");
    const cancelEventButton = get("cancelCalendarEvent");

    const eventForm = get("calendarEventForm");
    const eventTitleInput = get("calendarEventTitle");
    const eventDateInput = get("calendarEventDate");
    const eventTimeInput = get("calendarEventTime");
    const eventDescriptionInput = get("calendarEventDescription");

    /* ---------- CALENDAR STATE ---------- */

    const today = new Date();

    let displayedMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    let selectedDate = localDateString(today);

    /* ---------- RENDER CALENDAR ---------- */

    function renderCalendar() {
        if (!calendarDays || !calendarTitle) return;

        calendarDays.replaceChildren();

        const year = displayedMonth.getFullYear();
        const month = displayedMonth.getMonth();

        calendarTitle.textContent = displayedMonth.toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        );

        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousMonthDays = new Date(year, month, 0).getDate();

        const totalCells = Math.ceil(
            (firstWeekday + daysInMonth) / 7
        ) * 7;

        const events = readEvents();

        for (let index = 0; index < totalCells; index++) {
            let dayNumber;
            let date;
            let outsideMonth = false;

            if (index < firstWeekday) {
                dayNumber = previousMonthDays - firstWeekday + index + 1;
                date = new Date(year, month - 1, dayNumber);
                outsideMonth = true;
            } else if (index >= firstWeekday + daysInMonth) {
                dayNumber = index - firstWeekday - daysInMonth + 1;
                date = new Date(year, month + 1, dayNumber);
                outsideMonth = true;
            } else {
                dayNumber = index - firstWeekday + 1;
                date = new Date(year, month, dayNumber);
            }

            const dateValue = localDateString(date);
            const dayButton = createElement(
                "button",
                "",
                String(dayNumber)
            );

            dayButton.type = "button";
            dayButton.setAttribute(
                "aria-label",
                formatDate(dateValue, {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                })
            );

            if (outsideMonth) {
                dayButton.classList.add("outside-month");
            }

            if (dateValue === localDateString(today)) {
                dayButton.classList.add("today");
                dayButton.setAttribute("aria-current", "date");
            }

            if (dateValue === selectedDate) {
                dayButton.classList.add("selected");
                dayButton.setAttribute("aria-pressed", "true");
            } else {
                dayButton.setAttribute("aria-pressed", "false");
            }

            const hasEvent = events.some(
                event => event.date === dateValue
            );

            if (hasEvent) {
                dayButton.classList.add("has-event");
            }

            dayButton.addEventListener("click", () => {
                selectedDate = dateValue;

                if (outsideMonth) {
                    displayedMonth = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        1
                    );
                }

                renderCalendar();
                renderSelectedDate();
            });

            calendarDays.appendChild(dayButton);
        }
    }

    /* ---------- SELECTED DATE EVENTS ---------- */

    function renderSelectedDate() {
        if (selectedDateLabel) {
            selectedDateLabel.textContent = formatDate(selectedDate);
        }

        if (!eventsList) return;

        eventsList.replaceChildren();

        const events = readEvents()
            .filter(event => event.date === selectedDate)
            .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

        if (events.length === 0) {
            const empty = createElement("div", "empty-state");

            const icon = createElement("div", "empty-state-icon", "◷");
            const heading = createElement("h3", "", "Nothing scheduled");
            const description = createElement(
                "p",
                "",
                "There are no events on this date. Add something when you need to."
            );

            empty.append(icon, heading, description);
            eventsList.appendChild(empty);
            return;
        }

        events.forEach(event => {
            const item = createElement("article", "calendar-event-item");
            const color = createElement("span", "event-color");
            const details = createElement("div", "event-details");

            const title = createElement(
                "h3",
                "event-title",
                event.title || "Untitled event"
            );

            const metaParts = [];

            if (event.time) {
                metaParts.push(event.time);
            }

            if (event.description) {
                metaParts.push(event.description);
            }

            const meta = createElement(
                "p",
                "event-meta",
                metaParts.join(" • ") || "No additional details"
            );

            const deleteButton = createElement(
                "button",
                "btn-icon",
                "×"
            );

            deleteButton.type = "button";
            deleteButton.setAttribute(
                "aria-label",
                `Delete ${event.title || "event"}`
            );

            deleteButton.addEventListener("click", () => {
                deleteEvent(event.id);
            });

            details.append(title, meta);
            item.append(color, details, deleteButton);
            eventsList.appendChild(item);
        });
    }

    /* ---------- ADD EVENT ---------- */

    function openDialog() {
        if (!eventDialog) return;

        if (eventDateInput) {
            eventDateInput.value = selectedDate;
        }

        if (typeof eventDialog.showModal === "function") {
            eventDialog.showModal();
        } else {
            eventDialog.setAttribute("open", "");
        }
    }

    function closeDialog() {
        if (!eventDialog) return;

        if (typeof eventDialog.close === "function") {
            eventDialog.close();
        } else {
            eventDialog.removeAttribute("open");
        }
    }

    function addEvent(event) {
        event.preventDefault();

        if (!eventTitleInput || !eventDateInput) return;

        const title = eventTitleInput.value.trim();
        const date = eventDateInput.value;
        const time = eventTimeInput ? eventTimeInput.value : "";
        const description = eventDescriptionInput
            ? eventDescriptionInput.value.trim()
            : "";

        if (!title || !date) {
            showFeedback("Please enter an event title and date.");
            return;
        }

        const events = readEvents();

        const newEvent = {
            id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            date,
            time,
            description,
            createdAt: new Date().toISOString()
        };

        events.push(newEvent);

        if (!saveEvents(events)) return;

        selectedDate = date;

        const parsedDate = parseLocalDate(date);

        displayedMonth = new Date(
            parsedDate.getFullYear(),
            parsedDate.getMonth(),
            1
        );

        eventForm.reset();
        closeDialog();

        renderCalendar();
        renderSelectedDate();

        showFeedback("Event added successfully.", false);
    }

    /* ---------- DELETE EVENT ---------- */

    function deleteEvent(eventId) {
        const events = readEvents();
        const updatedEvents = events.filter(
            event => event.id !== eventId
        );

        if (updatedEvents.length === events.length) return;

        if (!saveEvents(updatedEvents)) return;

        renderCalendar();
        renderSelectedDate();

        showFeedback("Event deleted.", false);
    }

    /* ---------- NAVIGATION ---------- */

    if (previousButton) {
        previousButton.addEventListener("click", () => {
            displayedMonth.setMonth(displayedMonth.getMonth() - 1);
            renderCalendar();
        });
    }

    if (nextButton) {
        nextButton.addEventListener("click", () => {
            displayedMonth.setMonth(displayedMonth.getMonth() + 1);
            renderCalendar();
        });
    }

    if (todayButton) {
        todayButton.addEventListener("click", () => {
            displayedMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

            selectedDate = localDateString(today);

            renderCalendar();
            renderSelectedDate();
        });
    }

    /* ---------- DIALOG CONTROLS ---------- */

    if (openEventButton) {
        openEventButton.addEventListener("click", openDialog);
    }

    if (closeEventButton) {
        closeEventButton.addEventListener("click", closeDialog);
    }

    if (cancelEventButton) {
        cancelEventButton.addEventListener("click", closeDialog);
    }

    if (eventForm) {
        eventForm.addEventListener("submit", addEvent);
    }

    /* ---------- OPEN DATE FROM HOMEPAGE ---------- */

    const requestedDate = new URLSearchParams(
        window.location.search
    ).get("date");

    if (
        requestedDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ) {
        const parsedDate = parseLocalDate(requestedDate);

        if (localDateString(parsedDate) === requestedDate) {
            selectedDate = requestedDate;

            displayedMonth = new Date(
                parsedDate.getFullYear(),
                parsedDate.getMonth(),
                1
            );
        }
    }

    /* ---------- CROSS-TAB UPDATES ---------- */

    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY) {
            renderCalendar();
            renderSelectedDate();
        }
    });

    /* ---------- INITIALIZE ---------- */

    if (eventDateInput && !eventDateInput.value) {
        eventDateInput.value = selectedDate;
    }

    renderCalendar();
    renderSelectedDate();

    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
});
