
/* =========================================================
   LIFEOS — ACADEMIC WORK
   File: js/academic-work.js
   Database: Supabase (academic_items + subjects)
   ========================================================= */

import { supabase } from "./supabase.js";

(() => {
    "use strict";

    // -----------------------------------------------------
    // ELEMENTS
    // -----------------------------------------------------

    const el = {
        addButton: document.getElementById("awAddButton"),
        emptyAddButton: document.getElementById("awEmptyAddButton"),

        total: document.getElementById("awTotal"),
        pending: document.getElementById("awPending"),
        progress: document.getElementById("awProgress"),
        completed: document.getElementById("awCompleted"),

        search: document.getElementById("awSearch"),
        typeFilter: document.getElementById("awFilter"),
        statusFilter: document.getElementById("awStatusFilter"),

        feedback: document.getElementById("awFeedback"),
        loading: document.getElementById("awLoading"),
        list: document.getElementById("awList"),
        empty: document.getElementById("awEmpty"),

        modal: document.getElementById("awDialog"),
        backdrop: document.getElementById("awBackdrop"),
        modalTitle: document.getElementById("awDialogTitle"),
        closeButton: document.getElementById("awClose"),

        form: document.getElementById("awForm"),
        id: document.getElementById("awId"),
        title: document.getElementById("awTitle"),
        subject: document.getElementById("awSubject"),
        type: document.getElementById("awType"),
        description: document.getElementById("awDescription"),
        due: document.getElementById("awDue"),
        priority: document.getElementById("awPriority"),
        status: document.getElementById("awStatus"),

        formFeedback: document.getElementById("awFormFeedback"),
        cancelButton: document.getElementById("awCancel"),
        saveButton: document.getElementById("awSave")
    };

    // -----------------------------------------------------
    // STATE
    // -----------------------------------------------------

    let currentUser = null;
    let subjects = [];
    let academicItems = [];
    let saving = false;

    // -----------------------------------------------------
    // HELPERS
    // -----------------------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function showFeedback(message, type = "success") {
        if (!el.feedback) return;

        el.feedback.textContent = message;
        el.feedback.className = type;

        if (!message) {
            el.feedback.className = "";
        }
    }

    function showFormFeedback(message, type = "error") {
        if (!el.formFeedback) return;

        el.formFeedback.textContent = message;
        el.formFeedback.className = message ? type : "";
    }

    function getSubjectName(subjectId) {
        const subject = subjects.find(item => item.id === subjectId);
        return subject ? subject.name : "Unknown subject";
    }

    function getSubjectColor(subjectId) {
        const subject = subjects.find(item => item.id === subjectId);
        return subject?.color || "#A9BD9E";
    }

    function formatDate(value) {
        if (!value) return "No due date";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Invalid date";

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function getDueLabel(value) {
        if (!value) {
            return {
                text: "No due date",
                overdue: false
            };
        }

        const dueDate = new Date(value);
        const now = new Date();

        if (Number.isNaN(dueDate.getTime())) {
            return {
                text: "Invalid date",
                overdue: false
            };
        }

        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        const dueDay = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth(),
            dueDate.getDate()
        );

        if (dueDay < today) {
            return {
                text: `Overdue · ${formatDate(value)}`,
                overdue: true
            };
        }

        if (dueDay.getTime() === today.getTime()) {
            return {
                text: "Due today",
                overdue: false
            };
        }

        return {
            text: formatDate(value),
            overdue: false
        };
    }

    function toLocalDateTime(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        const offset = date.getTimezoneOffset() * 60000;

        return new Date(date.getTime() - offset)
            .toISOString()
            .slice(0, 16);
    }

    function setLoading(show) {
        if (el.loading) {
            el.loading.hidden = !show;
        }
    }

    // -----------------------------------------------------
    // LOAD SUBJECTS
    // -----------------------------------------------------

    async function loadSubjects() {
        const { data, error } = await supabase
            .from("subjects")
            .select("id, name, color")
            .eq("user_id", currentUser.id)
            .order("name", { ascending: true });

        if (error) {
            console.error("Failed to load subjects:", error);
            throw error;
        }

        subjects = data || [];

        renderSubjectOptions();
    }

    function renderSubjectOptions(selectedId = "") {
        if (!el.subject) return;

        if (!subjects.length) {
            el.subject.innerHTML =
                '<option value="">Add a subject first</option>';

            el.subject.disabled = true;
            return;
        }

        el.subject.disabled = false;

        el.subject.innerHTML = `
            <option value="">Select a subject</option>
            ${subjects.map(subject => `
                <option value="${escapeHTML(subject.id)}"
                    ${subject.id === selectedId ? "selected" : ""}>
                    ${escapeHTML(subject.name)}
                </option>
            `).join("")}
        `;
    }

    // -----------------------------------------------------
    // LOAD ACADEMIC ITEMS
    // -----------------------------------------------------

    async function loadAcademicItems() {
        setLoading(true);
        showFeedback("");

        const { data, error } = await supabase
            .from("academic_items")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("due_at", {
                ascending: true,
                nullsFirst: false
            });

        setLoading(false);

        if (error) {
            console.error("Failed to load academic work:", error);
            showFeedback(
                "Unable to load academic work. Please refresh and try again.",
                "error"
            );
            return;
        }

        academicItems = data || [];

        renderAll();
    }

    // -----------------------------------------------------
    // STATISTICS
    // -----------------------------------------------------

    function renderStats() {
        const total = academicItems.length;

        const pending = academicItems.filter(
            item => item.status === "pending"
        ).length;

        const progress = academicItems.filter(
            item => item.status === "in_progress"
        ).length;

        const completed = academicItems.filter(
            item => item.status === "completed"
        ).length;

        if (el.total) el.total.textContent = total;
        if (el.pending) el.pending.textContent = pending;
        if (el.progress) el.progress.textContent = progress;
        if (el.completed) el.completed.textContent = completed;
    }

    // -----------------------------------------------------
    // FILTERING
    // -----------------------------------------------------

    function getFilteredItems() {
        const searchTerm = (el.search?.value || "")
            .trim()
            .toLowerCase();

        const selectedType = el.typeFilter?.value || "all";
        const selectedStatus = el.statusFilter?.value || "all";

        return academicItems.filter(item => {
            const subjectName = getSubjectName(item.subject_id);

            const matchesSearch =
                !searchTerm ||
                item.title.toLowerCase().includes(searchTerm) ||
                (item.description || "").toLowerCase().includes(searchTerm) ||
                subjectName.toLowerCase().includes(searchTerm);

            const matchesType =
                selectedType === "all" ||
                item.item_type === selectedType;

            const matchesStatus =
                selectedStatus === "all" ||
                item.status === selectedStatus;

            return matchesSearch && matchesType && matchesStatus;
        });
    }

    // -----------------------------------------------------
    // RENDER ITEMS
    // -----------------------------------------------------

    function renderItems() {
        if (!el.list) return;

        const filteredItems = getFilteredItems();

        if (el.empty) {
            el.empty.hidden = filteredItems.length !== 0;
        }

        el.list.hidden = filteredItems.length === 0;

        if (!filteredItems.length) {
            el.list.innerHTML = "";
            return;
        }

        el.list.innerHTML = filteredItems.map(item => {
            const due = getDueLabel(item.due_at);
            const subjectColor = getSubjectColor(item.subject_id);

            const type = escapeHTML(
                (item.item_type || "other").replace("_", " ")
            );

            const status = escapeHTML(item.status || "pending");
            const priority = escapeHTML(item.priority || "medium");

            return `
                <article class="aw-card" data-id="${escapeHTML(item.id)}">

                    <div class="aw-card-top">
                        <span class="aw-card-type">
                            ${type}
                        </span>

                        <span class="aw-status ${status}">
                            ${status.replace("_", " ")}
                        </span>
                    </div>

                    <h3>${escapeHTML(item.title)}</h3>

                    ${item.description ? `
                        <p class="aw-card-description">
                            ${escapeHTML(item.description)}
                        </p>
                    ` : ""}

                    <div class="aw-card-subject">
                        <span style="
                            width: 9px;
                            height: 9px;
                            border-radius: 50%;
                            background: ${escapeHTML(subjectColor)};
                            display: inline-block;
                        "></span>

                        ${escapeHTML(getSubjectName(item.subject_id))}
                    </div>

                    <div class="aw-card-footer">

                        <div>
                            <div class="aw-card-due ${due.overdue ? "aw-overdue" : ""}">
                                <i data-lucide="calendar-days"></i>
                                ${escapeHTML(due.text)}
                            </div>

                            <span class="aw-priority ${priority}">
                                ${priority} priority
                            </span>
                        </div>

                        <div class="aw-card-actions">
                            <button type="button"
                                data-action="edit"
                                data-id="${escapeHTML(item.id)}"
                                aria-label="Edit ${escapeHTML(item.title)}">
                                <i data-lucide="pencil"></i>
                                Edit
                            </button>

                            <button type="button"
                                data-action="delete"
                                data-id="${escapeHTML(item.id)}"
                                aria-label="Delete ${escapeHTML(item.title)}">
                                <i data-lucide="trash-2"></i>
                                Delete
                            </button>
                        </div>

                    </div>
                </article>
            `;
        }).join("");

        refreshIcons();
    }

    function renderAll() {
        renderStats();
        renderItems();
    }

    // -----------------------------------------------------
    // MODAL
    // -----------------------------------------------------

    function openModal(item = null) {
        if (!el.modal || !el.form) return;

        el.form.reset();
        showFormFeedback("");

        if (item) {
            el.modalTitle.textContent = "Edit Academic Work";

            el.id.value = item.id;
            el.title.value = item.title || "";
            el.subject.value = item.subject_id || "";
            el.type.value = item.item_type || "assignment";
            el.description.value = item.description || "";
            el.due.value = toLocalDateTime(item.due_at);
            el.priority.value = item.priority || "medium";
            el.status.value = item.status || "pending";
        } else {
            el.modalTitle.textContent = "Add Academic Work";

            el.id.value = "";
            el.type.value = "assignment";
            el.priority.value = "medium";
            el.status.value = "pending";

            renderSubjectOptions();
        }

        el.modal.classList.add("active");
        el.modal.setAttribute("aria-hidden", "false");

        document.body.style.overflow = "hidden";

        refreshIcons();

        setTimeout(() => el.title?.focus(), 100);
    }

    function closeModal() {
        if (!el.modal) return;

        if (saving) return;

        el.modal.classList.remove("active");
        el.modal.setAttribute("aria-hidden", "true");

        document.body.style.overflow = "";
        showFormFeedback("");
    }

    // -----------------------------------------------------
    // SAVE ITEM
    // -----------------------------------------------------

    async function saveAcademicItem(event) {
        event.preventDefault();

        if (saving) return;

        if (!currentUser) return;

        const title = el.title.value.trim();
        const subjectId = el.subject.value;

        if (!title) {
            showFormFeedback("Please enter a title.");
            el.title.focus();
            return;
        }

        if (!subjectId) {
            showFormFeedback("Please select a subject.");
            el.subject.focus();
            return;
        }

        const selectedSubject = subjects.find(
            subject => subject.id === subjectId
        );

        if (!selectedSubject) {
            showFormFeedback("Please select a valid subject.");
            return;
        }

        const dueValue = el.due.value;

        let dueAt = null;

        if (dueValue) {
            const parsedDate = new Date(dueValue);

            if (Number.isNaN(parsedDate.getTime())) {
                showFormFeedback("Please enter a valid due date.");
                return;
            }

            dueAt = parsedDate.toISOString();
        }

        const itemId = el.id.value;

        const payload = {
            user_id: currentUser.id,
            subject_id: subjectId,
            title,
            item_type: el.type.value,
            description: el.description.value.trim() || null,
            due_at: dueAt,
            priority: el.priority.value,
            status: el.status.value,
            updated_at: new Date().toISOString()
        };

        saving = true;

        el.saveButton.disabled = true;
        el.cancelButton.disabled = true;
        el.saveButton.textContent = "Saving...";

        showFormFeedback("");

        let result;

        if (itemId) {
            result = await supabase
                .from("academic_items")
                .update(payload)
                .eq("id", itemId)
                .eq("user_id", currentUser.id);
        } else {
            result = await supabase
                .from("academic_items")
                .insert(payload);
        }

        saving = false;

        el.saveButton.disabled = false;
        el.cancelButton.disabled = false;
        el.saveButton.textContent = "Save";

        if (result.error) {
            console.error("Academic work save error:", result.error);

            showFormFeedback(
                result.error.message || "Unable to save. Please try again."
            );

            return;
        }

        el.modal.classList.remove("active");
        el.modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        showFeedback(
            itemId
                ? "Academic work updated successfully."
                : "Academic work added successfully.",
            "success"
        );

        await loadAcademicItems();
    }

    // -----------------------------------------------------
    // EDIT ITEM
    // -----------------------------------------------------

    function editAcademicItem(id) {
        const item = academicItems.find(record => record.id === id);

        if (!item) return;

        openModal(item);
    }

    // -----------------------------------------------------
    // DELETE ITEM
    // -----------------------------------------------------

    async function deleteAcademicItem(id) {
        const item = academicItems.find(record => record.id === id);

        if (!item) return;

        const confirmed = window.confirm(
            `Delete "${item.title}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("academic_items")
            .delete()
            .eq("id", id)
            .eq("user_id", currentUser.id);

        if (error) {
            console.error("Delete academic item error:", error);

            showFeedback(
                "Unable to delete this item. Please try again.",
                "error"
            );

            return;
        }

        showFeedback("Academic work deleted successfully.", "success");

        await loadAcademicItems();
    }

    // -----------------------------------------------------
    // EVENT LISTENERS
    // -----------------------------------------------------

    function attachEvents() {
        el.addButton?.addEventListener("click", () => {
            if (!subjects.length) {
                showFeedback(
                    "Please add a subject before creating academic work.",
                    "error"
                );
                return;
            }

            openModal();
        });

        el.emptyAddButton?.addEventListener("click", () => {
            if (!subjects.length) {
                showFeedback(
                    "Please add a subject before creating academic work.",
                    "error"
                );
                return;
            }

            openModal();
        });

        el.closeButton?.addEventListener("click", closeModal);
        el.cancelButton?.addEventListener("click", closeModal);
        el.backdrop?.addEventListener("click", closeModal);

        el.form?.addEventListener("submit", saveAcademicItem);

        el.search?.addEventListener("input", renderItems);
        el.typeFilter?.addEventListener("change", renderItems);
        el.statusFilter?.addEventListener("change", renderItems);

        el.list?.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const id = button.dataset.id;
            const action = button.dataset.action;

            if (action === "edit") {
                editAcademicItem(id);
            }

            if (action === "delete") {
                deleteAcademicItem(id);
            }
        });

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape" &&
                el.modal?.classList.contains("active")
            ) {
                closeModal();
            }
        });
    }

    // -----------------------------------------------------
    // INITIALIZATION
    // -----------------------------------------------------

    async function init() {
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error) throw error;

            currentUser = data.session?.user;

            if (!currentUser) {
                window.location.href = "../login.html";
                return;
            }

            attachEvents();

            await loadSubjects();
            await loadAcademicItems();

        } catch (error) {
            console.error("Academic Work initialization error:", error);

            setLoading(false);

            showFeedback(
                "Unable to initialize Academic Work. Please refresh the page.",
                "error"
            );
        }
    }

    init();

})();
