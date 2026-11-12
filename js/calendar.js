
/* =========================================
   LIFEOS — CALENDAR + VISIBLE PAPER NOTES
   File: js/calendar.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const EVENT_KEY = "lifeos_calendar_events";
    const NOTE_KEY = "lifeos_calendar_sticky_notes";

    const $ = id => document.getElementById(id);

    const calendarDays = $("fullCalendarDays");
    const calendarTitle = $("fullCalendarTitle");
    const previousButton = $("calendarPrevious");
    const nextButton = $("calendarNext");
    const todayButton = $("calendarToday");

    const selectedDateLabel = $("selectedDateLabel");
    const eventsList = $("calendarEventsList");

    const eventDialog = $("calendarEventDialog");
    const eventForm = $("calendarEventForm");
    const eventTitleInput = $("calendarEventTitle");
    const eventDateInput = $("calendarEventDate");
    const eventTimeInput = $("calendarEventTime");
    const eventDescriptionInput = $("calendarEventDescription");

    const noteDialog = $("stickyNoteDialog");
    const noteForm = $("stickyNoteForm");
    const noteTitleInput = $("stickyNoteTitle");
    const noteBodyInput = $("stickyNoteBody");
    const noteDateInput = $("stickyNoteDate");
    const noteDialogTitle = $("stickyNoteDialogTitle");
    const noteColors = $("stickyNoteColors");
    const deleteNoteButton = $("deleteStickyNote");

    const colors = [
        "#f3e9ad",
        "#f2d6d1",
        "#dce8d5",
        "#dce5f0",
        "#eadff0"
    ];

    const today = new Date();
    const todayString = dateString(today);

    let selectedDate = todayString;
    let displayedMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    let editingNoteId = null;
    let editingEventId = null;
    let selectedColor = colors[0];

    let notesList = null;
    let addNoteButton = null;

    /* =====================================
       STORAGE
    ===================================== */

    function read(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error("Calendar storage error:", error);
            return [];
        }
    }

    function write(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("Calendar save error:", error);
            feedback("Unable to save. Check your browser storage.");
            return false;
        }
    }

    const getEvents = () => read(EVENT_KEY);
    const getNotes = () => read(NOTE_KEY);

    /* =====================================
       HELPERS
    ===================================== */

    function element(tag, className, text) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;

        return node;
    }

    function id(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function dateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
            return null;
        }

        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);

        return dateString(date) === value ? date : null;
    }

    function formatDate(value, options = {
        month: "long",
        day: "numeric",
        year: "numeric"
    }) {
        const date = parseDate(value);

        return date
            ? date.toLocaleDateString("en-US", options)
            : "";
    }

    function feedback(message, error = true) {
        const box = $("calendarFeedback");
        if (!box) return;

        box.textContent = message;
        box.hidden = false;
        box.classList.toggle("error", error);
    }

    function openDialog(dialog) {
        if (!dialog) return;

        if (typeof dialog.showModal === "function") {
            if (!dialog.open) dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
        }
    }

    function closeDialog(dialog) {
        if (!dialog) return;

        if (typeof dialog.close === "function" && dialog.open) {
            dialog.close();
        } else {
            dialog.removeAttribute("open");
        }
    }

    function showMonthFor(value) {
        const date = parseDate(value);
        if (!date) return;

        displayedMonth = new Date(
            date.getFullYear(),
            date.getMonth(),
            1
        );

        selectedDate = value;
    }

    function refreshIcons() {
        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
        }
    }

    /* =====================================
       NOTES PANEL STYLES
    ===================================== */

    function addNotesPanelStyles() {
        if ($("calendarNotesPanelStyles")) return;

        const style = document.createElement("style");
        style.id = "calendarNotesPanelStyles";

        style.textContent = `
            .calendar-notes-section {
                width: 100%;
                margin-top: 22px;
            }

            .calendar-notes-subtitle {
                margin: 5px 0 0;
                color: #899287;
                font-size: 11px;
                line-height: 1.5;
            }

            .calendar-notes-list {
                display: flex;
                flex-direction: column;
                gap: 13px;
                width: 100%;
                margin-top: 15px;
            }

            .calendar-notes-empty {
                padding: 24px 14px;
                text-align: center;
                border: 1px dashed #dce3d8;
                border-radius: 14px;
                background: #f7f8f3;
                color: #879087;
                font-size: 12px;
                line-height: 1.6;
            }

            .calendar-notes-empty-icon {
                display: block;
                margin-bottom: 9px;
                color: #8da18b;
            }

            .calendar-paper-card {
                position: relative;
                display: block;
                width: 100%;
                padding: 17px 16px 15px;
                border: 0;
                border-left: 4px solid rgba(65, 75, 55, .22);
                border-radius: 5px 12px 12px 5px;
                color: #303a32;
                text-align: left;
                cursor: pointer;
                box-shadow: 0 3px 10px rgba(45, 55, 40, .09);
                transition: transform .2s ease, box-shadow .2s ease;
                font-family: "DM Sans", sans-serif;
            }

            .calendar-paper-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 7px 16px rgba(45, 55, 40, .13);
            }

            .calendar-paper-card::before {
                content: "";
                position: absolute;
                top: 0;
                right: 18px;
                width: 38px;
                height: 8px;
                background: rgba(255, 255, 255, .48);
            }

            .calendar-paper-title {
                display: block;
                margin: 0 0 9px;
                padding-right: 25px;
                color: #303a32;
                font-size: 13px;
                font-weight: 700;
                line-height: 1.5;
                overflow-wrap: anywhere;
            }

            .calendar-paper-body {
                display: block;
                color: #596458;
                font-size: 12px;
                line-height: 1.65;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            .calendar-paper-date {
                display: block;
                margin-top: 13px;
                padding-top: 9px;
                border-top: 1px solid rgba(65, 75, 55, .12);
                color: #687768;
                font-size: 10px;
                font-weight: 600;
            }

            .calendar-notes-heading {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
            }

            .calendar-notes-heading h3 {
                margin: 0;
            }

            .calendar-note-count {
                color: #8a9487;
                font-size: 10px;
                margin-top: 4px;
            }

            .calendar-note-indicator {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 16px;
                height: 16px;
                margin-left: 5px;
                padding: 0 4px;
                border-radius: 20px;
                background: #e5ecdf;
                color: #50664e;
                font-size: 9px;
                font-weight: 700;
            }

            @media (max-width: 700px) {
                .calendar-paper-card {
                    padding: 14px;
                }

                .calendar-paper-title {
                    font-size: 12px;
                }

                .calendar-paper-body {
                    font-size: 11px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       CREATE NOTES PANEL AUTOMATICALLY
    ===================================== */

    function createNotesPanel() {
        if (!eventsList) return;

        addNotesPanelStyles();

        const existing = $("calendarNotesList");

        if (existing) {
            notesList = existing;
            addNoteButton = $("addCalendarNote");
            return;
        }

        const section = element("section", "calendar-notes-section");
        section.classList.add("calendar-notes-section");

        const divider = element("div", "events-panel-divider");

        const heading = element("div", "calendar-notes-heading");

        const headingCopy = element("div");
        const title = element("h3", "", "My paper notes");
        const subtitle = element(
            "p",
            "calendar-notes-subtitle",
            "Your reminders for the selected date."
        );

        const count = element("div", "calendar-note-count");
        count.id = "calendarNoteCount";

        headingCopy.append(title, subtitle, count);

        addNoteButton = element("button", "events-add-button");
        addNoteButton.type = "button";
        addNoteButton.id = "addCalendarNote";
        addNoteButton.title = "Create a note";
        addNoteButton.setAttribute("aria-label", "Create a note");
        addNoteButton.innerHTML = '<i data-lucide="plus"></i>';

        addNoteButton.addEventListener("click", () => {
            openNoteDialog();
        });

        heading.append(headingCopy, addNoteButton);

        notesList = element("div", "calendar-notes-list");
        notesList.id = "calendarNotesList";
        notesList.setAttribute("aria-live", "polite");

        section.append(divider, heading, notesList);

        eventsList.insertAdjacentElement("afterend", section);

        refreshIcons();
    }

    /* =====================================
       NOTE COLORS
    ===================================== */

    function setColor(color) {
        selectedColor = colors.includes(color) ? color : colors[0];

        noteColors?.querySelectorAll(".sticky-note-color").forEach(button => {
            const active = button.dataset.color === selectedColor;

            button.classList.toggle("selected", active);
            button.setAttribute("aria-pressed", String(active));
        });
    }

    /* =====================================
       EVENT DIALOG
    ===================================== */

    function openEventDialog(eventId = null) {
        editingEventId = eventId;

        if (!eventForm) return;

        eventForm.reset();

        const event = eventId
            ? getEvents().find(item => item.id === eventId)
            : null;

        if (eventId && !event) {
            editingEventId = null;
            return;
        }

        const heading = eventDialog?.querySelector("[data-dialog-title]");

        if (heading) {
            heading.textContent = event ? "Edit Event" : "Add an Event";
        }

        eventTitleInput.value = event?.title || "";
        eventDateInput.value = event?.date || selectedDate;
        eventTimeInput.value = event?.time || "";
        eventDescriptionInput.value = event?.description || "";

        const submitButton = eventForm.querySelector('[type="submit"]');

        if (submitButton) {
            submitButton.textContent = event
                ? "Save Changes"
                : "Save Event";
        }

        openDialog(eventDialog);
    }

    function saveEvent(e) {
        e.preventDefault();

        const title = eventTitleInput.value.trim();
        const date = eventDateInput.value;

        if (!title || !parseDate(date)) {
            feedback("Please enter a valid event title and date.");
            return;
        }

        const events = getEvents();
        const now = new Date().toISOString();

        if (editingEventId) {
            const index = events.findIndex(
                item => item.id === editingEventId
            );

            if (index === -1) {
                feedback("The event could not be found.");
                return;
            }

            events[index] = {
                ...events[index],
                title,
                date,
                time: eventTimeInput.value,
                description: eventDescriptionInput.value.trim(),
                updatedAt: now
            };
        } else {
            events.push({
                id: id("event"),
                title,
                date,
                time: eventTimeInput.value,
                description: eventDescriptionInput.value.trim(),
                createdAt: now
            });
        }

        if (!write(EVENT_KEY, events)) return;

        showMonthFor(date);
        editingEventId = null;

        closeDialog(eventDialog);
        renderAll();

        feedback("Event saved successfully.", false);
    }

    function deleteEvent(eventId) {
        if (!window.confirm("Delete this event?")) return;

        const updated = getEvents().filter(
            item => item.id !== eventId
        );

        if (!write(EVENT_KEY, updated)) return;

        renderAll();
        feedback("Event deleted.", false);
    }

    /* =====================================
       DAILY EVENT PANEL
    ===================================== */

    function renderEvents() {
        if (selectedDateLabel) {
            selectedDateLabel.textContent = formatDate(selectedDate);
        }

        if (!eventsList) return;

        eventsList.replaceChildren();

        const events = getEvents()
            .filter(item => item.date === selectedDate)
            .sort((a, b) =>
                (a.time || "").localeCompare(b.time || "")
            );

        if (!events.length) {
            const empty = element("div", "empty-state");

            empty.append(
                element("div", "empty-state-icon", "◷"),
                element("h3", "", "Nothing scheduled"),
                element(
                    "p",
                    "",
                    "There are no events on this date. Add something when you need to."
                )
            );

            eventsList.appendChild(empty);
            return;
        }

        events.forEach(event => {
            const item = element("article", "calendar-event-item");
            const marker = element("span", "event-color");
            const details = element("div", "event-details");

            const title = element(
                "h3",
                "event-title",
                event.title || "Untitled event"
            );

            const meta = element(
                "p",
                "event-meta",
                [
                    event.time || "",
                    event.description || ""
                ].filter(Boolean).join(" • ") || "No additional details"
            );

            const actions = element("div", "calendar-event-actions");

            const edit = element("button", "btn-icon");
            edit.type = "button";
            edit.textContent = "✎";
            edit.title = "Edit event";
            edit.setAttribute("aria-label", `Edit ${event.title}`);
            edit.addEventListener("click", () => {
                openEventDialog(event.id);
            });

            const remove = element("button", "btn-icon");
            remove.type = "button";
            remove.textContent = "×";
            remove.title = "Delete event";
            remove.setAttribute("aria-label", `Delete ${event.title}`);
            remove.addEventListener("click", () => {
                deleteEvent(event.id);
            });

            actions.append(edit, remove);
            details.append(title, meta);
            item.append(marker, details, actions);

            eventsList.appendChild(item);
        });
    }

    /* =====================================
       RENDER VISIBLE PAPER NOTES
    ===================================== */

    function renderNotes() {
        if (!notesList) return;

        notesList.replaceChildren();

        const notes = getNotes()
            .filter(note => note.date === selectedDate)
            .sort((a, b) =>
                (b.updatedAt || b.createdAt || "").localeCompare(
                    a.updatedAt || a.createdAt || ""
                )
            );

        const count = $("calendarNoteCount");

        if (count) {
            count.textContent = `${notes.length} ${
                notes.length === 1 ? "note" : "notes"
            }`;
        }

        if (!notes.length) {
            const empty = element("div", "calendar-notes-empty");

            const icon = element(
                "span",
                "calendar-notes-empty-icon"
            );

            icon.innerHTML = '<i data-lucide="notebook-pen"></i>';

            empty.append(
                icon,
                element("strong", "", "No paper notes for this date"),
                element(
                    "div",
                    "",
                    "Create a note and it will appear here."
                )
            );

            notesList.appendChild(empty);
            refreshIcons();
            return;
        }

        notes.forEach(note => {
            const card = element("button", "calendar-paper-card");
            card.type = "button";

            const paperColor = colors.includes(note.color)
                ? note.color
                : colors[0];

            card.style.backgroundColor = paperColor;

            card.setAttribute(
                "aria-label",
                `Edit note ${note.title || "Untitled note"}`
            );

            const title = element(
                "span",
                "calendar-paper-title",
                note.title || "Untitled note"
            );

            const body = element(
                "span",
                "calendar-paper-body",
                note.body || "No reminder details added."
            );

            const date = element(
                "span",
                "calendar-paper-date",
                formatDate(note.date)
            );

            card.append(title, body, date);

            card.addEventListener("click", () => {
                openNoteDialog(note.id);
            });

            notesList.appendChild(card);
        });
    }

    /* =====================================
       CREATE / EDIT NOTES
    ===================================== */

    function openNoteDialog(noteId = null) {
        editingNoteId = noteId;

        if (!noteForm) return;

        noteForm.reset();

        const note = noteId
            ? getNotes().find(item => item.id === noteId)
            : null;

        if (noteId && !note) {
            editingNoteId = null;
            return;
        }

        if (noteDialogTitle) {
            noteDialogTitle.textContent = note
                ? "Edit Your Note"
                : "Create a Note";
        }

        noteTitleInput.value = note?.title || "";
        noteBodyInput.value = note?.body || "";
        noteDateInput.value = note?.date || selectedDate;

        setColor(note?.color || colors[0]);

        if (deleteNoteButton) {
            deleteNoteButton.hidden = !note;
        }

        const saveButton = $("saveStickyNote");

        if (saveButton) {
            saveButton.textContent = note
                ? "Save Changes"
                : "Save Note";
        }

        openDialog(noteDialog);
        noteTitleInput.focus();
    }

    function closeNoteDialog() {
        closeDialog(noteDialog);
        editingNoteId = null;
    }

    function saveNote(e) {
        e.preventDefault();

        const title = noteTitleInput.value.trim();
        const body = noteBodyInput.value.trim();
        const date = noteDateInput.value;

        if (!title) {
            feedback("Please give your note a title.");
            return;
        }

        if (!parseDate(date)) {
            feedback("Please choose a valid calendar date.");
            return;
        }

        const notes = getNotes();
        const now = new Date().toISOString();

        if (editingNoteId) {
            const index = notes.findIndex(
                item => item.id === editingNoteId
            );

            if (index === -1) {
                feedback("This note could not be found.");
                return;
            }

            notes[index] = {
                ...notes[index],
                title,
                body,
                date,
                color: selectedColor,
                updatedAt: now
            };
        } else {
            notes.push({
                id: id("note"),
                title,
                body,
                date,
                color: selectedColor,
                createdAt: now,
                updatedAt: now
            });
        }

        if (!write(NOTE_KEY, notes)) return;

        showMonthFor(date);
        closeNoteDialog();

        renderAll();
        feedback("Your note has been saved.", false);
    }

    function deleteNote() {
        if (!editingNoteId) return;

        if (!window.confirm("Are you sure you want to delete this note?")) {
            return;
        }

        const updated = getNotes().filter(
            item => item.id !== editingNoteId
        );

        if (!write(NOTE_KEY, updated)) return;

        closeNoteDialog();
        renderAll();

        feedback("Your note has been deleted.", false);
    }

    /* =====================================
       CALENDAR GRID
    ===================================== */

    function renderCalendar() {
        if (!calendarDays || !calendarTitle) return;

        calendarDays.replaceChildren();

        const year = displayedMonth.getFullYear();
        const month = displayedMonth.getMonth();

        calendarTitle.textContent = displayedMonth.toLocaleDateString(
            "en-US",
            { month: "long", year: "numeric" }
        );

        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousMonthDays = new Date(year, month, 0).getDate();

        const totalCells =
            Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

        const events = getEvents();
        const notes = getNotes();

        for (let index = 0; index < totalCells; index++) {
            let date;
            let dayNumber;
            let outside = false;

            if (index < firstWeekday) {
                dayNumber =
                    previousMonthDays - firstWeekday + index + 1;

                date = new Date(year, month - 1, dayNumber);
                outside = true;
            } else if (index >= firstWeekday + daysInMonth) {
                dayNumber =
                    index - firstWeekday - daysInMonth + 1;

                date = new Date(year, month + 1, dayNumber);
                outside = true;
            } else {
                dayNumber = index - firstWeekday + 1;
                date = new Date(year, month, dayNumber);
            }

            const value = dateString(date);
            const cell = element("div", "calendar-day");

            cell.dataset.date = value;

            if (outside) cell.classList.add("outside-month");
            if (value === todayString) cell.classList.add("today");
            if (value === selectedDate) cell.classList.add("selected");

            const dayHeader = element("div", "calendar-day-header");

            const dayButton = element(
                "button",
                "calendar-day-number",
                String(dayNumber)
            );

            dayButton.type = "button";
            dayButton.setAttribute(
                "aria-label",
                `Select ${formatDate(value)}`
            );

            dayButton.setAttribute(
                "aria-pressed",
                String(value === selectedDate)
            );

            if (value === todayString) {
                dayButton.setAttribute("aria-current", "date");
            }

            dayButton.addEventListener("click", () => {
                selectedDate = value;

                if (outside) {
                    displayedMonth = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        1
                    );
                }

                renderAll();
            });

            dayHeader.appendChild(dayButton);

            const hasEvent = events.some(
                event => event.date === value
            );

            const dayNotes = notes.filter(
                note => note.date === value
            );

            if (hasEvent) {
                cell.classList.add("has-event");
                dayHeader.appendChild(
                    element("span", "calendar-event-indicator")
                );
            }

            if (dayNotes.length) {
                cell.classList.add("has-sticky-note");

                const noteIndicator = element(
                    "span",
                    "calendar-note-indicator",
                    String(dayNotes.length)
                );

                noteIndicator.title =
                    `${dayNotes.length} paper note(s)`;

                dayHeader.appendChild(noteIndicator);
            }

            cell.appendChild(dayHeader);
            calendarDays.appendChild(cell);
        }

        refreshIcons();
    }

    /* =====================================
       RENDER ALL
    ===================================== */

    function renderAll() {
        renderCalendar();
        renderEvents();
        renderNotes();
    }

    /* =====================================
       NAVIGATION
    ===================================== */

    previousButton?.addEventListener("click", () => {
        displayedMonth = new Date(
            displayedMonth.getFullYear(),
            displayedMonth.getMonth() - 1,
            1
        );

        renderCalendar();
    });

    nextButton?.addEventListener("click", () => {
        displayedMonth = new Date(
            displayedMonth.getFullYear(),
            displayedMonth.getMonth() + 1,
            1
        );

        renderCalendar();
    });

    todayButton?.addEventListener("click", () => {
        displayedMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        selectedDate = todayString;
        renderAll();
    });

    /* =====================================
       BUTTON LISTENERS
    ===================================== */

    $("openCalendarDialog")?.addEventListener("click", () => {
        openEventDialog();
    });

    $("addCalendarEvent")?.addEventListener("click", () => {
        openEventDialog();
    });

    $("closeCalendarDialog")?.addEventListener("click", () => {
        closeDialog(eventDialog);
        editingEventId = null;
    });

    $("cancelCalendarEvent")?.addEventListener("click", () => {
        closeDialog(eventDialog);
        editingEventId = null;
    });

    eventForm?.addEventListener("submit", saveEvent);

    $("createStickyNote")?.addEventListener("click", () => {
        openNoteDialog();
    });

    $("closeStickyNoteDialog")?.addEventListener(
        "click",
        closeNoteDialog
    );

    $("cancelStickyNote")?.addEventListener(
        "click",
        closeNoteDialog
    );

    noteForm?.addEventListener("submit", saveNote);
    deleteNoteButton?.addEventListener("click", deleteNote);

    noteColors?.querySelectorAll(".sticky-note-color").forEach(button => {
        button.addEventListener("click", () => {
            setColor(button.dataset.color);
        });
    });

    /* =====================================
       DIALOG CLOSE HANDLING
    ===================================== */

    [eventDialog, noteDialog].forEach(dialog => {
        dialog?.addEventListener("close", () => {
            if (dialog === eventDialog) {
                editingEventId = null;
            }

            if (dialog === noteDialog) {
                editingNoteId = null;
            }
        });

        dialog?.addEventListener("click", event => {
            if (event.target === dialog) {
                closeDialog(dialog);
            }
        });
    });

    /* =====================================
       OPEN REQUESTED DATE
    ===================================== */

    const requestedDate = new URLSearchParams(
        window.location.search
    ).get("date");

    if (requestedDate && parseDate(requestedDate)) {
        showMonthFor(requestedDate);
    }

    /* =====================================
       STORAGE UPDATES
    ===================================== */

    window.addEventListener("storage", event => {
        if (
            event.key === EVENT_KEY ||
            event.key === NOTE_KEY
        ) {
            renderAll();
        }
    });

    /* =====================================
       INITIALIZE
    ===================================== */

    createNotesPanel();
    setColor(colors[0]);

    if (eventDateInput && !eventDateInput.value) {
        eventDateInput.value = selectedDate;
    }

    renderAll();
    refreshIcons();

});
