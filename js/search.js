/* =========================================
   LIFEOS — GLOBAL SEARCH
   File: js/search.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const searchInput = document.getElementById("searchInput");

    if (!searchInput) return;

    const STORAGE = {
        tasks: "lifeos_tasks",
        events: "lifeos_calendar_events",
        notes: "lifeos_notes",
        journal: "lifeos_reflections",
        verses: "lifeos_verse_history"
    };

    function readStorage(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`LIFEOS search could not read ${key}:`, error);
            return [];
        }
    }

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, " ");
    }

    function encode(value) {
        return encodeURIComponent(String(value ?? ""));
    }

    function makeResult(type, title, description, url, icon, searchable = "") {
        return {
            type,
            title: title || "Untitled",
            description,
            url,
            icon,
            searchable: normalize(
                `${title} ${description} ${searchable} ${type}`
            )
        };
    }

    /* ---------- SEARCH DESTINATIONS ---------- */

    function getAllResults() {
        const results = [];

        const tasks = readStorage(STORAGE.tasks);
        const events = readStorage(STORAGE.events);
        const notes = readStorage(STORAGE.notes);
        const journal = readStorage(STORAGE.journal);
        const verses = readStorage(STORAGE.verses);

        // TASKS
        results.push(
            makeResult(
                "Tasks",
                "All Tasks",
                "View every task",
                "pages/tasks.html?filter=all",
                "list-checks",
                "my tasks all task"
            ),
            makeResult(
                "Tasks",
                "Pending Tasks",
                "View unfinished tasks",
                "pages/tasks.html?filter=pending",
                "clock",
                "incomplete unfinished"
            ),
            makeResult(
                "Tasks",
                "Completed Tasks",
                "View finished tasks",
                "pages/tasks.html?filter=completed",
                "check-circle",
                "done finished"
            )
        );

        tasks.forEach(task => {
            results.push(makeResult(
                "Task",
                task.name || "Untitled task",
                [
                    task.completed ? "Completed" : "Pending",
                    task.date || ""
                ].filter(Boolean).join(" · "),
                `pages/tasks.html?task=${encode(task.id ?? "")}`,
                "list-checks",
                `${task.category || ""} ${task.time || ""}`
            ));
        });

        // CALENDAR
        results.push(makeResult(
            "Calendar",
            "Open Calendar",
            "View your schedule",
            "pages/calendar.html",
            "calendar-days",
            "calendar schedule events"
        ));

        events.forEach(event => {
            results.push(makeResult(
                "Event",
                event.title || "Untitled event",
                [event.date || "", event.time || ""]
                    .filter(Boolean).join(" · "),
                `pages/calendar.html?date=${encode(event.date || "")}&event=${encode(event.id ?? "")}`,
                "calendar-days",
                event.description || ""
            ));
        });

        // NOTES
        results.push(makeResult(
            "Notes",
            "All Notes",
            "View all your saved notes",
            "pages/notes.html?filter=all",
            "notebook-pen",
            "my notes"
        ));

        notes.forEach(note => {
            results.push(makeResult(
                "Note",
                note.title || "Untitled note",
                note.category || "Saved note",
                `pages/notes.html?note=${encode(note.id ?? "")}`,
                "notebook-pen",
                note.content || ""
            ));
        });

        // JOURNAL
        results.push(makeResult(
            "Journal",
            "Open Journal",
            "View your reflections",
            "pages/journal.html",
            "book-heart",
            "mood journal reflections"
        ));

        journal.forEach(entry => {
            results.push(makeResult(
                "Journal Entry",
                entry.title || "Journal entry",
                [entry.date || "", entry.mood || ""]
                    .filter(Boolean).join(" · "),
                `pages/journal.html?entry=${encode(entry.id ?? "")}`,
                "book-heart",
                entry.content || ""
            ));
        });

        // MY LITTLE NOTEBOOK
        results.push(makeResult(
            "Notebook",
            "My Little Notebook",
            "Open your personal writing space",
            "pages/notebook.html",
            "book-open",
            "notebook my notebook writing memories diary personal writing pages little notebook"
        ));

        // BIBLE VERSES
        results.push(
            makeResult(
                "Bible Verses",
                "Verse History",
                "Browse your daily Bible verses",
                "pages/verses.html",
                "book-open",
                "bible verse verses scripture daily devotion god saved bookmark"
            ),
            makeResult(
                "Daily Verse",
                "Today's Bible Verse",
                "Read your daily reminder",
                "pages/verses.html",
                "book-heart",
                "today daily bible scripture"
            )
        );

        verses.forEach(verse => {
            results.push(makeResult(
                verse.favorite ? "Saved Verse" : "Bible Verse",
                verse.reference || "Bible verse",
                `${verse.date || ""}${verse.favorite ? " · Bookmarked" : ""}`,
                `pages/verses.html?date=${encode(verse.date || "")}`,
                "book-open",
                `${verse.text || ""} ${verse.reference || ""} ${verse.date || ""} ${verse.favorite ? "saved favorite bookmarked" : ""}`
            ));
        });

        // OTHER LIFEOS PAGES
        results.push(
            makeResult(
                "Focus",
                "Focus Room",
                "Open your focus timer",
                "pages/focus.html",
                "timer",
                "focus timer session"
            ),
            makeResult(
                "Progress",
                "My Progress",
                "View your activity and achievements",
                "pages/progress.html",
                "chart-no-axes-combined",
                "statistics achievements"
            ),
            makeResult(
                "Settings",
                "Settings",
                "Manage your LIFEOS preferences",
                "pages/settings.html",
                "settings",
                "preferences"
            )
        );

        return results;
    }

    /* ---------- SEARCH DROPDOWN ---------- */

    const style = document.createElement("style");

    style.textContent = `
        .lifeos-search-results {
            position: absolute;
            top: calc(100% + 12px);
            left: 0;
            right: 0;
            z-index: 2000;
            max-height: 380px;
            overflow-y: auto;
            padding: 8px;
            background: #fff;
            border: 1px solid rgba(97, 124, 98, .16);
            border-radius: 16px;
            box-shadow: 0 14px 38px rgba(40, 60, 45, .14);
        }

        .search-container {
            position: relative;
        }

        .lifeos-search-heading {
            padding: 9px 11px 7px;
            color: #849084;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.1px;
            text-transform: uppercase;
        }

        .lifeos-search-result {
            display: flex;
            align-items: center;
            gap: 11px;
            width: 100%;
            padding: 11px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: #344238;
            text-align: left;
            cursor: pointer;
            font: inherit;
        }

        .lifeos-search-result:hover,
        .lifeos-search-result:focus-visible,
        .lifeos-search-result[aria-selected="true"] {
            background: #f1f5ef;
            outline: none;
        }

        .lifeos-search-icon {
            display: grid;
            place-items: center;
            flex: 0 0 34px;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: #edf3eb;
            color: #668069;
        }

        .lifeos-search-icon svg {
            width: 17px;
            height: 17px;
        }

        .lifeos-search-copy {
            display: flex;
            flex: 1;
            flex-direction: column;
            min-width: 0;
            gap: 3px;
        }

        .lifeos-search-title {
            overflow: hidden;
            font-size: 13px;
            font-weight: 600;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .lifeos-search-description {
            overflow: hidden;
            color: #89938a;
            font-size: 11px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .lifeos-search-type {
            flex: 0 0 auto;
            color: #879487;
            font-size: 10px;
        }

        .lifeos-search-empty {
            padding: 20px 12px;
            color: #879187;
            font-size: 13px;
            text-align: center;
        }

        @media (max-width: 600px) {
            .lifeos-search-results {
                position: fixed;
                top: 76px;
                left: 16px;
                right: 16px;
                max-height: 60vh;
            }
        }
    `;

    document.head.appendChild(style);

    const searchContainer = searchInput.closest(".search-container");

    if (!searchContainer) return;

    const dropdown = document.createElement("div");
    dropdown.className = "lifeos-search-results";
    dropdown.hidden = true;
    dropdown.setAttribute("role", "listbox");
    dropdown.setAttribute("aria-label", "Search results");
    dropdown.id = "lifeosSearchResults";

    searchContainer.appendChild(dropdown);

    let activeIndex = -1;
    let visibleResults = [];

    function renderResults(query) {
        dropdown.replaceChildren();
        activeIndex = -1;

        if (!query.trim()) {
            dropdown.hidden = true;
            visibleResults = [];
            return;
        }

        const normalizedQuery = normalize(query);
        const allResults = getAllResults();

        visibleResults = allResults
            .map(result => {
                const title = normalize(result.title);
                const searchable = result.searchable;
                let score = 0;

                if (title === normalizedQuery) {
                    score = 100;
                } else if (title.startsWith(normalizedQuery)) {
                    score = 70;
                } else if (searchable.includes(normalizedQuery)) {
                    score = 40;
                } else {
                    const words = normalizedQuery.split(" ");

                    if (words.every(word => searchable.includes(word))) {
                        score = 20;
                    }
                }

                return { ...result, score };
            })
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);

        dropdown.hidden = false;

        if (visibleResults.length === 0) {
            const empty = document.createElement("div");
            empty.className = "lifeos-search-empty";
            empty.textContent = "No matching results found.";
            dropdown.appendChild(empty);
            return;
        }

        const heading = document.createElement("div");
        heading.className = "lifeos-search-heading";
        heading.textContent = "SEARCH RESULTS";
        dropdown.appendChild(heading);

        visibleResults.forEach(result => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "lifeos-search-result";
            button.setAttribute("role", "option");
            button.setAttribute("aria-selected", "false");

            const iconWrap = document.createElement("span");
            iconWrap.className = "lifeos-search-icon";

            const icon = document.createElement("i");
            icon.setAttribute("data-lucide", result.icon);
            iconWrap.appendChild(icon);

            const copy = document.createElement("span");
            copy.className = "lifeos-search-copy";

            const title = document.createElement("span");
            title.className = "lifeos-search-title";
            title.textContent = result.title;

            const description = document.createElement("span");
            description.className = "lifeos-search-description";
            description.textContent = result.description;

            copy.append(title, description);

            const type = document.createElement("span");
            type.className = "lifeos-search-type";
            type.textContent = result.type;

            button.append(iconWrap, copy, type);

            button.addEventListener("click", () => {
                window.location.href = result.url;
            });

            dropdown.appendChild(button);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function selectResult(index) {
        const buttons = dropdown.querySelectorAll(".lifeos-search-result");

        buttons.forEach((button, buttonIndex) => {
            const isActive = buttonIndex === index;

            button.setAttribute("aria-selected", String(isActive));

            if (isActive) {
                button.scrollIntoView({ block: "nearest" });
            }
        });

        activeIndex = index;
    }

    /* ---------- INPUT EVENTS ---------- */

    searchInput.setAttribute("autocomplete", "off");
    searchInput.setAttribute("aria-controls", dropdown.id);
    searchInput.setAttribute("aria-expanded", "false");

    searchInput.addEventListener("input", () => {
        renderResults(searchInput.value);
        searchInput.setAttribute(
            "aria-expanded",
            String(!dropdown.hidden)
        );
    });

    searchInput.addEventListener("keydown", event => {
        const buttons = dropdown.querySelectorAll(".lifeos-search-result");

        if (event.key === "ArrowDown" && buttons.length) {
            event.preventDefault();
            selectResult(Math.min(activeIndex + 1, buttons.length - 1));
        }

        if (event.key === "ArrowUp" && buttons.length) {
            event.preventDefault();
            selectResult(Math.max(activeIndex - 1, 0));
        }

        if (event.key === "Enter") {
            if (activeIndex >= 0 && visibleResults[activeIndex]) {
                event.preventDefault();
                window.location.href = visibleResults[activeIndex].url;
            } else if (buttons.length) {
                event.preventDefault();
                window.location.href = visibleResults[0].url;
            }
        }

        if (event.key === "Escape") {
            dropdown.hidden = true;
            searchInput.setAttribute("aria-expanded", "false");
            searchInput.blur();
        }
    });

    document.addEventListener("click", event => {
        if (!searchContainer.contains(event.target)) {
            dropdown.hidden = true;
            searchInput.setAttribute("aria-expanded", "false");
        }
    });

    searchInput.addEventListener("focus", () => {
        if (searchInput.value.trim()) {
            renderResults(searchInput.value);
            searchInput.setAttribute(
                "aria-expanded",
                String(!dropdown.hidden)
            );
        }
    });
});