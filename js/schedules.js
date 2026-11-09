/* =========================================
   LIFEOS — CLASS SCHEDULES
   File: js/schedules.js
   ========================================= */

import { supabase } from "./supabase.js";

(() => {
    "use strict";

    const DAYS = [
        { value: 1, label: "Monday" },
        { value: 2, label: "Tuesday" },
        { value: 3, label: "Wednesday" },
        { value: 4, label: "Thursday" },
        { value: 5, label: "Friday" },
        { value: 6, label: "Saturday" },
        { value: 0, label: "Sunday" }
    ];

    const DEFAULT_COLOR = "#8FA98A";

    const elements = {
        week: document.getElementById("scheduleWeek"),
        loading: document.getElementById("scheduleLoading"),
        empty: document.getElementById("scheduleEmpty"),
        feedback: document.getElementById("scheduleFeedback"),

        totalClasses: document.getElementById("totalClasses"),
        scheduledSubjects: document.getElementById("scheduledSubjects"),
        activeDays: document.getElementById("activeDays"),

        modal: document.getElementById("scheduleModal"),
        modalBackdrop: document.getElementById("scheduleModalBackdrop"),
        modalTitle: document.getElementById("scheduleModalTitle"),
        form: document.getElementById("scheduleForm"),
        formFeedback: document.getElementById("scheduleFormFeedback"),

        id: document.getElementById("scheduleId"),
        subject: document.getElementById("scheduleSubject"),
        day: document.getElementById("scheduleDay"),
        start: document.getElementById("scheduleStart"),
        end: document.getElementById("scheduleEnd"),
        location: document.getElementById("scheduleLocation"),

        addButton: document.getElementById("addScheduleBtn"),
        emptyAddButton: document.getElementById("emptyAddScheduleBtn"),
        closeButton: document.getElementById("closeScheduleModal"),
        cancelButton: document.getElementById("cancelScheduleBtn"),
        saveButton: document.getElementById("saveScheduleBtn"),
        refreshButton: document.getElementById("refreshSchedules")
    };

    let currentUser = null;
    let subjects = [];
    let schedules = [];

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function normalizeColor(color) {
        const value = String(color || "").trim();

        return /^#[0-9a-fA-F]{6}$/.test(value)
            ? value
            : DEFAULT_COLOR;
    }

    function formatTime(time) {
        if (!time) return "";

        const [hours, minutes] = time.split(":").map(Number);
        const period = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 || 12;

        return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
    }

    function timeToMinutes(time) {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    }

    function showFeedback(message, type = "success") {
        elements.feedback.textContent = message;
        elements.feedback.className = `schedule-feedback show ${type}`;

        window.clearTimeout(showFeedback.timeout);

        showFeedback.timeout = window.setTimeout(() => {
            elements.feedback.className = "schedule-feedback";
            elements.feedback.textContent = "";
        }, 4500);
    }

    function showFormFeedback(message) {
        elements.formFeedback.textContent = message;
        elements.formFeedback.classList.toggle("show", Boolean(message));
    }

    function setLoading(isLoading) {
        elements.loading.hidden = !isLoading;
        elements.week.hidden = isLoading;

        if (isLoading) {
            elements.empty.hidden = true;
        }
    }

    async function checkUser() {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
            window.location.href = "../login.html";
            return false;
        }

        currentUser = data.session.user;
        return true;
    }

    async function loadSubjects() {
        const { data, error } = await supabase
            .from("subjects")
            .select("id, name, color")
            .eq("user_id", currentUser.id)
            .order("name", { ascending: true });

        if (error) throw error;

        subjects = data || [];
        populateSubjectOptions();
    }

    function populateSubjectOptions() {
        const selectedValue = elements.subject.value;

        elements.subject.innerHTML = `
            <option value="">Choose a subject</option>
            ${subjects.map(subject => `
                <option value="${escapeHTML(subject.id)}">
                    ${escapeHTML(subject.name)}
                </option>
            `).join("")}
        `;

        if (subjects.some(subject => subject.id === selectedValue)) {
            elements.subject.value = selectedValue;
        }

        elements.addButton.disabled = subjects.length === 0;
        elements.emptyAddButton.disabled = subjects.length === 0;
    }

    async function loadSchedules() {
        const { data, error } = await supabase
            .from("class_schedules")
            .select("*")
            .eq("user_id", currentUser.id);

        if (error) throw error;

        schedules = (data || []).map(schedule => {
            const subject = subjects.find(item => item.id === schedule.subject_id);

            return {
                ...schedule,
                subject_name: subject?.name || "Unknown subject",
                subject_color: normalizeColor(subject?.color)
            };
        });

        schedules.sort((a, b) => {
            const dayDifference = DAYS.findIndex(day => day.value === a.day_of_week)
                - DAYS.findIndex(day => day.value === b.day_of_week);

            if (dayDifference !== 0) return dayDifference;

            return String(a.start_time).localeCompare(String(b.start_time));
        });

        renderSchedules();
    }

    function renderStatistics() {
        const uniqueSubjects = new Set(schedules.map(item => item.subject_id));
        const uniqueDays = new Set(schedules.map(item => Number(item.day_of_week)));

        elements.totalClasses.textContent = schedules.length;
        elements.scheduledSubjects.textContent = uniqueSubjects.size;
        elements.activeDays.textContent = uniqueDays.size;
    }

    function renderSchedules() {
        renderStatistics();

        if (schedules.length === 0) {
            elements.week.innerHTML = "";
            elements.week.hidden = true;
            elements.empty.hidden = false;
            refreshIcons();
            return;
        }

        elements.empty.hidden = true;
        elements.week.hidden = false;

        elements.week.innerHTML = DAYS.map(day => {
            const daySchedules = schedules
                .filter(item => Number(item.day_of_week) === day.value)
                .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

            return `
                <section class="schedule-day">
                    <div class="schedule-day-header">
                        <h4>${day.label}</h4>
                        <span class="schedule-day-count">
                            ${daySchedules.length}
                            ${daySchedules.length === 1 ? "class" : "classes"}
                        </span>
                    </div>

                    ${daySchedules.length
                        ? daySchedules.map(renderScheduleCard).join("")
                        : `<p class="schedule-empty-day">No classes scheduled.</p>`
                    }
                </section>
            `;
        }).join("");

        refreshIcons();
    }

    function renderScheduleCard(schedule) {
        const start = formatTime(String(schedule.start_time).slice(0, 5));
        const end = formatTime(String(schedule.end_time).slice(0, 5));

        return `
            <article class="schedule-class">
                <div
                    class="schedule-class-color"
                    style="--class-color: ${schedule.subject_color}"
                ></div>

                <div class="schedule-class-content">
                    <h5 class="schedule-class-title">
                        ${escapeHTML(schedule.subject_name)}
                    </h5>

                    <p class="schedule-class-time">
                        <i data-lucide="clock"></i>
                        ${start} – ${end}
                    </p>

                    ${schedule.location ? `
                        <p class="schedule-class-location">
                            <i data-lucide="map-pin"></i>
                            ${escapeHTML(schedule.location)}
                        </p>
                    ` : ""}
                </div>

                <div class="schedule-class-actions">
                    <button
                        class="schedule-action-btn"
                        type="button"
                        data-action="edit"
                        data-id="${escapeHTML(schedule.id)}"
                        aria-label="Edit class"
                        title="Edit class"
                    >
                        <i data-lucide="pencil"></i>
                    </button>

                    <button
                        class="schedule-action-btn delete"
                        type="button"
                        data-action="delete"
                        data-id="${escapeHTML(schedule.id)}"
                        aria-label="Delete class"
                        title="Delete class"
                    >
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </article>
        `;
    }

    function openModal(schedule = null) {
        elements.form.reset();
        elements.id.value = "";
        showFormFeedback("");

        if (schedule) {
            elements.modalTitle.textContent = "Edit class";
            elements.id.value = schedule.id;
            elements.subject.value = schedule.subject_id;
            elements.day.value = String(schedule.day_of_week);
            elements.start.value = String(schedule.start_time).slice(0, 5);
            elements.end.value = String(schedule.end_time).slice(0, 5);
            elements.location.value = schedule.location || "";
            elements.saveButton.textContent = "Save changes";
        } else {
            elements.modalTitle.textContent = "Add a class";
            elements.saveButton.textContent = "Save class";
        }

        elements.modal.classList.add("open");
        elements.modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        refreshIcons();

        elements.subject.focus();
    }

    function closeModal() {
        elements.modal.classList.remove("open");
        elements.modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        elements.form.reset();
        elements.id.value = "";
        showFormFeedback("");
    }

    function validateSchedule(formData) {
        if (!formData.subject_id) {
            return "Please choose a subject.";
        }

        if (formData.day_of_week === "" || !DAYS.some(day => day.value === Number(formData.day_of_week))) {
            return "Please choose a valid day.";
        }

        if (!formData.start_time || !formData.end_time) {
            return "Please enter both start and end times.";
        }

        if (formData.start_time >= formData.end_time) {
            return "The end time must be later than the start time.";
        }

        const newStart = timeToMinutes(formData.start_time);
        const newEnd = timeToMinutes(formData.end_time);

        const overlapping = schedules.some(existing => {
            if (existing.id === formData.id) return false;
            if (existing.day_of_week !== Number(formData.day_of_week)) return false;

            const existingStart = timeToMinutes(String(existing.start_time).slice(0, 5));
            const existingEnd = timeToMinutes(String(existing.end_time).slice(0, 5));

            return newStart < existingEnd && newEnd > existingStart;
        });

        if (overlapping) {
            return "This time overlaps with another class on the same day.";
        }

        return "";
    }

    async function saveSchedule(event) {
        event.preventDefault();

        const id = elements.id.value;

        const formData = {
            id,
            user_id: currentUser.id,
            subject_id: elements.subject.value,
            day_of_week: Number(elements.day.value),
            start_time: elements.start.value,
            end_time: elements.end.value,
            location: elements.location.value.trim() || null
        };

        const validationMessage = validateSchedule(formData);

        if (validationMessage) {
            showFormFeedback(validationMessage);
            return;
        }

        elements.saveButton.disabled = true;
        elements.saveButton.textContent = id ? "Saving..." : "Adding...";
        showFormFeedback("");

        try {
            let result;

            if (id) {
                result = await supabase
                    .from("class_schedules")
                    .update({
                        subject_id: formData.subject_id,
                        day_of_week: formData.day_of_week,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        location: formData.location
                    })
                    .eq("id", id)
                    .eq("user_id", currentUser.id);
            } else {
                result = await supabase
                    .from("class_schedules")
                    .insert({
                        user_id: formData.user_id,
                        subject_id: formData.subject_id,
                        day_of_week: formData.day_of_week,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        location: formData.location
                    });
            }

            if (result.error) throw result.error;

            closeModal();
            await loadSchedules();

            showFeedback(
                id ? "Class schedule updated successfully." : "Class added to your timetable."
            );

        } catch (error) {
            console.error("Save schedule error:", error);
            showFormFeedback(error.message || "Unable to save this class. Please try again.");
        } finally {
            elements.saveButton.disabled = false;
            elements.saveButton.textContent = elements.id.value ? "Save changes" : "Save class";
        }
    }

    async function deleteSchedule(id) {
        const schedule = schedules.find(item => item.id === id);
        if (!schedule) return;

        const confirmed = window.confirm(
            `Delete the ${schedule.subject_name} class from your timetable?`
        );

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from("class_schedules")
                .delete()
                .eq("id", id)
                .eq("user_id", currentUser.id);

            if (error) throw error;

            await loadSchedules();
            showFeedback("Class schedule deleted.");

        } catch (error) {
            console.error("Delete schedule error:", error);
            showFeedback(error.message || "Unable to delete this class.", "error");
        }
    }

    async function refreshSchedules() {
        elements.refreshButton.disabled = true;

        try {
            await loadSubjects();
            await loadSchedules();
            showFeedback("Your timetable is up to date.");
        } catch (error) {
            console.error("Refresh schedules error:", error);
            showFeedback("Unable to refresh your timetable.", "error");
        } finally {
            elements.refreshButton.disabled = false;
        }
    }

    function attachEvents() {
        elements.addButton.addEventListener("click", () => {
            if (subjects.length === 0) {
                showFeedback("Add a subject first before creating a class schedule.", "error");
                return;
            }

            openModal();
        });

        elements.emptyAddButton.addEventListener("click", () => {
            if (subjects.length === 0) {
                showFeedback("Add a subject first before creating a class schedule.", "error");
                return;
            }

            openModal();
        });

        elements.closeButton.addEventListener("click", closeModal);
        elements.cancelButton.addEventListener("click", closeModal);
        elements.modalBackdrop.addEventListener("click", closeModal);

        elements.form.addEventListener("submit", saveSchedule);
        elements.refreshButton.addEventListener("click", refreshSchedules);

        elements.week.addEventListener("click", event => {
            const button = event.target.closest("[data-action]");
            if (!button) return;

            const { action, id } = button.dataset;

            if (action === "edit") {
                const schedule = schedules.find(item => item.id === id);
                if (schedule) openModal(schedule);
            }

            if (action === "delete") {
                deleteSchedule(id);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && elements.modal.classList.contains("open")) {
                closeModal();
            }
        });
    }

    async function init() {
        try {
            setLoading(true);

            const authenticated = await checkUser();
            if (!authenticated) return;

            attachEvents();

            await loadSubjects();
            await loadSchedules();

        } catch (error) {
            console.error("Schedules initialization error:", error);
            showFeedback("Unable to load your class schedules. Please refresh the page.", "error");
        } finally {
            setLoading(false);
        }

        refreshIcons();
    }

    init();
})();