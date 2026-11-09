
/* =========================================================
   LIFEOS — ACADEMIC MANAGEMENT
   File: js/subjects.js
   Includes: Subjects + Class Schedules
   Database: Supabase
   ========================================================= */

import { supabase } from "./supabase.js";

(() => {
    "use strict";

    // -----------------------------------------------------
    // ELEMENTS
    // -----------------------------------------------------

    const el = {
        // Subjects
        grid: document.getElementById("subjectsGrid"),
        loading: document.getElementById("subjectsLoading"),
        empty: document.getElementById("subjectsEmpty"),
        feedback: document.getElementById("subjectsFeedback"),

        total: document.getElementById("totalSubjects"),
        scheduled: document.getElementById("scheduledSubjects"),
        teachers: document.getElementById("subjectsWithTeachers"),

        search: document.getElementById("subjectSearch"),
        sort: document.getElementById("subjectSort"),

        subjectModal: document.getElementById("subjectModal"),
        subjectBackdrop: document.getElementById("modalBackdrop"),
        subjectForm: document.getElementById("subjectForm"),
        subjectModalTitle: document.getElementById("subjectModalTitle"),
        subjectFormFeedback: document.getElementById("subjectFormFeedback"),

        subjectId: document.getElementById("subjectId"),
        subjectName: document.getElementById("subjectName"),
        subjectCode: document.getElementById("subjectCode"),
        teacher: document.getElementById("teacherName"),
        room: document.getElementById("subjectRoom"),
        color: document.getElementById("subjectColor"),

        addSubject: document.getElementById("addSubjectBtn"),
        emptyAddSubject: document.getElementById("emptyAddSubjectBtn"),
        closeSubject: document.getElementById("closeSubjectModal"),
        cancelSubject: document.getElementById("cancelSubjectBtn"),
        saveSubject: document.getElementById("saveSubjectBtn"),

        // Schedules
        scheduleWeek: document.getElementById("scheduleWeek"),
        scheduleLoading: document.getElementById("scheduleLoading"),
        scheduleEmpty: document.getElementById("scheduleEmpty"),
        scheduleFeedback: document.getElementById("scheduleFeedback"),

        totalClasses: document.getElementById("totalClasses"),
        scheduleSubjects: document.getElementById("scheduleScheduledSubjects"),
        activeDays: document.getElementById("activeDays"),

        scheduleModal: document.getElementById("scheduleModal"),
        scheduleBackdrop: document.getElementById("scheduleModalBackdrop"),
        scheduleForm: document.getElementById("scheduleForm"),
        scheduleModalTitle: document.getElementById("scheduleModalTitle"),
        scheduleFormFeedback: document.getElementById("scheduleFormFeedback"),

        scheduleId: document.getElementById("scheduleId"),
        scheduleSubject: document.getElementById("scheduleSubject"),
        scheduleDay: document.getElementById("scheduleDay"),
        scheduleStart: document.getElementById("scheduleStart"),
        scheduleEnd: document.getElementById("scheduleEnd"),
        scheduleLocation: document.getElementById("scheduleLocation"),

        addSchedule: document.getElementById("addScheduleBtn"),
        emptyAddSchedule: document.getElementById("emptyAddScheduleBtn"),
        closeSchedule: document.getElementById("closeScheduleModal"),
        cancelSchedule: document.getElementById("cancelScheduleBtn"),
        saveSchedule: document.getElementById("saveScheduleBtn"),
        refreshSchedules: document.getElementById("refreshSchedules")
    };

    // -----------------------------------------------------
    // STATE
    // -----------------------------------------------------

    let currentUser = null;
    let subjects = [];
    let schedules = [];

    const DEFAULT_COLOR = "#8FA98A";

    const DAYS = [
        { value: 1, name: "Monday", short: "MON" },
        { value: 2, name: "Tuesday", short: "TUE" },
        { value: 3, name: "Wednesday", short: "WED" },
        { value: 4, name: "Thursday", short: "THU" },
        { value: 5, name: "Friday", short: "FRI" },
        { value: 6, name: "Saturday", short: "SAT" },
        { value: 0, name: "Sunday", short: "SUN" }
    ];

    const ALLOWED_COLORS = [
        "#8FA98A",
        "#8CA6B8",
        "#B39BC8",
        "#D2AD83",
        "#C78F91",
        "#A5A5A0"
    ];

    // -----------------------------------------------------
    // HELPERS
    // -----------------------------------------------------

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
        return ALLOWED_COLORS.includes(color) ? color : DEFAULT_COLOR;
    }

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function showSubjectFeedback(message, isError = false) {
        el.feedback.textContent = message;
        el.feedback.style.color = isError ? "#b65353" : "#617c62";
    }

    function showSubjectFormFeedback(message) {
        el.subjectFormFeedback.textContent = message;
    }

    function showScheduleFeedback(message, isError = false) {
        el.scheduleFeedback.textContent = message;
        el.scheduleFeedback.style.color = isError ? "#b65353" : "#617c62";
    }

    function showScheduleFormFeedback(message) {
        el.scheduleFormFeedback.textContent = message;
    }

    function setSubjectLoading(loading) {
        el.loading.hidden = !loading;
    }

    function setScheduleLoading(loading) {
        el.scheduleLoading.hidden = !loading;
    }

    function formatTime(time) {
        if (!time) return "";

        const [hours, minutes] = time.split(":").map(Number);
        const date = new Date();

        date.setHours(hours, minutes, 0, 0);

        return date.toLocaleTimeString("en", {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function getDayName(dayValue) {
        return DAYS.find(day => day.value === Number(dayValue))?.name || "Unknown";
    }

    function getSubject(subjectId) {
        return subjects.find(subject => String(subject.id) === String(subjectId));
    }

    // -----------------------------------------------------
    // AUTHENTICATION
    // -----------------------------------------------------

    async function checkUser() {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
            window.location.href = "../login.html";
            return false;
        }

        currentUser = data.session.user;
        return true;
    }

    // -----------------------------------------------------
    // LOAD ALL ACADEMIC DATA
    // -----------------------------------------------------

    async function loadAcademicData() {
        setSubjectLoading(true);
        setScheduleLoading(true);

        el.empty.hidden = true;
        el.scheduleEmpty.hidden = true;

        showSubjectFeedback("");
        showScheduleFeedback("");

        const [subjectResult, scheduleResult] = await Promise.all([
            supabase
                .from("subjects")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false }),

            supabase
                .from("class_schedules")
                .select("*")
                .eq("user_id", currentUser.id)
        ]);

        setSubjectLoading(false);
        setScheduleLoading(false);

        if (subjectResult.error) {
            console.error("Could not load subjects:", subjectResult.error);
            showSubjectFeedback("Unable to load subjects. Please refresh and try again.", true);
            return;
        }

        if (scheduleResult.error) {
            console.error("Could not load schedules:", scheduleResult.error);
            showScheduleFeedback("Unable to load class schedules. Please refresh and try again.", true);
            schedules = [];
        } else {
            schedules = scheduleResult.data || [];
        }

        subjects = subjectResult.data || [];

        renderSubjects();
        renderSchedules();
        updateSubjectStatistics();
        updateScheduleStatistics();
        populateSubjectOptions();
    }

    // -----------------------------------------------------
    // SUBJECT STATISTICS
    // -----------------------------------------------------

    function updateSubjectStatistics() {
        const scheduledIds = new Set(
            schedules.map(schedule => String(schedule.subject_id))
        );

        el.total.textContent = subjects.length;

        el.scheduled.textContent = subjects.filter(subject =>
            scheduledIds.has(String(subject.id))
        ).length;

        el.teachers.textContent = subjects.filter(subject =>
            subject.teacher_name && subject.teacher_name.trim()
        ).length;
    }

    // -----------------------------------------------------
    // SUBJECT SEARCH AND SORT
    // -----------------------------------------------------

    function getFilteredSubjects() {
        const searchTerm = el.search.value.trim().toLowerCase();
        const sortType = el.sort.value;

        const filtered = subjects.filter(subject => {
            const searchableText = [
                subject.name,
                subject.subject_code,
                subject.teacher_name,
                subject.room
            ].join(" ").toLowerCase();

            return searchableText.includes(searchTerm);
        });

        if (sortType === "name") {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortType === "oldest") {
            filtered.sort((a, b) =>
                new Date(a.created_at) - new Date(b.created_at)
            );
        } else {
            filtered.sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );
        }

        return filtered;
    }

    // -----------------------------------------------------
    // RENDER SUBJECTS
    // -----------------------------------------------------

    function renderSubjects() {
        const filtered = getFilteredSubjects();

        el.grid.innerHTML = "";

        if (filtered.length === 0) {
            el.empty.hidden = false;

            const hasSubjects = subjects.length > 0;

            el.empty.querySelector("h3").textContent =
                hasSubjects ? "No matching subjects" : "No subjects yet";

            el.empty.querySelector("p").textContent =
                hasSubjects
                    ? "Try another search term."
                    : "Add your first subject to start organizing your academic life.";

            el.emptyAddSubject.hidden = hasSubjects;

            refreshIcons();
            return;
        }

        el.empty.hidden = true;

        el.grid.innerHTML = filtered.map(subject => {
            const color = normalizeColor(subject.color);

            const hasSchedule = schedules.some(schedule =>
                String(schedule.subject_id) === String(subject.id)
            );

            return `
                <article class="subject-card"
                         style="--subject-color: ${color}"
                         data-subject-id="${escapeHTML(subject.id)}">

                    <div class="subject-card-top">

                        <div class="subject-card-icon">
                            <i data-lucide="book-open"></i>
                        </div>

                        <div class="subject-menu">

                            <button class="subject-menu-button"
                                    type="button"
                                    data-action="menu"
                                    aria-label="Subject options">
                                <i data-lucide="ellipsis"></i>
                            </button>

                            <div class="subject-menu-actions">

                                <button type="button" data-action="edit">
                                    <i data-lucide="pencil"></i>
                                    Edit
                                </button>

                                <button type="button"
                                        class="delete-subject"
                                        data-action="delete">
                                    <i data-lucide="trash-2"></i>
                                    Delete
                                </button>

                            </div>
                        </div>

                    </div>

                    <h3 class="subject-card-name">
                        ${escapeHTML(subject.name)}
                    </h3>

                    <div class="subject-card-code">
                        ${escapeHTML(subject.subject_code || "NO SUBJECT CODE")}
                    </div>

                    <div class="subject-card-details">

                        <div class="subject-detail">
                            <i data-lucide="user-round"></i>
                            <span>${escapeHTML(subject.teacher_name || "No teacher added")}</span>
                        </div>

                        <div class="subject-detail">
                            <i data-lucide="map-pin"></i>
                            <span>${escapeHTML(subject.room || "No room assigned")}</span>
                        </div>

                        <div class="subject-detail">
                            <i data-lucide="calendar-days"></i>
                            <span>${hasSchedule ? "Class schedule added" : "No class schedule yet"}</span>
                        </div>

                    </div>

                </article>
            `;
        }).join("");

        refreshIcons();
    }

    // -----------------------------------------------------
    // SUBJECT MODAL
    // -----------------------------------------------------

    function openSubjectModal(subject = null) {
        el.subjectForm.reset();
        el.subjectId.value = "";
        el.color.value = DEFAULT_COLOR;
        showSubjectFormFeedback("");

        if (subject) {
            el.subjectModalTitle.textContent = "Edit Subject";

            el.subjectId.value = subject.id;
            el.subjectName.value = subject.name || "";
            el.subjectCode.value = subject.subject_code || "";
            el.teacher.value = subject.teacher_name || "";
            el.room.value = subject.room || "";
            el.color.value = normalizeColor(subject.color);

            el.saveSubject.textContent = "Update Subject";
        } else {
            el.subjectModalTitle.textContent = "Add a Subject";
            el.saveSubject.textContent = "Save Subject";
        }

        el.subjectModal.classList.add("active");
        el.subjectModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        setTimeout(() => el.subjectName.focus(), 100);
    }

    function closeSubjectModal() {
        el.subjectModal.classList.remove("active");
        el.subjectModal.setAttribute("aria-hidden", "true");

        document.body.style.overflow = "";
        el.subjectForm.reset();
        el.subjectId.value = "";
        showSubjectFormFeedback("");
    }

    // -----------------------------------------------------
    // SAVE SUBJECT
    // -----------------------------------------------------

    async function saveSubject(event) {
        event.preventDefault();

        const subjectId = el.subjectId.value;

        const subjectData = {
            name: el.subjectName.value.trim(),
            subject_code: el.subjectCode.value.trim() || null,
            teacher_name: el.teacher.value.trim() || null,
            room: el.room.value.trim() || null,
            color: normalizeColor(el.color.value)
        };

        if (!subjectData.name) {
            showSubjectFormFeedback("Please enter a subject name.");
            return;
        }

        el.saveSubject.disabled = true;
        el.saveSubject.textContent = "Saving...";
        showSubjectFormFeedback("");

        let result;

        if (subjectId) {
            result = await supabase
                .from("subjects")
                .update({
                    ...subjectData,
                    updated_at: new Date().toISOString()
                })
                .eq("id", subjectId)
                .eq("user_id", currentUser.id);
        } else {
            result = await supabase
                .from("subjects")
                .insert({
                    ...subjectData,
                    user_id: currentUser.id
                });
        }

        el.saveSubject.disabled = false;
        el.saveSubject.textContent = subjectId ? "Update Subject" : "Save Subject";

        if (result.error) {
            console.error("Subject save error:", result.error);
            showSubjectFormFeedback("Could not save the subject. Please try again.");
            return;
        }

        closeSubjectModal();
        await loadAcademicData();

        showSubjectFeedback(
            subjectId
                ? "Subject updated successfully."
                : "Subject added successfully."
        );
    }

    // -----------------------------------------------------
    // DELETE SUBJECT
    // -----------------------------------------------------

    async function deleteSubject(subjectId) {
        const subject = getSubject(subjectId);

        if (!subject) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${subject.name}"?`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("subjects")
            .delete()
            .eq("id", subjectId)
            .eq("user_id", currentUser.id);

        if (error) {
            console.error("Subject deletion error:", error);

            showSubjectFeedback(
                "Could not delete this subject. Check whether it still has class schedules or academic records linked to it.",
                true
            );
            return;
        }

        await loadAcademicData();
        showSubjectFeedback("Subject deleted successfully.");
    }

    // -----------------------------------------------------
    // SUBJECT CARD ACTIONS
    // -----------------------------------------------------

    function handleSubjectGridClick(event) {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const card = button.closest(".subject-card");
        if (!card) return;

        const subjectId = card.dataset.subjectId;
        const action = button.dataset.action;
        const subject = getSubject(subjectId);

        if (!subject) return;

        if (action === "menu") {
            const menu = button.closest(".subject-menu");

            document.querySelectorAll(".subject-menu.open").forEach(item => {
                if (item !== menu) item.classList.remove("open");
            });

            menu.classList.toggle("open");
        }

        if (action === "edit") {
            openSubjectModal(subject);
        }

        if (action === "delete") {
            deleteSubject(subjectId);
        }
    }

    // =====================================================
    // CLASS SCHEDULES
    // =====================================================

    // -----------------------------------------------------
    // SCHEDULE STATISTICS
    // -----------------------------------------------------

    function updateScheduleStatistics() {
        const uniqueSubjects = new Set(
            schedules.map(schedule => String(schedule.subject_id))
        );

        const uniqueDays = new Set(
            schedules.map(schedule => Number(schedule.day_of_week))
        );

        el.totalClasses.textContent = schedules.length;
        el.scheduleSubjects.textContent = uniqueSubjects.size;
        el.activeDays.textContent = uniqueDays.size;
    }

    // -----------------------------------------------------
    // SUBJECT DROPDOWN
    // -----------------------------------------------------

    function populateSubjectOptions(selectedId = "") {
        const previousValue = selectedId || el.scheduleSubject.value;

        el.scheduleSubject.innerHTML = `
            <option value="">Choose a subject</option>
            ${subjects.map(subject => `
                <option value="${escapeHTML(subject.id)}">
                    ${escapeHTML(subject.name)}
                </option>
            `).join("")}
        `;

        if (previousValue && subjects.some(subject =>
            String(subject.id) === String(previousValue)
        )) {
            el.scheduleSubject.value = previousValue;
        }
    }

    // -----------------------------------------------------
    // RENDER WEEKLY SCHEDULE
    // -----------------------------------------------------

    function renderSchedules() {
        el.scheduleWeek.innerHTML = "";

        if (schedules.length === 0) {
            el.scheduleEmpty.hidden = false;
            refreshIcons();
            return;
        }

        el.scheduleEmpty.hidden = true;

        const sortedSchedules = [...schedules].sort((a, b) => {
            const dayA = DAYS.findIndex(day => day.value === Number(a.day_of_week));
            const dayB = DAYS.findIndex(day => day.value === Number(b.day_of_week));

            if (dayA !== dayB) return dayA - dayB;

            return String(a.start_time).localeCompare(String(b.start_time));
        });

        el.scheduleWeek.innerHTML = DAYS.map(day => {
            const daySchedules = sortedSchedules.filter(schedule =>
                Number(schedule.day_of_week) === day.value
            );

            return `
                <section class="schedule-day">

                    <div class="schedule-day-header">
                        <span class="schedule-day-short">${day.short}</span>
                        <h3>${day.name}</h3>
                        <span class="schedule-day-count">
                            ${daySchedules.length} ${daySchedules.length === 1 ? "class" : "classes"}
                        </span>
                    </div>

                    <div class="schedule-day-content">

                        ${daySchedules.length
                            ? daySchedules.map(schedule => {
                                const subject = getSubject(schedule.subject_id);
                                const color = normalizeColor(subject?.color);

                                return `
                                    <article class="schedule-class"
                                             style="--schedule-color: ${color}"
                                             data-schedule-id="${escapeHTML(schedule.id)}">

                                        <div class="schedule-class-time">
                                            <strong>${escapeHTML(formatTime(schedule.start_time))}</strong>
                                            <span>${escapeHTML(formatTime(schedule.end_time))}</span>
                                        </div>

                                        <div class="schedule-class-info">
                                            <h4>${escapeHTML(subject?.name || "Unavailable subject")}</h4>
                                            <p>
                                                <i data-lucide="map-pin"></i>
                                                ${escapeHTML(schedule.location || subject?.room || "Location not set")}
                                            </p>
                                        </div>

                                        <div class="schedule-class-actions">

                                            <button type="button"
                                                    data-schedule-action="edit"
                                                    aria-label="Edit class">
                                                <i data-lucide="pencil"></i>
                                            </button>

                                            <button type="button"
                                                    data-schedule-action="delete"
                                                    aria-label="Delete class">
                                                <i data-lucide="trash-2"></i>
                                            </button>

                                        </div>

                                    </article>
                                `;
                            }).join("")
                            : `
                                <div class="schedule-day-empty">
                                    No classes scheduled
                                </div>
                            `
                        }

                    </div>

                </section>
            `;
        }).join("");

        refreshIcons();
    }

    // -----------------------------------------------------
    // SCHEDULE MODAL
    // -----------------------------------------------------

    function openScheduleModal(schedule = null) {
        if (subjects.length === 0) {
            showScheduleFeedback("Add a subject first before creating a class schedule.", true);
            return;
        }

        el.scheduleForm.reset();
        el.scheduleId.value = "";
        showScheduleFormFeedback("");
        populateSubjectOptions();

        if (schedule) {
            el.scheduleModalTitle.textContent = "Edit Class";
            el.scheduleId.value = schedule.id;
            el.scheduleSubject.value = schedule.subject_id;
            el.scheduleDay.value = String(schedule.day_of_week);
            el.scheduleStart.value = schedule.start_time.slice(0, 5);
            el.scheduleEnd.value = schedule.end_time.slice(0, 5);
            el.scheduleLocation.value = schedule.location || "";
            el.saveSchedule.textContent = "Update Class";
        } else {
            el.scheduleModalTitle.textContent = "Add a Class";
            el.saveSchedule.textContent = "Save Class";
        }

        el.scheduleModal.classList.add("active");
        el.scheduleModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        setTimeout(() => el.scheduleSubject.focus(), 100);
    }

    function closeScheduleModal() {
        el.scheduleModal.classList.remove("active");
        el.scheduleModal.setAttribute("aria-hidden", "true");

        document.body.style.overflow = "";
        el.scheduleForm.reset();
        el.scheduleId.value = "";
        showScheduleFormFeedback("");
    }

    // -----------------------------------------------------
    // CHECK SCHEDULE OVERLAPS
    // -----------------------------------------------------

    function hasScheduleConflict(day, start, end, editingId = "") {
        return schedules.some(schedule => {
            if (editingId && String(schedule.id) === String(editingId)) {
                return false;
            }

            if (Number(schedule.day_of_week) !== Number(day)) {
                return false;
            }

            const existingStart = String(schedule.start_time).slice(0, 5);
            const existingEnd = String(schedule.end_time).slice(0, 5);

            return start < existingEnd && end > existingStart;
        });
    }

    // -----------------------------------------------------
    // SAVE SCHEDULE
    // -----------------------------------------------------

    async function saveSchedule(event) {
        event.preventDefault();

        const scheduleId = el.scheduleId.value;
        const subjectId = el.scheduleSubject.value;
        const day = el.scheduleDay.value;
        const start = el.scheduleStart.value;
        const end = el.scheduleEnd.value;
        const location = el.scheduleLocation.value.trim();

        if (!subjectId || !day || !start || !end) {
            showScheduleFormFeedback("Please complete all required fields.");
            return;
        }

        if (end <= start) {
            showScheduleFormFeedback("The end time must be later than the start time.");
            return;
        }

        if (hasScheduleConflict(day, start, end, scheduleId)) {
            showScheduleFormFeedback(
                "This time overlaps with another class on the selected day."
            );
            return;
        }

        const scheduleData = {
            user_id: currentUser.id,
            subject_id: subjectId,
            day_of_week: Number(day),
            start_time: start,
            end_time: end,
            location: location || null
        };

        el.saveSchedule.disabled = true;
        el.saveSchedule.textContent = "Saving...";
        showScheduleFormFeedback("");

        let result;

        if (scheduleId) {
            result = await supabase
                .from("class_schedules")
                .update(scheduleData)
                .eq("id", scheduleId)
                .eq("user_id", currentUser.id);
        } else {
            result = await supabase
                .from("class_schedules")
                .insert(scheduleData);
        }

        el.saveSchedule.disabled = false;
        el.saveSchedule.textContent = scheduleId ? "Update Class" : "Save Class";

        if (result.error) {
            console.error("Schedule save error:", result.error);
            showScheduleFormFeedback("Could not save the class. Please try again.");
            return;
        }

        closeScheduleModal();
        await loadAcademicData();

        showScheduleFeedback(
            scheduleId
                ? "Class schedule updated successfully."
                : "Class added to your timetable successfully."
        );
    }

    // -----------------------------------------------------
    // DELETE SCHEDULE
    // -----------------------------------------------------

    async function deleteSchedule(scheduleId) {
        const schedule = schedules.find(item =>
            String(item.id) === String(scheduleId)
        );

        if (!schedule) return;

        const subject = getSubject(schedule.subject_id);
        const dayName = getDayName(schedule.day_of_week);

        const confirmed = window.confirm(
            `Delete ${subject?.name || "this class"} on ${dayName}?`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("class_schedules")
            .delete()
            .eq("id", scheduleId)
            .eq("user_id", currentUser.id);

        if (error) {
            console.error("Schedule deletion error:", error);
            showScheduleFeedback("Could not delete this class. Please try again.", true);
            return;
        }

        await loadAcademicData();
        showScheduleFeedback("Class schedule deleted successfully.");
    }

    // -----------------------------------------------------
    // SCHEDULE CARD ACTIONS
    // -----------------------------------------------------

    function handleScheduleClick(event) {
        const button = event.target.closest("[data-schedule-action]");
        if (!button) return;

        const card = button.closest("[data-schedule-id]");
        if (!card) return;

        const schedule = schedules.find(item =>
            String(item.id) === String(card.dataset.scheduleId)
        );

        if (!schedule) return;

        const action = button.dataset.scheduleAction;

        if (action === "edit") {
            openScheduleModal(schedule);
        }

        if (action === "delete") {
            deleteSchedule(schedule.id);
        }
    }

    // -----------------------------------------------------
    // EVENT LISTENERS
    // -----------------------------------------------------

    function attachEvents() {

        // Subject events
        el.addSubject.addEventListener("click", () => openSubjectModal());
        el.emptyAddSubject.addEventListener("click", () => openSubjectModal());

        el.closeSubject.addEventListener("click", closeSubjectModal);
        el.cancelSubject.addEventListener("click", closeSubjectModal);
        el.subjectBackdrop.addEventListener("click", closeSubjectModal);

        el.subjectForm.addEventListener("submit", saveSubject);
        el.grid.addEventListener("click", handleSubjectGridClick);

        el.search.addEventListener("input", renderSubjects);
        el.sort.addEventListener("change", renderSubjects);

        // Schedule events
        el.addSchedule.addEventListener("click", () => openScheduleModal());
        el.emptyAddSchedule.addEventListener("click", () => openScheduleModal());

        el.closeSchedule.addEventListener("click", closeScheduleModal);
        el.cancelSchedule.addEventListener("click", closeScheduleModal);
        el.scheduleBackdrop.addEventListener("click", closeScheduleModal);

        el.scheduleForm.addEventListener("submit", saveSchedule);
        el.scheduleWeek.addEventListener("click", handleScheduleClick);

        el.refreshSchedules.addEventListener("click", loadAcademicData);

        // Close open subject menus when clicking outside
        document.addEventListener("click", event => {
            if (!event.target.closest(".subject-menu")) {
                document.querySelectorAll(".subject-menu.open").forEach(menu => {
                    menu.classList.remove("open");
                });
            }
        });

        // Escape closes active modal
        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") return;

            if (el.subjectModal.classList.contains("active")) {
                closeSubjectModal();
            }

            if (el.scheduleModal.classList.contains("active")) {
                closeScheduleModal();
            }
        });
    }

    // -----------------------------------------------------
    // INITIALIZE
    // -----------------------------------------------------

    async function init() {
        console.log("LIFEOS Academic Management started.");

        const authenticated = await checkUser();

        if (!authenticated) return;

        attachEvents();
        await loadAcademicData();

        console.log("Subjects and class schedules initialized.");
    }

    init();

})();
