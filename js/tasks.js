
/* =========================================
   LIFEOS — TASKS
   File: js/tasks.js
   ========================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "lifeos_tasks";

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

  let tasks = loadTasks();
  let editingTaskId = null;

  /* -----------------------------------------
     STORAGE
  ----------------------------------------- */

  function loadTasks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error("Unable to load tasks:", error);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error("Unable to save tasks:", error);
      showFeedback("Your tasks could not be saved. Check your browser storage.");
      return false;
    }
  }

  /* -----------------------------------------
     HELPERS
  ----------------------------------------- */

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function formatDate(dateString) {
    if (!dateString) return "No due date";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "No due date";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function showFeedback(message) {
    if (!elements.taskFeedback) return;

    elements.taskFeedback.textContent = message;
    elements.taskFeedback.hidden = false;

    clearTimeout(showFeedback.timeout);

    showFeedback.timeout = setTimeout(() => {
      elements.taskFeedback.hidden = true;
    }, 3500);
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
    if (elements.taskForm) {
      elements.taskForm.reset();
    }

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
     TASK CREATION
  ----------------------------------------- */

  function addTask(formData) {
    const task = {
      id: createId(),
      name: formData.name,
      completed: false,
      date: formData.date,
      time: formData.time,
      category: formData.category,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    tasks.unshift(task);

    if (!saveTasks()) {
      tasks.shift();
      return;
    }

    renderTasks();
    showFeedback("Task added successfully.");
  }

  /* -----------------------------------------
     TASK EDITING
  ----------------------------------------- */

  function editTask(taskId) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;

    editingTaskId = taskId;

    if (elements.taskName) {
      elements.taskName.value = task.name;
    }

    if (elements.taskDate) {
      elements.taskDate.value = task.date || "";
    }

    if (elements.taskTime) {
      elements.taskTime.value = task.time || "";
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

  function updateTask(taskId, formData) {
    const index = tasks.findIndex(item => item.id === taskId);
    if (index === -1) return;

    const previousTask = { ...tasks[index] };

    tasks[index] = {
      ...tasks[index],
      name: formData.name,
      date: formData.date,
      time: formData.time,
      category: formData.category
    };

    if (!saveTasks()) {
      tasks[index] = previousTask;
      return;
    }

    renderTasks();
    showFeedback("Task updated successfully.");
  }

  /* -----------------------------------------
     TASK COMPLETION
  ----------------------------------------- */

  function toggleTask(taskId) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;

    const previousCompleted = task.completed;
    const previousCompletedAt = task.completedAt;

    task.completed = !task.completed;
    task.completedAt = task.completed
      ? new Date().toISOString()
      : null;

    if (!saveTasks()) {
      task.completed = previousCompleted;
      task.completedAt = previousCompletedAt;
      return;
    }

    renderTasks();

    showFeedback(
      task.completed
        ? "Task completed. Well done!"
        : "Task marked as pending."
    );
  }

  /* -----------------------------------------
     TASK DELETION
  ----------------------------------------- */

  function deleteTask(taskId) {
    const index = tasks.findIndex(item => item.id === taskId);
    if (index === -1) return;

    const deletedTask = tasks[index];

    tasks.splice(index, 1);

    if (!saveTasks()) {
      tasks.splice(index, 0, deletedTask);
      return;
    }

    renderTasks();
    showFeedback("Task deleted.");
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

    let result = tasks.filter(task => {
      const matchesSearch =
        task.name.toLowerCase().includes(searchTerm) ||
        String(task.category || "").toLowerCase().includes(searchTerm);

      let matchesFilter = true;

      if (filter === "pending") {
        matchesFilter = !task.completed;
      } else if (filter === "completed") {
        matchesFilter = task.completed;
      } else if (filter === "today") {
        matchesFilter = task.date === getToday();
      } else if (filter === "upcoming") {
        matchesFilter =
          !task.completed &&
          task.date &&
          task.date > getToday();
      }

      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      if (sort === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }

      if (sort === "alphabetical") {
        return a.name.localeCompare(b.name);
      }

      if (sort === "dueDate") {
        return (a.date || "9999-12-31").localeCompare(
          b.date || "9999-12-31"
        );
      }

      if (sort === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
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
        const safeName = escapeHTML(task.name);
        const safeCategory = escapeHTML(task.category || "Personal");
        const safeDate = escapeHTML(formatDate(task.date));
        const safeTime = escapeHTML(task.time || "");

        return `
          <article class="task-item ${task.completed ? "completed" : ""}"
                   data-task-id="${escapeHTML(task.id)}">

            <label class="task-checkbox">
              <input
                type="checkbox"
                data-action="toggle"
                data-id="${escapeHTML(task.id)}"
                ${task.completed ? "checked" : ""}
                aria-label="Mark ${safeName} as ${
                  task.completed ? "pending" : "completed"
                }"
              >
              <span class="custom-checkbox"></span>
            </label>

            <div class="task-details">
              <h3>${safeName}</h3>

              <div class="task-meta">
                <span class="task-category">${safeCategory}</span>
                <span class="task-date">${safeDate}</span>
                ${safeTime ? `<span class="task-time">${safeTime}</span>` : ""}
              </div>
            </div>

            <div class="task-actions">
              <button
                type="button"
                class="icon-button"
                data-action="edit"
                data-id="${escapeHTML(task.id)}"
                aria-label="Edit ${safeName}"
                title="Edit task"
              >
                <i data-lucide="pencil"></i>
              </button>

              <button
                type="button"
                class="icon-button delete-button"
                data-action="delete"
                data-id="${escapeHTML(task.id)}"
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
    const completed = tasks.filter(task => task.completed).length;
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

  elements.taskForm?.addEventListener("submit", event => {
    event.preventDefault();

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

    if (editingTaskId) {
      updateTask(editingTaskId, formData);
    } else {
      addTask(formData);
    }

    closeDialog();
  });

  /* -----------------------------------------
     TASK ACTION BUTTONS
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
     CROSS-TAB SYNCHRONIZATION
  ----------------------------------------- */

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      tasks = loadTasks();
      renderTasks();
    }
  });

  /* -----------------------------------------
     INITIALIZE
  ----------------------------------------- */

  renderTasks();

})();
