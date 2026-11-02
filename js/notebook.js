/* =========================================
   LIFEOS — MY LITTLE NOTEBOOK
   Uses the same storage as the Journal page
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {

  const STORAGE_KEY = "lifeos_reflections";

  // ELEMENTS
  const today = document.getElementById("notebookToday");
  const status = document.getElementById("notebookStatus");
  const entriesList = document.getElementById("notebookEntries");
  const memoryCount = document.getElementById("notebookMemoryCount");

  const search = document.getElementById("notebookSearch");

  const dateInput = document.getElementById("notebookDate");
  const moodInput = document.getElementById("notebookMood");
  const titleInput = document.getElementById("notebookTitle");
  const writingInput = document.getElementById("notebookWriting");

  const pageHeading = document.getElementById("notebookPageHeading");
  const wordCount = document.getElementById("notebookWordCount");
  const pageNumber = document.getElementById("notebookPageNumber");

  const newButton = document.getElementById("newNotebookEntry");
  const saveButton = document.getElementById("saveNotebookEntry");
  const favoriteButton = document.getElementById("notebookFavorite");

  const previousButton = document.getElementById("previousNotebookPage");
  const nextButton = document.getElementById("nextNotebookPage");

  const feedback = document.getElementById("notebookFeedback");

  // CHECK REQUIRED ELEMENTS
  const requiredElements = [
    today, status, entriesList, memoryCount,
    search, dateInput, moodInput, titleInput,
    writingInput, pageHeading, wordCount,
    pageNumber, newButton, saveButton,
    favoriteButton, previousButton, nextButton
  ];

  if (requiredElements.some(function (element) {
    return !element;
  })) {
    console.error("Notebook setup error: One or more HTML elements are missing.");
    return;
  }

  // DATA
  let entries = loadEntries();
  let currentEntryId = null;
  let currentFavorite = false;
  let visibleEntries = [];

  // DATE FUNCTIONS
  function getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  function formatDate(value) {
    if (!value) return "No date";

    const parts = value.split("-");

    if (parts.length !== 3) return value;

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatShortDate(value) {
    if (!value) return "No date";

    const parts = value.split("-");

    if (parts.length !== 3) return value;

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  // LOAD AND SAVE
  function loadEntries() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      return Array.isArray(saved) ? saved : [];

    } catch (error) {
      console.error("Unable to load journal entries:", error);
      return [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(entries)
      );

      return true;

    } catch (error) {
      console.error("Unable to save journal entries:", error);
      showFeedback("Unable to save. Please check your browser storage.");
      return false;
    }
  }

  // HELPERS
  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return replacements[character];
    });
  }

  function sortEntries(list) {
    return list.slice().sort(function (a, b) {
      const dateA = a.date || "";
      const dateB = b.date || "";

      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }

      return String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      );
    });
  }

  function showFeedback(message) {
    if (!feedback) return;

    feedback.textContent = message;
    feedback.hidden = false;

    window.clearTimeout(showFeedback.timer);

    showFeedback.timer = window.setTimeout(function () {
      feedback.hidden = true;
    }, 3500);
  }

  function updateStatus(message) {
    status.textContent = message;
  }

  function updateIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function countWords() {
    const text = writingInput.value.trim();
    const count = text ? text.split(/\s+/).length : 0;

    wordCount.textContent =
      count + (count === 1 ? " word" : " words");
  }

  // FAVORITE
  function updateFavoriteButton() {
    favoriteButton.classList.toggle(
      "is-active",
      currentFavorite
    );

    favoriteButton.setAttribute(
      "aria-pressed",
      String(currentFavorite)
    );

    favoriteButton.innerHTML = currentFavorite
      ? '<i data-lucide="bookmark-check"></i>'
      : '<i data-lucide="bookmark"></i>';

    favoriteButton.setAttribute(
      "aria-label",
      currentFavorite ? "Remove bookmark" : "Bookmark this entry"
    );

    updateIcons();
  }

  // PAGE LABEL
  function getPageLabel(entry) {
    const sorted = sortEntries(entries);

    const index = sorted.findIndex(function (item) {
      return String(item.id) === String(entry.id);
    });

    if (index === -1) return "SAVED PAGE";

    return "PAGE " + String(index + 1).padStart(2, "0");
  }

  // NAVIGATION
  function updateNavigation() {
    const index = visibleEntries.findIndex(function (entry) {
      return String(entry.id) === String(currentEntryId);
    });

    previousButton.disabled =
      index === -1 || index === visibleEntries.length - 1;

    nextButton.disabled =
      index === -1 || index === 0;
  }

  // RENDER ENTRIES
  function renderEntries() {
    const query = search.value.trim().toLowerCase();

    const sorted = sortEntries(entries);

    visibleEntries = sorted.filter(function (entry) {
      const searchable = [
        entry.title,
        entry.content,
        entry.mood,
        entry.date
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });

    memoryCount.textContent = String(entries.length).padStart(2, "0");

    if (visibleEntries.length === 0) {
      entriesList.innerHTML = `
        <div class="notebook-memory-empty">
          <i data-lucide="book-heart"></i>
          <strong>${query ? "No memories found" : "Your story starts here"}</strong>
          <p>${query
            ? "Try searching for something else."
            : "Your saved journal entries will appear here."}</p>
        </div>
      `;

      updateIcons();
      updateNavigation();
      return;
    }

    entriesList.innerHTML = visibleEntries.map(function (entry) {
      const active =
        String(entry.id) === String(currentEntryId);

      const preview = String(entry.content || "")
        .replace(/\s+/g, " ")
        .trim();

      return `
        <button
          type="button"
          class="notebook-memory-item ${active ? "active" : ""}"
          data-entry-id="${escapeHTML(entry.id)}"
          aria-pressed="${active}"
        >
          <span class="notebook-memory-date">
            ${escapeHTML(formatShortDate(entry.date))}
          </span>

          <span class="notebook-memory-title">
            ${escapeHTML(entry.title || "Untitled memory")}
            ${entry.favorite ? " ★" : ""}
          </span>

          <span class="notebook-memory-preview">
            ${escapeHTML(preview || "No written thoughts yet.")}
          </span>

          ${entry.mood
            ? `<span class="notebook-memory-mood">${escapeHTML(entry.mood)}</span>`
            : ""}
        </button>
      `;
    }).join("");

    updateIcons();
    updateNavigation();
  }

  // CLEAR EDITOR
  function clearEditor() {
    currentEntryId = null;
    currentFavorite = false;

    dateInput.value = getToday();
    moodInput.value = "";
    titleInput.value = "";
    writingInput.value = "";

    pageHeading.textContent = "Dear Diary,";
    pageNumber.textContent = "NEW PAGE";

    countWords();
    updateFavoriteButton();
    updateStatus("Ready for a new page");

    renderEntries();
  }

  // OPEN ENTRY
  function openEntry(entry) {
    currentEntryId = entry.id;
    currentFavorite = Boolean(entry.favorite);

    dateInput.value = entry.date || getToday();
    moodInput.value = entry.mood || "";
    titleInput.value = entry.title || "";
    writingInput.value = entry.content || "";

    pageHeading.textContent = entry.title || "Dear Diary,";

    pageNumber.textContent = getPageLabel(entry);

    countWords();
    updateFavoriteButton();
    updateStatus("Viewing a saved memory");

    renderEntries();
  }

  // CHECK UNSAVED CHANGES
  function hasUnsavedChanges() {
    if (currentEntryId === null) {
      return Boolean(
        titleInput.value.trim() ||
        writingInput.value.trim() ||
        moodInput.value
      );
    }

    const original = entries.find(function (entry) {
      return String(entry.id) === String(currentEntryId);
    });

    if (!original) return false;

    return (
      titleInput.value !== (original.title || "") ||
      dateInput.value !== (original.date || getToday()) ||
      moodInput.value !== (original.mood || "") ||
      writingInput.value !== (original.content || "") ||
      currentFavorite !== Boolean(original.favorite)
    );
  }

  function confirmDiscard() {
    if (!hasUnsavedChanges()) return true;

    return window.confirm(
      "You have unsaved changes. Leave this page without saving?"
    );
  }

  // NEW PAGE
  newButton.addEventListener("click", function () {
    if (!confirmDiscard()) return;

    clearEditor();
    titleInput.focus();

    showFeedback("A fresh page is ready!");
  });

  // SAVE PAGE
  saveButton.addEventListener("click", function () {
    const title = titleInput.value.trim();
    const content = writingInput.value.trim();
    const date = dateInput.value;

    if (!title) {
      showFeedback("Please give your page a title.");
      titleInput.focus();
      return;
    }

    if (!content) {
      showFeedback("Write something before saving.");
      writingInput.focus();
      return;
    }

    if (!date) {
      showFeedback("Please choose a date.");
      dateInput.focus();
      return;
    }

    const now = new Date().toISOString();

    if (currentEntryId !== null) {
      const index = entries.findIndex(function (entry) {
        return String(entry.id) === String(currentEntryId);
      });

      if (index !== -1) {
        entries[index] = {
          ...entries[index],
          title: title,
          date: date,
          mood: moodInput.value,
          content: content,
          favorite: currentFavorite,
          updatedAt: now
        };
      }

    } else {
      const newEntry = {
        id: "notebook-" + Date.now(),
        title: title,
        date: date,
        mood: moodInput.value,
        content: content,
        favorite: currentFavorite,
        createdAt: now,
        updatedAt: now
      };

      entries.push(newEntry);
      currentEntryId = newEntry.id;
    }

    if (!saveEntries()) return;

    const savedEntry = entries.find(function (entry) {
      return String(entry.id) === String(currentEntryId);
    });

    if (savedEntry) {
      pageHeading.textContent = savedEntry.title;
      pageNumber.textContent = getPageLabel(savedEntry);
    }

    updateStatus("Saved just now");
    renderEntries();

    showFeedback("Your page has been saved to your Journal!");
  });

  // BOOKMARK
  favoriteButton.addEventListener("click", function () {
    currentFavorite = !currentFavorite;

    updateFavoriteButton();

    updateStatus(
      currentEntryId === null
        ? "Bookmark ready for your new page"
        : "Bookmark change not saved yet"
    );
  });

  // SELECT A SAVED ENTRY
  entriesList.addEventListener("click", function (event) {
    const button = event.target.closest("[data-entry-id]");

    if (!button) return;

    if (!confirmDiscard()) return;

    const selected = entries.find(function (entry) {
      return String(entry.id) === button.dataset.entryId;
    });

    if (selected) {
      openEntry(selected);
    }
  });

  // SEARCH
  search.addEventListener("input", function () {
    renderEntries();
  });

  // PREVIOUS PAGE
  previousButton.addEventListener("click", function () {
    if (!confirmDiscard()) return;

    const index = visibleEntries.findIndex(function (entry) {
      return String(entry.id) === String(currentEntryId);
    });

    if (index < 0 || index >= visibleEntries.length - 1) return;

    openEntry(visibleEntries[index + 1]);
  });

  // NEXT PAGE
  nextButton.addEventListener("click", function () {
    if (!confirmDiscard()) return;

    const index = visibleEntries.findIndex(function (entry) {
      return String(entry.id) === String(currentEntryId);
    });

    if (index <= 0) return;

    openEntry(visibleEntries[index - 1]);
  });

  // LIVE WORD COUNT
  writingInput.addEventListener("input", countWords);

  // UPDATE PAGE HEADING WHILE WRITING
  titleInput.addEventListener("input", function () {
    pageHeading.textContent =
      titleInput.value.trim() || "Dear Diary,";
  });

  // UNSAVED STATUS
  [dateInput, moodInput, titleInput, writingInput].forEach(
    function (input) {
      input.addEventListener("change", function () {
        updateStatus("Unsaved changes");
      });
    }
  );

  // UPDATE WHEN JOURNAL CHANGES IN ANOTHER TAB
  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) return;

    entries = loadEntries();

    if (currentEntryId !== null) {
      const updated = entries.find(function (entry) {
        return String(entry.id) === String(currentEntryId);
      });

      if (updated) {
        openEntry(updated);
      } else {
        clearEditor();
      }
    } else {
      renderEntries();
    }
  });

  // INITIALIZE
  today.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  dateInput.value = getToday();

  countWords();
  updateFavoriteButton();
  renderEntries();
});
