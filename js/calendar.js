
/* =========================================
   LIFEOS — CALENDAR + PAPER NOTES
   SUPABASE VERSION
   File: js/calendar.js
========================================= */

import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

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

    let currentUser = null;
    let events = [];
    let notes = [];

    let selectedDate = todayString;
    let displayedMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    let editingNoteId = null;
    let editingEventId = null;
    let selectedColor = colors[0];
    let isSaving = false;

    let notesList = null;
    let addNoteButton = null;

    /* =====================================
       DATE HELPERS
    ===================================== */

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

    function localDateTimeToISO(dateValue, timeValue = "") {
        const date = parseDate(dateValue);
        if (!date) return null;

        const [hours, minutes] = (timeValue || "00:00")
            .split(":")
            .map(Number);

        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            hours || 0,
            minutes || 0,
            0,
            0
        ).toISOString();
    }

    function getLocalDateFromISO(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return dateString(date);
    }

    function getLocalTimeFromISO(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return `${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
        ).padStart(2, "0")}`;
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

    /* =====================================
       GENERAL HELPERS
    ===================================== */

    function element(tag, className, text) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;

        return node;
    }

    function feedback(message, error = true) {
        const box = $("calendarFeedback");
        if (!box) return;

        box.textContent = message;
        box.hidden = false;
        box.classList.toggle("error", error);

        clearTimeout(feedback.timeout);

        feedback.timeout = setTimeout(() => {
            box.hidden = true;
        }, 4000);
    }

    function databaseError(action, error) {
        console.error(`LIFEOS Calendar: ${action} failed:`, error);

        feedback(
            `${action} failed: ${error?.message || "Please try again."}`
        );
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

    function refreshIcons() {
        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
        }
    }

    /* =====================================
       DATABASE ROW CONVERSION
    ===================================== */

    function mapEvent(row) {
        return {
            id: row.id,
            title: row.title || "",
            date: getLocalDateFromISO(row.starts_at),
            time: row.all_day
                ? ""
                : getLocalTimeFromISO(row.starts_at),
            description: row.description || "",
            allDay: Boolean(row.all_day),
            startsAt: row.starts_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    function mapNote(row) {
        return {
            id: row.id,
            title: row.title || "",
            body: row.content || "",
            date: row.calendar_date || "",
            color: row.color || colors[0],
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /* =====================================
       LOAD DATA FROM SUPABASE
    ===================================== */

    async function loadCalendarData() {
        if (!currentUser) return;

        const [eventResult, noteResult] = await Promise.all([
            supabase
                .from("personal_events")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("starts_at", { ascending: true }),

            supabase
                .from("notes")
                .select("*")
                .eq("user_id", currentUser.id)
                .eq("note_type", "calendar")
                .order("created_at", { ascending: false })
        ]);

        if (eventResult.error) {
            databaseError("Loading calendar events", eventResult.error);
        } else {
            events = (eventResult.data || []).map(mapEvent);
        }

        if (noteResult.error) {
            databaseError("Loading calendar notes", noteResult.error);
        } else {
            notes = (noteResult.data || []).map(mapNote);
        }

        renderAll();
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
       CREATE NOTES PANEL
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
            ? events.find(item => item.id === eventId)
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
            submitButton.textContent = event ? "Save Changes" : "Save Event";
        }

        openDialog(eventDialog);
    }

    /* =====================================
       CREATE / UPDATE EVENT
    ===================================== */

    async function saveEvent(e) {
        e.preventDefault();

        if (isSaving) return;

        const title = eventTitleInput.value.trim();
        const date = eventDateInput.value;
        const time = eventTimeInput.value;

        if (!title || !parseDate(date)) {
            feedback("Please enter a valid event title and date.");
            return;
        }

        const startsAt = localDateTimeToISO(date, time);

        if (!startsAt) {
            feedback("Please enter a valid event date and time.");
            return;
        }

        const payload = {
            title,
            description: eventDescriptionInput.value.trim() || null,
            location: null,
            starts_at: startsAt,
            ends_at: null,
            all_day: !time,
            updated_at: new Date().toISOString()
        };

        isSaving = true;

        const submitButton = eventForm.querySelector('[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {
            let result;

            if (editingEventId) {
                result = await supabase
                    .from("personal_events")
                    .update(payload)
                    .eq("id", editingEventId)
                    .eq("user_id", currentUser.id)
                    .select("*")
                    .single();
            } else {
                result = await supabase
                    .from("personal_events")
                    .insert({
                        ...payload,
                        user_id: currentUser.id
                    })
                    .select("*")
                    .single();
            }

            if (result.error) {
                databaseError("Saving event", result.error);
                return;
            }

            const savedEvent = mapEvent(result.data);

            if (editingEventId) {
                events = events.map(item =>
                    item.id === editingEventId ? savedEvent : item
                );
            } else {
                events.push(savedEvent);
            }

            showMonthFor(date);

            editingEventId = null;
            closeDialog(eventDialog);

            renderAll();
            feedback("Event saved successfully.", false);

        } catch (error) {
            databaseError("Saving event", error);
        } finally {
            isSaving = false;
            if (submitButton) submitButton.disabled = false;
        }
    }

    /* =====================================
       DELETE EVENT
    ===================================== */

    async function deleteEvent(eventId) {
        if (!window.confirm("Delete this event?")) return;

        const { error } = await supabase
            .from("personal_events")
            .delete()
            .eq("id", eventId)
            .eq("user_id", currentUser.id);

        if (error) {
            databaseError("Deleting event", error);
            return;
        }

        events = events.filter(item => item.id !== eventId);

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

        const dailyEvents = events
            .filter(item => item.date === selectedDate)
            .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

        if (!dailyEvents.length) {
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

        dailyEvents.forEach(event => {
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
                    event.time || "All day",
                    event.description || ""
                ].filter(Boolean).join(" • ")
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
       RENDER PAPER NOTES
    ===================================== */

    function renderNotes() {
        if (!notesList) return;

        notesList.replaceChildren();

        const dailyNotes = notes
            .filter(note => note.date === selectedDate)
            .sort((a, b) =>
                (b.updatedAt || b.createdAt || "").localeCompare(
                    a.updatedAt || a.createdAt || ""
                )
            );

        const count = $("calendarNoteCount");

        if (count) {
            count.textContent = `${dailyNotes.length} ${
                dailyNotes.length === 1 ? "note" : "notes"
            }`;
        }

        if (!dailyNotes.length) {
            const empty = element("div", "calendar-notes-empty");

            const icon = element("span", "calendar-notes-empty-icon");
            icon.innerHTML = '<i data-lucide="notebook-pen"></i>';

            empty.append(
                icon,
                element("strong", "", "No paper notes for this date"),
                element("div", "", "Create a note and it will appear here.")
            );

            notesList.appendChild(empty);
            refreshIcons();
            return;
        }

        dailyNotes.forEach(note => {
            const card = element("button", "calendar-paper-card");
            card.type = "button";

            card.style.backgroundColor = colors.includes(note.color)
                ? note.color
                : colors[0];

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
       CREATE / EDIT PAPER NOTES
    ===================================== */

    function openNoteDialog(noteId = null) {
        editingNoteId = noteId;

        if (!noteForm) return;

        noteForm.reset();

        const note = noteId
            ? notes.find(item => item.id === noteId)
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
            saveButton.textContent = note ? "Save Changes" : "Save Note";
        }

        openDialog(noteDialog);
        noteTitleInput?.focus();
    }

    function closeNoteDialog() {
        closeDialog(noteDialog);
        editingNoteId = null;
    }

    async function saveNote(e) {
        e.preventDefault();

        if (isSaving) return;

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

        const now = new Date().toISOString();

        const payload = {
            title,
            content: body,
            category: null,
            color: selectedColor,
            calendar_date: date,
            note_type: "calendar",
            updated_at: now
        };

        isSaving = true;

        const saveButton = $("saveStickyNote") ||
            noteForm.querySelector('[type="submit"]');

        if (saveButton) saveButton.disabled = true;

        try {
            let result;

            if (editingNoteId) {
                result = await supabase
                    .from("notes")
                    .update(payload)
                    .eq("id", editingNoteId)
                    .eq("user_id", currentUser.id)
                    .eq("note_type", "calendar")
                    .select("*")
                    .single();
            } else {
                result = await supabase
                    .from("notes")
                    .insert({
                        ...payload,
                        user_id: currentUser.id,
                        subject_id: null,
                        pinned: false,
                        created_at: now
                    })
                    .select("*")
                    .single();
            }

            if (result.error) {
                databaseError("Saving paper note", result.error);
                return;
            }

            const savedNote = mapNote(result.data);

            if (editingNoteId) {
                notes = notes.map(item =>
                    item.id === editingNoteId ? savedNote : item
                );
            } else {
                notes.unshift(savedNote);
            }

            showMonthFor(date);
            closeNoteDialog();

            renderAll();
            feedback("Your note has been saved.", false);

        } catch (error) {
            databaseError("Saving paper note", error);
        } finally {
            isSaving = false;
            if (saveButton) saveButton.disabled = false;
        }
    }

    /* =====================================
       DELETE PAPER NOTE
    ===================================== */

    async function deleteNote() {
        if (!editingNoteId || isSaving) return;

        if (!window.confirm("Are you sure you want to delete this note?")) {
            return;
        }

        isSaving = true;

        if (deleteNoteButton) deleteNoteButton.disabled = true;

        try {
            const { error } = await supabase
                .from("notes")
                .delete()
                .eq("id", editingNoteId)
                .eq("user_id", currentUser.id)
                .eq("note_type", "calendar");

            if (error) {
                databaseError("Deleting paper note", error);
                return;
            }

            notes = notes.filter(item => item.id !== editingNoteId);

            closeNoteDialog();
            renderAll();

            feedback("Your note has been deleted.", false);

        } catch (error) {
            databaseError("Deleting paper note", error);
        } finally {
            isSaving = false;
            if (deleteNoteButton) deleteNoteButton.disabled = false;
        }
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

        for (let index = 0; index < totalCells; index++) {
            let date;
            let dayNumber;
            let outside = false;

            if (index < firstWeekday) {
                dayNumber = previousMonthDays - firstWeekday + index + 1;
                date = new Date(year, month - 1, dayNumber);
                outside = true;
            } else if (index >= firstWeekday + daysInMonth) {
                dayNumber = index - firstWeekday - daysInMonth + 1;
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

            const hasEvent = events.some(event => event.date === value);
            const dayNotes = notes.filter(note => note.date === value);

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

                noteIndicator.title = `${dayNotes.length} paper note(s)`;

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
       EVENT BUTTONS
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

    /* =====================================
       PAPER NOTE BUTTONS
    ===================================== */

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
       REQUESTED DATE
    ===================================== */

    const requestedDate = new URLSearchParams(
        window.location.search
    ).get("date");

    if (requestedDate && parseDate(requestedDate)) {
        showMonthFor(requestedDate);
    }

    /* =====================================
       INITIALIZE
    ===================================== */

    async function initialize() {
        try {
            const { data, error } = await supabase.auth.getUser();

            if (error || !data?.user) {
                window.location.replace(
                    new URL("../login.html", import.meta.url).href
                );
                return;
            }

            currentUser = data.user;

            createNotesPanel();
            setColor(colors[0]);

            if (eventDateInput && !eventDateInput.value) {
                eventDateInput.value = selectedDate;
            }

            await loadCalendarData();
            refreshIcons();

        } catch (error) {
            databaseError("Initializing calendar", error);
        }
    }

    initialize();

});
