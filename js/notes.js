
/* =========================================
   LIFEOS — NOTES
   File: js/notes.js
   ========================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "lifeos_notes";

  const elements = {
    noteForm: document.getElementById("noteForm"),
    noteTitle: document.getElementById("noteTitle"),
    noteCategory: document.getElementById("noteCategory"),
    noteContent: document.getElementById("noteContent"),

    notesList: document.getElementById("notesList"),
    noteSearch: document.getElementById("noteSearch"),
    noteFilter: document.getElementById("noteFilter"),

    noteCount: document.getElementById("noteCount"),
    pinnedCount: document.getElementById("pinnedCount"),

    noteDialog: document.getElementById("noteDialog"),
    openNoteDialog: document.getElementById("openNoteDialog"),
    closeNoteDialog: document.getElementById("closeNoteDialog"),
    cancelNote: document.getElementById("cancelNote"),

    noteFeedback: document.getElementById("noteFeedback")
  };

  let notes = loadNotes();
  let editingNoteId = null;

  /* -----------------------------------------
     STORAGE
  ----------------------------------------- */

  function loadNotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error("Unable to load notes:", error);
      return [];
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      return true;
    } catch (error) {
      console.error("Unable to save notes:", error);
      showFeedback("Your note could not be saved. Check your browser storage.");
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

    return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  function formatDate(value) {
    if (!value) return "Recently updated";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Recently updated";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function showFeedback(message) {
    if (!elements.noteFeedback) return;

    elements.noteFeedback.textContent = message;
    elements.noteFeedback.hidden = false;

    clearTimeout(showFeedback.timeout);

    showFeedback.timeout = setTimeout(() => {
      elements.noteFeedback.hidden = true;
    }, 3500);
  }

  function openDialog() {
    if (!elements.noteDialog) return;

    if (typeof elements.noteDialog.showModal === "function") {
      elements.noteDialog.showModal();
    } else {
      elements.noteDialog.setAttribute("open", "");
    }
  }

  function closeDialog() {
    if (!elements.noteDialog) return;

    if (typeof elements.noteDialog.close === "function") {
      elements.noteDialog.close();
    } else {
      elements.noteDialog.removeAttribute("open");
    }

    resetForm();
  }

  function resetForm() {
    elements.noteForm?.reset();
    editingNoteId = null;

    const submitButton = elements.noteForm?.querySelector(
      '[type="submit"]'
    );

    if (submitButton) {
      submitButton.textContent = "Save Note";
    }

    const dialogTitle = elements.noteDialog?.querySelector(
      "[data-dialog-title]"
    );

    if (dialogTitle) {
      dialogTitle.textContent = "Create a Note";
    }
  }

  /* -----------------------------------------
     CREATE NOTE
  ----------------------------------------- */

  function createNote(formData) {
    const now = new Date().toISOString();

    const note = {
      id: createId(),
      title: formData.title,
      category: formData.category,
      content: formData.content,
      pinned: false,
      createdAt: now,
      updatedAt: now
    };

    notes.unshift(note);

    if (!saveNotes()) {
      notes.shift();
      return;
    }

    renderNotes();
    showFeedback("Note saved successfully.");
  }

  /* -----------------------------------------
     EDIT NOTE
  ----------------------------------------- */

  function editNote(noteId) {
    const note = notes.find(item => item.id === noteId);
    if (!note) return;

    editingNoteId = noteId;

    if (elements.noteTitle) {
      elements.noteTitle.value = note.title;
    }

    if (elements.noteCategory) {
      elements.noteCategory.value = note.category || "General";
    }

    if (elements.noteContent) {
      elements.noteContent.value = note.content;
    }

    const submitButton = elements.noteForm?.querySelector(
      '[type="submit"]'
    );

    if (submitButton) {
      submitButton.textContent = "Save Changes";
    }

    const dialogTitle = elements.noteDialog?.querySelector(
      "[data-dialog-title]"
    );

    if (dialogTitle) {
      dialogTitle.textContent = "Edit Note";
    }

    openDialog();
  }

  function updateNote(noteId, formData) {
    const index = notes.findIndex(item => item.id === noteId);
    if (index === -1) return;

    const previousNote = { ...notes[index] };

    notes[index] = {
      ...notes[index],
      title: formData.title,
      category: formData.category,
      content: formData.content,
      updatedAt: new Date().toISOString()
    };

    if (!saveNotes()) {
      notes[index] = previousNote;
      return;
    }

    renderNotes();
    showFeedback("Note updated successfully.");
  }

  /* -----------------------------------------
     PIN AND UNPIN
  ----------------------------------------- */

  function togglePin(noteId) {
    const note = notes.find(item => item.id === noteId);
    if (!note) return;

    const previousValue = note.pinned;

    note.pinned = !note.pinned;

    if (!saveNotes()) {
      note.pinned = previousValue;
      return;
    }

    renderNotes();

    showFeedback(
      note.pinned
        ? "Note pinned."
        : "Note unpinned."
    );
  }

  /* -----------------------------------------
     DELETE NOTE
  ----------------------------------------- */

  function deleteNote(noteId) {
    const index = notes.findIndex(item => item.id === noteId);
    if (index === -1) return;

    const deletedNote = notes[index];

    notes.splice(index, 1);

    if (!saveNotes()) {
      notes.splice(index, 0, deletedNote);
      return;
    }

    renderNotes();
    showFeedback("Note deleted.");
  }

  /* -----------------------------------------
     SEARCH AND FILTER
  ----------------------------------------- */

  function getVisibleNotes() {
    const searchTerm = elements.noteSearch?.value
      .trim()
      .toLowerCase() || "";

    const filter = elements.noteFilter?.value || "all";

    return notes
      .filter(note => {
        const matchesSearch =
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm) ||
          String(note.category || "").toLowerCase().includes(searchTerm);

        let matchesFilter = true;

        if (filter === "pinned") {
          matchesFilter = note.pinned;
        } else if (filter === "unpinned") {
          matchesFilter = !note.pinned;
        } else if (filter !== "all") {
          matchesFilter = note.category === filter;
        }

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return Number(b.pinned) - Number(a.pinned);
        }

        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
  }

  /* -----------------------------------------
     RENDER NOTES
  ----------------------------------------- */

  function renderNotes() {
    if (!elements.notesList) return;

    const visibleNotes = getVisibleNotes();

    if (visibleNotes.length === 0) {
      elements.notesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="notebook-pen"></i>
          </div>
          <h3>No notes found</h3>
          <p>Create a note or try a different search or filter.</p>
        </div>
      `;
    } else {
      elements.notesList.innerHTML = visibleNotes.map(note => {
        const safeId = escapeHTML(note.id);
        const safeTitle = escapeHTML(note.title);
        const safeCategory = escapeHTML(note.category || "General");
        const safeDate = escapeHTML(formatDate(note.updatedAt));

        const preview = escapeHTML(
          note.content.length > 240
            ? `${note.content.slice(0, 240)}…`
            : note.content
        );

        return `
          <article class="note-card ${note.pinned ? "pinned" : ""}"
                   data-note-id="${safeId}">

            <div class="note-card-header">
              <span class="note-category">${safeCategory}</span>

              <button
                type="button"
                class="icon-button ${note.pinned ? "active" : ""}"
                data-action="pin"
                data-id="${safeId}"
                aria-label="${note.pinned ? "Unpin" : "Pin"} ${safeTitle}"
                title="${note.pinned ? "Unpin note" : "Pin note"}"
                aria-pressed="${Boolean(note.pinned)}"
              >
                <i data-lucide="pin"></i>
              </button>
            </div>

            <h3>${safeTitle}</h3>

            <p class="note-preview">${preview}</p>

            <div class="note-card-footer">
              <span class="note-updated">${safeDate}</span>

              <div class="note-actions">
                <button
                  type="button"
                  class="icon-button"
                  data-action="edit"
                  data-id="${safeId}"
                  aria-label="Edit ${safeTitle}"
                  title="Edit note"
                >
                  <i data-lucide="pencil"></i>
                </button>

                <button
                  type="button"
                  class="icon-button delete-button"
                  data-action="delete"
                  data-id="${safeId}"
                  aria-label="Delete ${safeTitle}"
                  title="Delete note"
                >
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    if (elements.noteCount) {
      elements.noteCount.textContent = notes.length;
    }

    if (elements.pinnedCount) {
      elements.pinnedCount.textContent =
        notes.filter(note => note.pinned).length;
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /* -----------------------------------------
     FORM SUBMISSION
  ----------------------------------------- */

  elements.noteForm?.addEventListener("submit", event => {
    event.preventDefault();

    const title = elements.noteTitle?.value.trim();
    const content = elements.noteContent?.value.trim();

    if (!title) {
      showFeedback("Please enter a note title.");
      elements.noteTitle?.focus();
      return;
    }

    if (!content) {
      showFeedback("Please write something in your note.");
      elements.noteContent?.focus();
      return;
    }

    const formData = {
      title,
      category: elements.noteCategory?.value || "General",
      content
    };

    if (editingNoteId) {
      updateNote(editingNoteId, formData);
    } else {
      createNote(formData);
    }

    closeDialog();
  });

  /* -----------------------------------------
     BUTTON EVENTS
  ----------------------------------------- */

  elements.openNoteDialog?.addEventListener("click", () => {
    resetForm();
    openDialog();
  });

  elements.closeNoteDialog?.addEventListener("click", closeDialog);
  elements.cancelNote?.addEventListener("click", closeDialog);

  elements.notesList?.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const noteId = button.dataset.id;

    switch (button.dataset.action) {
      case "edit":
        editNote(noteId);
        break;

      case "delete":
        deleteNote(noteId);
        break;

      case "pin":
        togglePin(noteId);
        break;
    }
  });

  elements.noteSearch?.addEventListener("input", renderNotes);
  elements.noteFilter?.addEventListener("change", renderNotes);

  elements.noteDialog?.addEventListener("click", event => {
    if (event.target === elements.noteDialog) {
      closeDialog();
    }
  });

  /* -----------------------------------------
     CROSS-TAB SYNCHRONIZATION
  ----------------------------------------- */

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      notes = loadNotes();
      renderNotes();
    }
  });

  /* -----------------------------------------
     INITIALIZE
  ----------------------------------------- */

  renderNotes();

})();
