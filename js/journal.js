
/* =========================================
   LIFEOS — JOURNAL
   File: js/journal.js
   Supabase account-specific storage
========================================= */

import { supabase } from "./supabase.js";

(async () => {
  "use strict";

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

  let currentUser = null;
  let entries = [];
  let editingEntryId = null;
  let isSaving = false;

  /* -----------------------------------------
     AUTHENTICATION
  ----------------------------------------- */

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData?.user) {
    window.location.replace("../login.html");
    return;
  }

  currentUser = authData.user;

  /* -----------------------------------------
     HELPERS
  ----------------------------------------- */

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
      if (!elements.journalDialog.open) {
        elements.journalDialog.showModal();
      }
    } else {
      elements.journalDialog.setAttribute("open", "");
    }
  }

  function closeDialog() {
    if (!elements.journalDialog) return;

    if (typeof elements.journalDialog.close === "function") {
      if (elements.journalDialog.open) {
        elements.journalDialog.close();
      }
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

  function setSavingState(saving) {
    isSaving = saving;

    const submitButton = elements.journalForm?.querySelector(
      '[type="submit"]'
    );

    if (!submitButton) return;

    submitButton.disabled = saving;

    if (saving) {
      submitButton.textContent = "Saving...";
    } else {
      submitButton.textContent = editingEntryId
        ? "Save Changes"
        : "Save Entry";
    }
  }

  function mapDatabaseEntry(row) {
    return {
      id: row.id,
      title: row.title || "",
      date: row.entry_date || "",
      mood: row.mood || "",
      content: row.content || "",
      favorite: Boolean(row.favorite),
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  /* -----------------------------------------
     LOAD ENTRIES FROM SUPABASE
  ----------------------------------------- */

  async function loadEntries() {
    if (!elements.journalList) return;

    elements.journalList.innerHTML = `
      <div class="empty-state">
        <p>Loading your journal entries...</p>
      </div>
    `;

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("entry_date", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Unable to load journal entries:", error);
      entries = [];
      renderEntries();
      showFeedback("Unable to load your journal entries. Please try again.");
      return;
    }

    entries = (data || []).map(mapDatabaseEntry);

    renderEntries();
  }

  /* -----------------------------------------
     CREATE ENTRY
  ----------------------------------------- */

  async function createEntry(formData) {
    const now = new Date().toISOString();

    const newEntry = {
      user_id: currentUser.id,
      title: formData.title,
      content: formData.content,
      mood: formData.mood || null,
      entry_date: formData.date,
      favorite: false,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from("journal_entries")
      .insert(newEntry)
      .select("*")
      .single();

    if (error) {
      console.error("Unable to save journal entry:", error);
      showFeedback("Your entry could not be saved. Please try again.");
      return false;
    }

    entries.unshift(mapDatabaseEntry(data));

    renderEntries();
    showFeedback("Your journal entry has been saved.");

    return true;
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

  async function updateEntry(entryId, formData) {
    const { data, error } = await supabase
      .from("journal_entries")
      .update({
        title: formData.title,
        content: formData.content,
        mood: formData.mood || null,
        entry_date: formData.date,
        updated_at: new Date().toISOString()
      })
      .eq("id", entryId)
      .eq("user_id", currentUser.id)
      .select("*")
      .single();

    if (error) {
      console.error("Unable to update journal entry:", error);
      showFeedback("Your entry could not be updated. Please try again.");
      return false;
    }

    const index = entries.findIndex(item => item.id === entryId);

    if (index !== -1) {
      entries[index] = mapDatabaseEntry(data);
    }

    renderEntries();
    showFeedback("Your journal entry has been updated.");

    return true;
  }

  /* -----------------------------------------
     DELETE ENTRY
  ----------------------------------------- */

  async function deleteEntry(entryId) {
    const entry = entries.find(item => item.id === entryId);
    if (!entry) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this journal entry?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Unable to delete journal entry:", error);
      showFeedback("The entry could not be deleted. Please try again.");
      return;
    }

    entries = entries.filter(item => item.id !== entryId);

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
        const title = String(entry.title || "").toLowerCase();
        const content = String(entry.content || "").toLowerCase();
        const mood = String(entry.mood || "").toLowerCase();

        const matchesSearch =
          title.includes(searchTerm) ||
          content.includes(searchTerm) ||
          mood.includes(searchTerm);

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

        const content = String(entry.content || "");

        const preview = escapeHTML(
          content.length > 220
            ? `${content.slice(0, 220)}…`
            : content
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

  elements.journalForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (isSaving) return;

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

    setSavingState(true);

    let success = false;

    try {
      if (editingEntryId) {
        success = await updateEntry(editingEntryId, formData);
      } else {
        success = await createEntry(formData);
      }
    } catch (error) {
      console.error("Journal save error:", error);
      showFeedback("Something went wrong while saving your entry.");
    } finally {
      setSavingState(false);
    }

    if (success) {
      closeDialog();
    }
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
     INITIALIZE
  ----------------------------------------- */

  if (elements.journalDate && !elements.journalDate.value) {
    elements.journalDate.value = getToday();
  }

  await loadEntries();

})();
