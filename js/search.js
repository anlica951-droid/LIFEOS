
/* =========================================
   LIFEOS — GLOBAL SMART SEARCH
   File: js/search.js

   Searches:
   - Supabase academic records
   - Tasks, goals and achievements
   - Journal entries and moods
   - Notes
   - Calendar events
   - Habits and habit logs
   - Class schedules and grade categories
   - Existing local Bible verse history
   - Existing local focus sessions
   - LIFEOS pages
========================================= */

import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    const searchContainer = searchInput.closest(".search-container");
    if (!searchContainer) return;

    const STORAGE = {
        events: "lifeos_calendar_events",
        notes: "lifeos_notes",
        journal: "lifeos_reflections",
        verses: "lifeos_verse_history",
        focus: "lifeos_focus_sessions"
    };

    const PAGE = {
        home: "dashboard.html",
        academics: "pages/subjects.html",
        calendar: "pages/calendar.html",
        tasks: "pages/tasks.html",
        journal: "pages/journal.html",
        focus: "pages/focus.html",
        progress: "pages/progress.html",
        notes: "pages/notes.html",
        verses: "pages/verses.html",
        settings: "pages/settings.html",
        profile: "pages/profile.html"
    };

    let results = [];
    let activeIndex = -1;
    let loading = false;
    let loadPromise = null;
    let searchTimeout = null;

    /* =====================================
       HELPERS
    ===================================== */

    function normalize(value) {
        return String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function safeText(value, fallback = "") {
        if (value === null || value === undefined) {
            return fallback;
        }

        if (typeof value === "object") {
            return JSON.stringify(value);
        }

        return String(value);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function pageURL(path) {
        return new URL(`../${path}`, import.meta.url).href;
    }

    function readStorage(key) {
        try {
            const value = localStorage.getItem(key);
            if (!value) return [];

            const parsed = JSON.parse(value);

            if (Array.isArray(parsed)) return parsed;

            if (parsed && typeof parsed === "object") {
                return Object.values(parsed).filter(
                    item => item && typeof item === "object"
                );
            }

            return [];
        } catch (error) {
            console.warn(`LIFEOS Search: Could not read ${key}`, error);
            return [];
        }
    }

    function getRecordId(record) {
        return safeText(
            record?.id ??
            record?.uuid ??
            record?._id ??
            ""
        );
    }

    function getRecordTitle(record, fields = []) {
        for (const field of fields) {
            if (
                record?.[field] !== undefined &&
                record?.[field] !== null &&
                String(record[field]).trim()
            ) {
                return safeText(record[field]);
            }
        }

        return "";
    }

    function formatDate(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return safeText(value);
        }

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function makeResult({
        type,
        title,
        description = "",
        url,
        icon = "search",
        searchable = "",
        id = ""
    }) {
        if (!title || !url) return null;

        return {
            type,
            title: safeText(title),
            description: safeText(description),
            url,
            icon,
            id: safeText(id),
            searchable: normalize(
                `${title} ${description} ${searchable} ${type}`
            )
        };
    }

    function addResult(collection, data) {
        const result = makeResult(data);

        if (result) collection.push(result);
    }

    function recordSearchText(record) {
        return Object.entries(record || {})
            .filter(([key]) => key !== "user_id")
            .map(([key, value]) => `${key} ${safeText(value)}`)
            .join(" ");
    }

    /* =====================================
       PAGE RESULTS
    ===================================== */

    function getPageResults(collection) {
        const pages = [
            {
                type: "Home",
                title: "Dashboard",
                description: "Your LIFEOS personal space",
                path: PAGE.home,
                icon: "house",
                keywords: "home overview welcome daily"
            },
            {
                type: "Academics",
                title: "Academics",
                description: "Subjects, schoolwork and academic records",
                path: PAGE.academics,
                icon: "graduation-cap",
                keywords: "subjects school study classes lessons grades"
            },
            {
                type: "Calendar",
                title: "Calendar",
                description: "Your schedule and upcoming events",
                path: PAGE.calendar,
                icon: "calendar-days",
                keywords: "schedule dates events appointments"
            },
            {
                type: "Tasks",
                title: "My Tasks",
                description: "Manage your tasks and assignments",
                path: PAGE.tasks,
                icon: "list-checks",
                keywords: "todo to do assignments pending completed"
            },
            {
                type: "Journal",
                title: "Mood & Journal",
                description: "Your moods and personal reflections",
                path: PAGE.journal,
                icon: "book-heart",
                keywords: "mood feelings emotions reflection diary"
            },
            {
                type: "Focus",
                title: "Focus Room",
                description: "Your study sessions and focus timer",
                path: PAGE.focus,
                icon: "timer",
                keywords: "pomodoro timer concentration study session"
            },
            {
                type: "Progress",
                title: "My Progress",
                description: "Your goals, habits and achievements",
                path: PAGE.progress,
                icon: "chart-no-axes-combined",
                keywords: "statistics achievements goals streak growth"
            },
            {
                type: "Notes",
                title: "My Notes",
                description: "Your saved notes and ideas",
                path: PAGE.notes,
                icon: "notebook-pen",
                keywords: "notebook reminders ideas writing"
            },
            {
                type: "Bible",
                title: "Bible Verse History",
                description: "Your saved daily verses",
                path: PAGE.verses,
                icon: "book-open",
                keywords: "bible scripture faith encouragement verse"
            },
            {
                type: "Settings",
                title: "Settings",
                description: "Manage your LIFEOS preferences",
                path: PAGE.settings,
                icon: "settings",
                keywords: "preferences appearance notifications account"
            },
            {
                type: "Profile",
                title: "My Profile",
                description: "View and edit your profile",
                path: PAGE.profile,
                icon: "user-round",
                keywords: "account personal information display name"
            }
        ];

        pages.forEach(page => {
            addResult(collection, {
                type: page.type,
                title: page.title,
                description: page.description,
                url: pageURL(page.path),
                icon: page.icon,
                searchable: page.keywords
            });
        });
    }

    /* =====================================
       SUPABASE TABLE SEARCH
    ===================================== */

    const TABLES = [
        {
            table: "personal_tasks",
            type: "Task",
            path: PAGE.tasks,
            icon: "list-checks",
            title: ["title"],
            description: ["category", "status", "priority", "due_at"]
        },
        {
            table: "academic_items",
            type: "Academic Item",
            path: PAGE.academics,
            icon: "graduation-cap",
            title: ["title"],
            description: ["item_type", "description", "status", "priority", "score", "max_score", "due_at"]
        },
        {
            table: "journal_entries",
            type: "Journal Entry",
            path: PAGE.journal,
            icon: "book-heart",
            title: ["title", "content"],
            description: ["mood", "entry_date", "content"]
        },
        {
            table: "notes",
            type: "Note",
            path: PAGE.notes,
            icon: "notebook-pen",
            title: ["title", "content"],
            description: ["category", "content", "pinned"]
        },
        {
            table: "personal_events",
            type: "Calendar Event",
            path: PAGE.calendar,
            icon: "calendar-days",
            title: ["title"],
            description: ["description", "location", "starts_at", "ends_at"]
        },
        {
            table: "personal_goals",
            type: "Goal",
            path: PAGE.progress,
            icon: "target",
            title: ["title"],
            description: ["description", "category", "status", "target_date"]
        },
        {
            table: "achievements",
            type: "Achievement",
            path: PAGE.progress,
            icon: "award",
            title: ["title"],
            description: ["issuer", "description", "achievement_date"]
        },
        {
            table: "habits",
            type: "Habit",
            path: PAGE.progress,
            icon: "repeat",
            title: ["name"],
            description: ["description", "frequency", "target_count", "is_active"]
        },
        {
            table: "habit_logs",
            type: "Habit Log",
            path: PAGE.progress,
            icon: "calendar-check",
            title: ["notes", "completed_on"],
            description: ["completed_count", "completed_on"]
        },
        {
            table: "class_schedules",
            type: "Class Schedule",
            path: PAGE.academics,
            icon: "calendar-clock",
            title: ["location", "start_time"],
            description: ["day_of_week", "start_time", "end_time", "location"]
        },
        {
            table: "grade_categories",
            type: "Grade Category",
            path: PAGE.academics,
            icon: "clipboard-list",
            title: ["name"],
            description: ["weight"]
        }
    ];

    function buildDatabaseResult(record, config) {
        const id = getRecordId(record);

        let title = getRecordTitle(record, config.title);

        if (!title) {
            if (config.type === "Habit Log") {
                title = "Habit activity";
            } else if (config.type === "Class Schedule") {
                title = "Class schedule";
            } else {
                title = config.type;
            }
        }

        const description = config.description
            .map(field => {
                const value = record[field];

                if (value === null || value === undefined || value === "") {
                    return "";
                }

                if (
                    field.includes("date") ||
                    field.endsWith("_at")
                ) {
                    return formatDate(value);
                }

                return safeText(value);
            })
            .filter(Boolean)
            .join(" · ");

        addResult(results, {
            type: config.type,
            title,
            description,
            url: pageURL(config.path),
            icon: config.icon,
            searchable: recordSearchText(record),
            id
        });
    }

    async function getSupabaseResults(collection) {
        const { data: authData, error: authError } =
            await supabase.auth.getUser();

        if (authError) {
            console.error("LIFEOS Search: Authentication error.", authError);
            return;
        }

        const user = authData?.user;

        if (!user) {
            console.warn("LIFEOS Search: No signed-in user found.");
            return;
        }

        const requests = TABLES.map(async config => {
            try {
                const { data, error } = await supabase
                    .from(config.table)
                    .select("*")
                    .eq("user_id", user.id)
                    .limit(500);

                if (error) {
                    console.error(
                        `LIFEOS Search: ${config.table} could not be loaded.`,
                        error
                    );
                    return;
                }

                (data || []).forEach(record => {
                    buildDatabaseResult(record, config);
                });

            } catch (error) {
                console.error(
                    `LIFEOS Search: Error searching ${config.table}.`,
                    error
                );
            }
        });

        await Promise.all(requests);
    }

    /* =====================================
       LEGACY LOCAL STORAGE SEARCH
    ===================================== */

    function getLocalResults(collection, key, config) {
        const records = readStorage(key);

        records.forEach(record => {
            const title = getRecordTitle(record, config.title);
            const content = getRecordTitle(record, config.content || []);
            const finalTitle = title || (
                content ? content.slice(0, 60) : ""
            );

            if (!finalTitle) return;

            const id = getRecordId(record);

            addResult(collection, {
                type: config.type,
                title: finalTitle,
                description: content
                    ? content.slice(0, 100)
                    : config.description || "",
                url: pageURL(config.path),
                icon: config.icon,
                searchable: recordSearchText(record),
                id
            });
        });
    }

    function getLocalVerseResults(collection) {
        getLocalResults(collection, STORAGE.verses, {
            type: "Bible Verse",
            path: PAGE.verses,
            icon: "book-open",
            title: ["reference", "ref", "book", "verseReference", "title"],
            content: ["text", "verse", "content", "message"],
            description: "Saved Bible verse"
        });
    }

    function getLocalFocusResults(collection) {
        getLocalResults(collection, STORAGE.focus, {
            type: "Focus Session",
            path: PAGE.focus,
            icon: "timer",
            title: ["title", "subject", "name", "task"],
            content: ["notes", "description"],
            description: "Saved focus session"
        });
    }

    /* =====================================
       LOAD ALL SEARCH DATA
    ===================================== */

    async function getAllResults() {
        const collection = [];

        getPageResults(collection);

        // Keep legacy local records searchable.
        getLocalResults(collection, STORAGE.events, {
            type: "Calendar Event",
            path: PAGE.calendar,
            icon: "calendar-days",
            title: ["title", "name", "event", "eventName"],
            content: ["description", "location"]
        });

        getLocalResults(collection, STORAGE.notes, {
            type: "Note",
            path: PAGE.notes,
            icon: "notebook-pen",
            title: ["title", "name", "heading"],
            content: ["content", "text", "body", "description", "note"]
        });

        getLocalResults(collection, STORAGE.journal, {
            type: "Journal Entry",
            path: PAGE.journal,
            icon: "book-heart",
            title: ["title", "name", "heading"],
            content: ["content", "text", "body", "reflection", "entry"]
        });

        getLocalVerseResults(collection);
        getLocalFocusResults(collection);

        await getSupabaseResults(collection);

        return collection;
    }

    /* =====================================
       SEARCH STYLING
    ===================================== */

    const style = document.createElement("style");

    style.textContent = `
        .lifeos-search-results {
            position: absolute;
            top: calc(100% + 12px);
            left: 0;
            right: 0;
            z-index: 9999;
            display: none;
            max-height: min(480px, 70vh);
            overflow-y: auto;
            padding: 9px;
            background: rgba(255,255,255,.97);
            border: 1px solid rgba(97,124,98,.16);
            border-radius: 18px;
            box-shadow: 0 16px 45px rgba(35,55,40,.15);
            backdrop-filter: blur(18px);
        }

        .lifeos-search-results.show {
            display: block;
            animation: lifeosSearchIn .16s ease;
        }

        @keyframes lifeosSearchIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .lifeos-search-heading {
            padding: 9px 11px 10px;
            color: #829184;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
        }

        .lifeos-search-result {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 11px;
            border: 0;
            border-radius: 12px;
            background: transparent;
            color: #303a32;
            text-align: left;
            cursor: pointer;
        }

        .lifeos-search-result:hover,
        .lifeos-search-result.active {
            background: #edf3eb;
        }

        .lifeos-search-icon {
            width: 37px;
            height: 37px;
            flex: 0 0 37px;
            display: grid;
            place-items: center;
            border-radius: 11px;
            background: #e7eee4;
            color: #617c62;
        }

        .lifeos-search-icon svg {
            width: 17px;
            height: 17px;
        }

        .lifeos-search-info {
            min-width: 0;
            flex: 1;
        }

        .lifeos-search-title {
            display: block;
            overflow: hidden;
            color: #303a32;
            font-size: 13px;
            font-weight: 700;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .lifeos-search-description {
            display: block;
            overflow: hidden;
            margin-top: 3px;
            color: #879188;
            font-size: 11px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .lifeos-search-type {
            flex: 0 0 auto;
            color: #8b9a8b;
            font-size: 10px;
            font-weight: 600;
        }

        .lifeos-search-empty {
            padding: 25px 15px;
            color: #7d887e;
            font-size: 13px;
            text-align: center;
        }

        .lifeos-search-empty strong {
            display: block;
            margin-bottom: 5px;
            color: #455448;
            font-size: 14px;
        }

        .lifeos-search-footer {
            padding: 10px 11px 5px;
            border-top: 1px solid #edf0eb;
            color: #98a197;
            font-size: 10px;
        }

        .search-container {
            position: relative;
        }

        @media(max-width:600px) {
            .lifeos-search-results {
                position: fixed;
                top: 75px;
                left: 12px;
                right: 12px;
                max-height: 65vh;
            }
        }
    `;

    document.head.appendChild(style);

    /* =====================================
       RESULTS DROPDOWN
    ===================================== */

    const dropdown = document.createElement("div");

    dropdown.className = "lifeos-search-results";
    dropdown.setAttribute("role", "listbox");
    dropdown.setAttribute("aria-label", "Search results");

    searchContainer.appendChild(dropdown);

    searchInput.setAttribute("autocomplete", "off");
    searchInput.setAttribute("aria-autocomplete", "list");

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function hideDropdown() {
        dropdown.classList.remove("show");
        activeIndex = -1;
        searchInput.removeAttribute("aria-activedescendant");
    }

    function showEmpty(message, heading = "No matching results") {
        dropdown.innerHTML = `
            <div class="lifeos-search-empty">
                <strong>${escapeHTML(heading)}</strong>
                ${escapeHTML(message)}
            </div>
        `;

        dropdown.classList.add("show");
        activeIndex = -1;
    }

    /* =====================================
       SEARCH SCORING
    ===================================== */

    function scoreResult(result, query) {
        const title = normalize(result.title);
        const searchable = result.searchable;
        const words = query.split(" ");

        let score = 0;

        if (title === query) {
            score += 150;
        } else if (title.startsWith(query)) {
            score += 110;
        } else if (title.includes(query)) {
            score += 80;
        }

        if (searchable.includes(query)) {
            score += 45;
        }

        const matches = words.filter(word =>
            searchable.includes(word)
        ).length;

        if (matches === words.length) {
            score += 35;
        } else {
            score += matches * 8;
        }

        return score;
    }

    /* =====================================
       RENDER RESULTS
    ===================================== */

    function renderResults(query) {
        const normalizedQuery = normalize(query);

        if (!normalizedQuery) {
            hideDropdown();
            return;
        }

        if (loading) {
            showEmpty("Searching your saved records...", "Just a moment");
            return;
        }

        const matched = results
            .map(result => ({
                result,
                score: scoreResult(result, normalizedQuery)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        const visible = matched.slice(0, 15);

        if (!visible.length) {
            showEmpty("Try another keyword or check your spelling.");
            return;
        }

        dropdown.innerHTML = `
            <div class="lifeos-search-heading">
                Search results (${matched.length})
            </div>

            ${visible.map(({ result }, index) => `
                <button
                    type="button"
                    class="lifeos-search-result"
                    role="option"
                    aria-selected="false"
                    data-result-index="${index}"
                    id="lifeos-search-option-${index}"
                >
                    <span class="lifeos-search-icon">
                        <i data-lucide="${escapeHTML(result.icon)}"></i>
                    </span>

                    <span class="lifeos-search-info">
                        <span class="lifeos-search-title">
                            ${escapeHTML(result.title)}
                        </span>

                        <span class="lifeos-search-description">
                            ${escapeHTML(result.description)}
                        </span>
                    </span>

                    <span class="lifeos-search-type">
                        ${escapeHTML(result.type)}
                    </span>
                </button>
            `).join("")}

            <div class="lifeos-search-footer">
                Use ↑ ↓ to navigate · Enter to open · Esc to close
            </div>
        `;

        dropdown.classList.add("show");
        activeIndex = -1;

        refreshIcons();

        dropdown.querySelectorAll(".lifeos-search-result")
            .forEach(button => {
                button.addEventListener("click", () => {
                    const index = Number(button.dataset.resultIndex);
                    openResult(visible[index]?.result);
                });
            });
    }

    /* =====================================
       OPEN RESULT
    ===================================== */

    function openResult(result) {
        if (!result?.url) return;

        window.location.href = result.url;
    }

    /* =====================================
       KEYBOARD NAVIGATION
    ===================================== */

    function setActiveResult(index) {
        const buttons = [
            ...dropdown.querySelectorAll(".lifeos-search-result")
        ];

        if (!buttons.length) return;

        activeIndex = Math.max(
            0,
            Math.min(index, buttons.length - 1)
        );

        buttons.forEach((button, buttonIndex) => {
            const active = buttonIndex === activeIndex;

            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));

            if (active) {
                searchInput.setAttribute(
                    "aria-activedescendant",
                    button.id
                );

                button.scrollIntoView({
                    block: "nearest"
                });
            }
        });
    }

    searchInput.addEventListener("keydown", event => {
        const buttons = dropdown.querySelectorAll(
            ".lifeos-search-result"
        );

        if (!dropdown.classList.contains("show")) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveResult(activeIndex + 1);
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            setActiveResult(
                activeIndex <= 0
                    ? buttons.length - 1
                    : activeIndex - 1
            );
        }

        if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            buttons[activeIndex]?.click();
        }

        if (event.key === "Escape") {
            hideDropdown();
            searchInput.blur();
        }
    });

    /* =====================================
       LOAD SEARCH DATA
    ===================================== */

    async function refreshSearchData() {
        if (loadPromise) return loadPromise;

        loading = true;

        if (normalize(searchInput.value)) {
            renderResults(searchInput.value);
        }

        loadPromise = (async () => {
            try {
                results = await getAllResults();

                console.info(
                    `LIFEOS Search: Loaded ${results.length} searchable records.`
                );

            } catch (error) {
                console.error("LIFEOS Search: Loading failed.", error);
            } finally {
                loading = false;
                loadPromise = null;

                if (normalize(searchInput.value)) {
                    renderResults(searchInput.value);
                }
            }
        })();

        return loadPromise;
    }

    /* =====================================
       INPUT EVENTS
    ===================================== */

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);

        const query = searchInput.value;

        if (!normalize(query)) {
            hideDropdown();
            return;
        }

        if (!results.length && !loading) {
            refreshSearchData();
            return;
        }

        renderResults(query);
    });

    searchInput.addEventListener("focus", () => {
        if (!results.length) {
            refreshSearchData();
        } else if (normalize(searchInput.value)) {
            renderResults(searchInput.value);
        }
    });

    searchInput.addEventListener("click", () => {
        if (!results.length) {
            refreshSearchData();
        }
    });

    /* =====================================
       CLOSE WHEN CLICKING OUTSIDE
    ===================================== */

    document.addEventListener("click", event => {
        if (
            !searchContainer.contains(event.target) &&
            !dropdown.contains(event.target)
        ) {
            hideDropdown();
        }
    });

    /* =====================================
       INITIALIZATION
    ===================================== */

    refreshSearchData();

    console.info("LIFEOS: Global search initialized.");
});
