
/* =========================================
   LIFEOS — JOURNAL
   File: js/journal.js
   ========================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "lifeos_reflections";

  const elements = {
    journalForm: document.getElementById("journalForm"),
    journalTitle: document.getElementById("journalTitle"),
    journalDate: document.getElementById("journalDate"),
    journalMood: document.getElementById("journalMood"),
    journalContent: document.getElementById("journalContent"),

    journalList: document.getElementById("journalList"),
    journalSearch: document.getElementById("journalSearch"),
    journalFilter: document.getElementById("journalFilter"),

    journalCount: document.getElementById("journalCount"),
    journalDialog: document.getElementById("journalDialog"),
    openJournalDialog: document.getElementById("openJournalDialog"),
    closeJournalDialog: document.getElementById("closeJournalDialog"),
    cancelJournal: document.getElementById("cancelJournal"),

    journalFeedback: document.getElementById("journalFeedback")
  };

  let entries = loadEntries();
  let editingEntryId = null;

  /* -----------------------------------------
     STORAGE
  ----------------------------------------- */

  function loadEntries() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error("Unable to load journal entries:", error);
      return [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      console.error("Unable to save journal entries:", error);
      showFeedback("Your entry could not be saved. Check your browser storage.");
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

    return `journal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatDate(dateString) {
    if (!dateString) return "Date not set";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "Date not set";
    }

    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function showFeedback(message) {
    if (!elements.journalFeedback) return;

    elements.journalFeedback.textContent = message;
    elements.journalFeedback.hidden = false;

    clearTimeout(showFeedback.timeout);

    showFeedback.timeout = setTimeout(() => {
      elements.journalFeedback.hidden = true;
    }, 3500);
  }

  function openDialog() {
    if (!elements.journalDialog) return;

    if (typeof elements.journalDialog.showModal === "function") {
      elements.journalDialog.showModal();
    } else {
      elements.journalDialog.setAttribute("open", "");
    }
  }

  function closeDialog() {
    if (!elements.journalDialog) return;

    if (typeof elements.journalDialog.close === "function") {
      elements.journalDialog.close();
    } else {
      elements.journalDialog.removeAttribute("open");
    }

    resetForm();
  }

  function resetForm() {
    elements.journalForm?.reset();
    editingEntryId = null;

    if (elements.journalDate) {
      elements.journalDate.value = getToday();
    }

    const submitButton = elements.journalForm?.querySelector(
      '[type="submit"]'
    );

    if (submitButton) {
      submitButton.textContent = "Save Entry";
    }

    const dialogTitle = elements.journalDialog?.querySelector(
      "[data-dialog-title]"
    );

    if (dialogTitle) {
      dialogTitle.textContent = "New Journal Entry";
    }
  }

  /* -----------------------------------------
     CREATE ENTRY
  ----------------------------------------- */

  function createEntry(formData) {
    const entry = {
      id: createId(),
      title: formData.title,
      date: formData.date,
      mood: formData.mood,
      content: formData.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    entries.unshift(entry);

    if (!saveEntries()) {
      entries.shift();
      return;
    }

    renderEntries();
    showFeedback("Your journal entry has been saved.");
  }

  /* -----------------------------------------
     EDIT ENTRY
  ----------------------------------------- */

  function editEntry(entryId) {
    const entry = entries.find(item => item.id === entryId);
    if (!entry) return;

    editingEntryId = entryId;

    if (elements.journalTitle) {
      elements.journalTitle.value = entry.title;
    }

    if (elements.journalDate) {
      elements.journalDate.value = entry.date;
    }

    if (elements.journalMood) {
      elements.journalMood.value = entry.mood || "";
    }

    if (elements.journalContent) {
      elements.journalContent.value = entry.content;
    }

    const submitButton = elements.journalForm?.querySelector(
      '[type="submit"]'
    );

    if (submitButton) {
      submitButton.textContent = "Save Changes";
    }

    const dialogTitle = elements.journalDialog?.querySelector(
      "[data-dialog-title]"
    );

    if (dialogTitle) {
      dialogTitle.textContent = "Edit Journal Entry";
    }

    openDialog();
  }

  function updateEntry(entryId, formData) {
    const index = entries.findIndex(item => item.id === entryId);
    if (index === -1) return;

    const previousEntry = { ...entries[index] };

    entries[index] = {
      ...entries[index],
      title: formData.title,
      date: formData.date,
      mood: formData.mood,
      content: formData.content,
      updatedAt: new Date().toISOString()
    };

    if (!saveEntries()) {
      entries[index] = previousEntry;
      return;
    }

    renderEntries();
    showFeedback("Your journal entry has been updated.");
  }

  /* -----------------------------------------
     DELETE ENTRY
  ----------------------------------------- */

  function deleteEntry(entryId) {
    const index = entries.findIndex(item => item.id === entryId);
    if (index === -1) return;

    const deletedEntry = entries[index];

    entries.splice(index, 1);

    if (!saveEntries()) {
      entries.splice(index, 0, deletedEntry);
      return;
    }

    renderEntries();
    showFeedback("Journal entry deleted.");
  }

  /* -----------------------------------------
     FILTERING AND SEARCH
  ----------------------------------------- */

  function getVisibleEntries() {
    const searchTerm = elements.journalSearch?.value
      .trim()
      .toLowerCase() || "";

    const filter = elements.journalFilter?.value || "all";

    return entries
      .filter(entry => {
        const matchesSearch =
          entry.title.toLowerCase().includes(searchTerm) ||
          entry.content.toLowerCase().includes(searchTerm) ||
          String(entry.mood || "").toLowerCase().includes(searchTerm);

        const matchesFilter =
          filter === "all" ||
          (filter === "today" && entry.date === getToday()) ||
          (filter === "thisMonth" &&
            entry.date?.slice(0, 7) === getToday().slice(0, 7)) ||
          (filter === "withMood" && Boolean(entry.mood));

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const dateComparison = (b.date || "").localeCompare(a.date || "");

        if (dateComparison !== 0) return dateComparison;

        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
  }

  /* -----------------------------------------
     DISPLAY ENTRIES
  ----------------------------------------- */

  function renderEntries() {
    if (!elements.journalList) return;

    const visibleEntries = getVisibleEntries();

    if (visibleEntries.length === 0) {
      elements.journalList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="book-heart"></i>
          </div>
          <h3>No journal entries yet</h3>
          <p>Make space for your thoughts. Your first entry can start here.</p>
        </div>
      `;
    } else {
      elements.journalList.innerHTML = visibleEntries.map(entry => {
        const safeId = escapeHTML(entry.id);
        const safeTitle = escapeHTML(entry.title);
        const safeDate = escapeHTML(formatDate(entry.date));
        const safeMood = escapeHTML(entry.mood || "No mood selected");

        const preview = escapeHTML(
          entry.content.length > 220
            ? `${entry.content.slice(0, 220)}…`
            : entry.content
        );

        return `
          <article class="journal-entry" data-entry-id="${safeId}">
            <div class="journal-entry-header">
              <div>
                <span class="journal-entry-date">${safeDate}</span>
                <h3>${safeTitle}</h3>
              </div>

              <div class="journal-entry-actions">
                <button
                  type="button"
                  class="icon-button"
                  data-action="edit"
                  data-id="${safeId}"
                  aria-label="Edit ${safeTitle}"
                  title="Edit entry"
                >
                  <i data-lucide="pencil"></i>
                </button>

                <button
                  type="button"
                  class="icon-button delete-button"
                  data-action="delete"
                  data-id="${safeId}"
                  aria-label="Delete ${safeTitle}"
                  title="Delete entry"
                >
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>

            <span class="journal-mood">
              <i data-lucide="heart"></i>
              ${safeMood}
            </span>

            <p class="journal-entry-preview">${preview}</p>
          </article>
        `;
      }).join("");
    }

    if (elements.journalCount) {
      elements.journalCount.textContent = entries.length;
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /* -----------------------------------------
     FORM SUBMISSION
  ----------------------------------------- */

  elements.journalForm?.addEventListener("submit", event => {
    event.preventDefault();

    const title = elements.journalTitle?.value.trim();
    const date = elements.journalDate?.value || getToday();
    const content = elements.journalContent?.value.trim();

    if (!title) {
      showFeedback("Please add a title to your entry.");
      elements.journalTitle?.focus();
      return;
    }

    if (!content) {
      showFeedback("Please write something before saving.");
      elements.journalContent?.focus();
      return;
    }

    const formData = {
      title,
      date,
      mood: elements.journalMood?.value || "",
      content
    };

    if (editingEntryId) {
      updateEntry(editingEntryId, formData);
    } else {
      createEntry(formData);
    }

    closeDialog();
  });

  /* -----------------------------------------
     BUTTON EVENTS
  ----------------------------------------- */

  elements.openJournalDialog?.addEventListener("click", () => {
    resetForm();
    openDialog();
  });

  elements.closeJournalDialog?.addEventListener("click", closeDialog);
  elements.cancelJournal?.addEventListener("click", closeDialog);

  elements.journalList?.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const entryId = button.dataset.id;

    if (button.dataset.action === "edit") {
      editEntry(entryId);
    }

    if (button.dataset.action === "delete") {
      deleteEntry(entryId);
    }
  });

  elements.journalSearch?.addEventListener("input", renderEntries);
  elements.journalFilter?.addEventListener("change", renderEntries);

  elements.journalDialog?.addEventListener("click", event => {
    if (event.target === elements.journalDialog) {
      closeDialog();
    }
  });

  /* -----------------------------------------
     CROSS-TAB SYNCHRONIZATION
  ----------------------------------------- */

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      entries = loadEntries();
      renderEntries();
    }
  });

  /* -----------------------------------------
     INITIALIZE
  ----------------------------------------- */

  if (elements.journalDate && !elements.journalDate.value) {
    elements.journalDate.value = getToday();
  }

  renderEntries();

})();
