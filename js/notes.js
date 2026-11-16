
/* =========================================
   LIFEOS — NOTES (SUPABASE VERSION)
   File: js/notes.js
========================================= */

import { supabase } from "./supabase.js";

(() => {
  "use strict";

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

  let notes = [];
  let currentUser = null;
  let editingNoteId = null;
  let isSaving = false;

  /* -----------------------------------------
     HELPERS
  ----------------------------------------- */

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

  function showDatabaseError(action, error) {
    console.error(`LIFEOS Notes: ${action} failed:`, error);

    showFeedback(
      error?.message
        ? `${action} failed: ${error.message}`
        : `${action} failed. Please try again.`
    );
  }

  function mapNote(row) {
    return {
      id: row.id,
      title: row.title || "",
      category: row.category || "General",
      content: row.content || "",
      pinned: Boolean(row.pinned),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function setSubmitButton(disabled, label) {
    const button = elements.noteForm?.querySelector('[type="submit"]');

    if (!button) return;

    button.disabled = disabled;
    button.textContent = label;
  }

  /* -----------------------------------------
     DIALOG
  ----------------------------------------- */

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
    isSaving = false;

    setSubmitButton(false, "Save note");

    const dialogTitle = elements.noteDialog?.querySelector(
      "[data-dialog-title]"
    );

    if (dialogTitle) {
      dialogTitle.textContent = "New note";
    }
  }

  /* -----------------------------------------
     LOAD NOTES FROM SUPABASE
  ----------------------------------------- */

  async function loadNotes() {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("note_type", "regular")
      .order("created_at", { ascending: false });

    if (error) {
      showDatabaseError("Loading notes", error);
      return;
    }

    notes = (data || []).map(mapNote);

    renderNotes();
  }

  /* -----------------------------------------
     CREATE NOTE
  ----------------------------------------- */

  async function createNote(formData) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: currentUser.id,
        subject_id: null,
        note_type: "regular",
        title: formData.title,
        content: formData.content,
        category: formData.category,
        pinned: false,
        created_at: now,
        updated_at: now
      })
      .select("*")
      .single();

    if (error) {
      showDatabaseError("Saving note", error);
      return false;
    }

    notes.unshift(mapNote(data));

    renderNotes();
    showFeedback("Note saved successfully.");

    return true;
  }

  /* -----------------------------------------
     EDIT NOTE
  ----------------------------------------- */

  function editNote(noteId) {
    const note = notes.find(item => item.id === noteId);
    if (!note) return;

    editingNoteId = noteId;

    elements.noteTitle.value = note.title;
    elements.noteCategory.value = note.category || "General";
    elements.noteContent.value = note.content;

    setSubmitButton(false, "Save changes");

    const dialogTitle = elements.noteDialog?.querySelector(
      "[data-dialog-title]"
    );

    if (dialogTitle) {
      dialogTitle.textContent = "Edit note";
    }

    openDialog();
  }

  async function updateNote(noteId, formData) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("notes")
      .update({
        title: formData.title,
        category: formData.category,
        content: formData.content,
        updated_at: now
      })
      .eq("id", noteId)
      .eq("user_id", currentUser.id)
      .eq("note_type", "regular")
      .select("*")
      .single();

    if (error) {
      showDatabaseError("Updating note", error);
      return false;
    }

    const index = notes.findIndex(item => item.id === noteId);

    if (index !== -1) {
      notes[index] = mapNote(data);
    }

    renderNotes();
    showFeedback("Note updated successfully.");

    return true;
  }

  /* -----------------------------------------
     PIN AND UNPIN
  ----------------------------------------- */

  async function togglePin(noteId) {
    const note = notes.find(item => item.id === noteId);
    if (!note) return;

    const newPinnedValue = !note.pinned;

    const { data, error } = await supabase
      .from("notes")
      .update({
        pinned: newPinnedValue,
        updated_at: new Date().toISOString()
      })
      .eq("id", noteId)
      .eq("user_id", currentUser.id)
      .eq("note_type", "regular")
      .select("*")
      .single();

    if (error) {
      showDatabaseError("Updating pinned note", error);
      return;
    }

    const index = notes.findIndex(item => item.id === noteId);

    if (index !== -1) {
      notes[index] = mapNote(data);
    }

    renderNotes();

    showFeedback(
      newPinnedValue ? "Note pinned." : "Note unpinned."
    );
  }

  /* -----------------------------------------
     DELETE NOTE
  ----------------------------------------- */

  async function deleteNote(noteId) {
    const note = notes.find(item => item.id === noteId);
    if (!note) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${note.title}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", currentUser.id)
      .eq("note_type", "regular");

    if (error) {
      showDatabaseError("Deleting note", error);
      return;
    }

    notes = notes.filter(item => item.id !== noteId);

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
        const title = String(note.title || "").toLowerCase();
        const content = String(note.content || "").toLowerCase();
        const category = String(note.category || "").toLowerCase();

        const matchesSearch =
          title.includes(searchTerm) ||
          content.includes(searchTerm) ||
          category.includes(searchTerm);

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

        const content = String(note.content || "");

        const preview = escapeHTML(
          content.length > 240
            ? `${content.slice(0, 240)}…`
            : content
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

  elements.noteForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (isSaving) return;

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

    if (!currentUser) {
      showFeedback("Your session has expired. Please sign in again.");
      return;
    }

    const formData = {
      title,
      category: elements.noteCategory?.value || "General",
      content
    };

    isSaving = true;
    setSubmitButton(true, "Saving...");

    try {
      const success = editingNoteId
        ? await updateNote(editingNoteId, formData)
        : await createNote(formData);

      if (success) {
        closeDialog();
      }
    } catch (error) {
      showDatabaseError("Saving note", error);
    } finally {
      isSaving = false;

      if (elements.noteDialog?.open) {
        setSubmitButton(
          false,
          editingNoteId ? "Save changes" : "Save note"
        );
      }
    }
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

  elements.notesList?.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const noteId = button.dataset.id;
    if (!noteId) return;

    button.disabled = true;

    try {
      switch (button.dataset.action) {
        case "edit":
          editNote(noteId);
          break;

        case "delete":
          await deleteNote(noteId);
          break;

        case "pin":
          await togglePin(noteId);
          break;
      }
    } catch (error) {
      showDatabaseError("Performing note action", error);
    } finally {
      if (button.isConnected) {
        button.disabled = false;
      }
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
     INITIALIZE
  ----------------------------------------- */

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

      await loadNotes();
    } catch (error) {
      showDatabaseError("Initializing Notes", error);
    }
  }

  initialize();

})();
