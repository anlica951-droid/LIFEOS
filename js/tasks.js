
/* =========================================
   LIFEOS — TASKS
   File: js/tasks.js
   Database: Supabase personal_tasks
========================================= */

import { supabase } from "./supabase.js";

(() => {
    "use strict";

    const elements = {
        taskForm: document.getElementById("taskForm"),
        taskName: document.getElementById("taskName"),
        taskDate: document.getElementById("taskDate"),
        taskTime: document.getElementById("taskTime"),
        taskCategory: document.getElementById("taskCategory"),

        tasksList: document.getElementById("tasksList"),
        taskSearch: document.getElementById("taskSearch"),
        taskFilter: document.getElementById("taskFilter"),
        taskSort: document.getElementById("taskSort"),

        taskCount: document.getElementById("taskCount"),
        completedCount: document.getElementById("completedCount"),
        pendingCount: document.getElementById("pendingCount"),

        taskDialog: document.getElementById("taskDialog"),
        openTaskDialog: document.getElementById("openTaskDialog"),
        closeTaskDialog: document.getElementById("closeTaskDialog"),
        cancelTask: document.getElementById("cancelTask"),

        taskFeedback: document.getElementById("taskFeedback")
    };

    let tasks = [];
    let user = null;
    let editingTaskId = null;
    let busy = false;

    /* -----------------------------------------
       HELPERS
    ----------------------------------------- */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function getToday() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function getTaskDate(task) {
        if (!task.due_at) return "";

        const date = new Date(task.due_at);

        if (Number.isNaN(date.getTime())) return "";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getTaskTime(task) {
        if (!task.due_at) return "";

        const date = new Date(task.due_at);

        if (Number.isNaN(date.getTime())) return "";

        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }

    function formatDate(dateString) {
        if (!dateString) return "No due date";

        const date = new Date(`${dateString}T00:00:00`);

        if (Number.isNaN(date.getTime())) return "No due date";

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function getDueAt(date, time) {
        if (!date) return null;

        const dateTime = new Date(`${date}T${time || "23:59"}:00`);

        if (Number.isNaN(dateTime.getTime())) {
            throw new Error("Please enter a valid due date and time.");
        }

        return dateTime.toISOString();
    }

    function isCompleted(task) {
        return task.status === "completed";
    }

    function showFeedback(message, type = "error") {
        if (!elements.taskFeedback) return;

        elements.taskFeedback.textContent = message;
        elements.taskFeedback.style.color =
            type === "success" ? "#607b63" : "#9b594e";

        elements.taskFeedback.hidden = false;

        clearTimeout(showFeedback.timeout);

        showFeedback.timeout = setTimeout(() => {
            elements.taskFeedback.hidden = true;
        }, 3500);
    }

    function setBusy(value) {
        busy = value;

        const submitButton = elements.taskForm?.querySelector(
            '[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = value;
        }

        if (elements.openTaskDialog) {
            elements.openTaskDialog.disabled = value;
        }
    }

    function openDialog() {
        if (!elements.taskDialog) return;

        if (typeof elements.taskDialog.showModal === "function") {
            elements.taskDialog.showModal();
        } else {
            elements.taskDialog.setAttribute("open", "");
        }
    }

    function closeDialog() {
        if (!elements.taskDialog) return;

        if (typeof elements.taskDialog.close === "function") {
            elements.taskDialog.close();
        } else {
            elements.taskDialog.removeAttribute("open");
        }

        resetForm();
    }

    function resetForm() {
        elements.taskForm?.reset();

        editingTaskId = null;

        const submitButton = elements.taskForm?.querySelector(
            '[type="submit"]'
        );

        if (submitButton) {
            submitButton.textContent = "Add Task";
        }

        const dialogTitle = elements.taskDialog?.querySelector(
            "[data-dialog-title]"
        );

        if (dialogTitle) {
            dialogTitle.textContent = "Create a Task";
        }
    }

    /* -----------------------------------------
       DATABASE
    ----------------------------------------- */

    async function loadTasks() {
        if (!user) return;

        const { data, error } = await supabase
            .from("personal_tasks")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Unable to load tasks:", error);
            showFeedback("Unable to load your tasks. Please refresh the page.");
            return;
        }

        tasks = data || [];
        renderTasks();
    }

    async function addTask(formData) {
        const dueAt = getDueAt(formData.date, formData.time);

        const newTask = {
            user_id: user.id,
            title: formData.name,
            category: formData.category,
            priority: "medium",
            status: "pending",
            due_at: dueAt
        };

        const { data, error } = await supabase
            .from("personal_tasks")
            .insert(newTask)
            .select()
            .single();

        if (error) {
            console.error("Unable to add task:", error);
            showFeedback(error.message || "Your task could not be saved.");
            return false;
        }

        tasks.unshift(data);
        renderTasks();
        showFeedback("Task added successfully.", "success");

        return true;
    }

    async function updateTask(taskId, formData) {
        const dueAt = getDueAt(formData.date, formData.time);

        const { data, error } = await supabase
            .from("personal_tasks")
            .update({
                title: formData.name,
                category: formData.category,
                due_at: dueAt
            })
            .eq("id", taskId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Unable to update task:", error);
            showFeedback(error.message || "Your task could not be updated.");
            return false;
        }

        tasks = tasks.map(task =>
            task.id === taskId ? data : task
        );

        renderTasks();
        showFeedback("Task updated successfully.", "success");

        return true;
    }

    async function toggleTask(taskId) {
        const task = tasks.find(item => item.id === taskId);
        if (!task) return;

        const completed = !isCompleted(task);

        const { data, error } = await supabase
            .from("personal_tasks")
            .update({
                status: completed ? "completed" : "pending",
                completed_at: completed ? new Date().toISOString() : null
            })
            .eq("id", taskId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Unable to update task status:", error);
            showFeedback("Could not update task status.");
            return;
        }

        tasks = tasks.map(item =>
            item.id === taskId ? data : item
        );

        renderTasks();

        showFeedback(
            completed
                ? "Task completed. Well done!"
                : "Task marked as pending.",
            "success"
        );
    }

    async function deleteTask(taskId) {
        const { error } = await supabase
            .from("personal_tasks")
            .delete()
            .eq("id", taskId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Unable to delete task:", error);
            showFeedback("Your task could not be deleted.");
            return;
        }

        tasks = tasks.filter(task => task.id !== taskId);

        renderTasks();
        showFeedback("Task deleted.", "success");
    }

    /* -----------------------------------------
       TASK EDITING
    ----------------------------------------- */

    function editTask(taskId) {
        const task = tasks.find(item => item.id === taskId);
        if (!task) return;

        editingTaskId = taskId;

        if (elements.taskName) {
            elements.taskName.value = task.title || "";
        }

        if (elements.taskDate) {
            elements.taskDate.value = getTaskDate(task);
        }

        if (elements.taskTime) {
            elements.taskTime.value = getTaskTime(task);
        }

        if (elements.taskCategory) {
            elements.taskCategory.value = task.category || "Personal";
        }

        const submitButton = elements.taskForm?.querySelector(
            '[type="submit"]'
        );

        if (submitButton) {
            submitButton.textContent = "Save Changes";
        }

        const dialogTitle = elements.taskDialog?.querySelector(
            "[data-dialog-title]"
        );

        if (dialogTitle) {
            dialogTitle.textContent = "Edit Task";
        }

        openDialog();
    }

    /* -----------------------------------------
       FILTERING AND SORTING
    ----------------------------------------- */

    function getVisibleTasks() {
        const searchTerm = elements.taskSearch?.value
            .trim()
            .toLowerCase() || "";

        const filter = elements.taskFilter?.value || "all";
        const sort = elements.taskSort?.value || "newest";
        const today = getToday();

        const result = tasks.filter(task => {
            const title = (task.title || "").toLowerCase();
            const category = (task.category || "").toLowerCase();
            const date = getTaskDate(task);
            const completed = isCompleted(task);

            const matchesSearch =
                title.includes(searchTerm) ||
                category.includes(searchTerm);

            let matchesFilter = true;

            if (filter === "pending") {
                matchesFilter = !completed;
            } else if (filter === "completed") {
                matchesFilter = completed;
            } else if (filter === "today") {
                matchesFilter = date === today;
            } else if (filter === "upcoming") {
                matchesFilter = !completed && date && date > today;
            }

            return matchesSearch && matchesFilter;
        });

        result.sort((a, b) => {
            if (sort === "oldest") {
                return new Date(a.created_at) - new Date(b.created_at);
            }

            if (sort === "alphabetical") {
                return (a.title || "").localeCompare(b.title || "");
            }

            if (sort === "dueDate") {
                return (getTaskDate(a) || "9999-12-31").localeCompare(
                    getTaskDate(b) || "9999-12-31"
                );
            }

            if (sort === "newest") {
                return new Date(b.created_at) - new Date(a.created_at);
            }

            return 0;
        });

        return result;
    }

    /* -----------------------------------------
       TASK DISPLAY
    ----------------------------------------- */

    function renderTasks() {
        if (!elements.tasksList) return;

        const visibleTasks = getVisibleTasks();

        if (visibleTasks.length === 0) {
            elements.tasksList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i data-lucide="clipboard-check"></i>
                    </div>
                    <h3>No tasks found</h3>
                    <p>Add a task or adjust your search and filters.</p>
                </div>
            `;
        } else {
            elements.tasksList.innerHTML = visibleTasks.map(task => {
                const completed = isCompleted(task);
                const safeName = escapeHTML(task.title || "Untitled task");
                const safeCategory = escapeHTML(task.category || "Personal");
                const safeDate = escapeHTML(formatDate(getTaskDate(task)));
                const safeTime = escapeHTML(getTaskTime(task));
                const safeId = escapeHTML(task.id);

                return `
                    <article class="task-item ${completed ? "completed" : ""}"
                             data-task-id="${safeId}">

                        <label class="task-checkbox">
                            <input
                                type="checkbox"
                                data-action="toggle"
                                data-id="${safeId}"
                                ${completed ? "checked" : ""}
                                aria-label="Mark ${safeName} as ${
                                    completed ? "pending" : "completed"
                                }"
                            >
                            <span class="custom-checkbox"></span>
                        </label>

                        <div class="task-details">
                            <h3>${safeName}</h3>

                            <div class="task-meta">
                                <span class="task-category">${safeCategory}</span>
                                <span class="task-date">${safeDate}</span>
                                ${safeTime
                                    ? `<span class="task-time">${safeTime}</span>`
                                    : ""}
                            </div>
                        </div>

                        <div class="task-actions">
                            <button
                                type="button"
                                class="icon-button"
                                data-action="edit"
                                data-id="${safeId}"
                                aria-label="Edit ${safeName}"
                                title="Edit task"
                            >
                                <i data-lucide="pencil"></i>
                            </button>

                            <button
                                type="button"
                                class="icon-button delete-button"
                                data-action="delete"
                                data-id="${safeId}"
                                aria-label="Delete ${safeName}"
                                title="Delete task"
                            >
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </article>
                `;
            }).join("");
        }

        updateStatistics();

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /* -----------------------------------------
       STATISTICS
    ----------------------------------------- */

    function updateStatistics() {
        const total = tasks.length;
        const completed = tasks.filter(isCompleted).length;
        const pending = total - completed;

        if (elements.taskCount) {
            elements.taskCount.textContent = total;
        }

        if (elements.completedCount) {
            elements.completedCount.textContent = completed;
        }

        if (elements.pendingCount) {
            elements.pendingCount.textContent = pending;
        }
    }

    /* -----------------------------------------
       FORM SUBMISSION
    ----------------------------------------- */

    elements.taskForm?.addEventListener("submit", async event => {
        event.preventDefault();

        if (busy) return;

        const name = elements.taskName?.value.trim();

        if (!name) {
            showFeedback("Please enter a task name.");
            elements.taskName?.focus();
            return;
        }

        const formData = {
            name,
            date: elements.taskDate?.value || "",
            time: elements.taskTime?.value || "",
            category: elements.taskCategory?.value || "Personal"
        };

        setBusy(true);

        try {
            const saved = editingTaskId
                ? await updateTask(editingTaskId, formData)
                : await addTask(formData);

            if (saved) {
                closeDialog();
            }
        } catch (error) {
            console.error("Task save failed:", error);
            showFeedback(error.message || "Something went wrong.");
        } finally {
            setBusy(false);
        }
    });

    /* -----------------------------------------
       TASK ACTIONS
    ----------------------------------------- */

    elements.tasksList?.addEventListener("change", event => {
        const checkbox = event.target.closest('[data-action="toggle"]');

        if (checkbox) {
            toggleTask(checkbox.dataset.id);
        }
    });

    elements.tasksList?.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const taskId = button.dataset.id;
        const action = button.dataset.action;

        if (action === "edit") {
            editTask(taskId);
        }

        if (action === "delete") {
            deleteTask(taskId);
        }
    });

    /* -----------------------------------------
       SEARCH, FILTER AND SORT
    ----------------------------------------- */

    elements.taskSearch?.addEventListener("input", renderTasks);
    elements.taskFilter?.addEventListener("change", renderTasks);
    elements.taskSort?.addEventListener("change", renderTasks);

    /* -----------------------------------------
       DIALOG CONTROLS
    ----------------------------------------- */

    elements.openTaskDialog?.addEventListener("click", () => {
        resetForm();
        openDialog();
    });

    elements.closeTaskDialog?.addEventListener("click", closeDialog);
    elements.cancelTask?.addEventListener("click", closeDialog);

    elements.taskDialog?.addEventListener("click", event => {
        if (event.target === elements.taskDialog) {
            closeDialog();
        }
    });

    /* -----------------------------------------
       INITIALIZE
    ----------------------------------------- */

    async function initialize() {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.replace(
                new URL("../login.html", window.location.href).href
            );
            return;
        }

        user = data.user;
        await loadTasks();
    }

    initialize();

})();
