
/* =========================================================
   LIFEOS — DAILY BIBLE VERSE & VERSE HISTORY
   Storage:
   lifeos_verse_history
========================================================= */

(() => {
    "use strict";

    const HISTORY_KEY = "lifeos_verse_history";

    /*
       PUBLIC-DOMAIN KJV VERSE COLLECTION
       The daily verse is selected using the local calendar date.
    */

    const verses = [
        {
            id: "v1",
            text: "The Lord is my shepherd; I shall not want.",
            reference: "Psalm 23:1"
        },
        {
            id: "v2",
            text: "I can do all things through Christ which strengtheneth me.",
            reference: "Philippians 4:13"
        },
        {
            id: "v3",
            text: "Be still, and know that I am God.",
            reference: "Psalm 46:10"
        },
        {
            id: "v4",
            text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding.",
            reference: "Proverbs 3:5"
        },
        {
            id: "v5",
            text: "The Lord is my light and my salvation; whom shall I fear?",
            reference: "Psalm 27:1"
        },
        {
            id: "v6",
            text: "Let all your things be done with charity.",
            reference: "1 Corinthians 16:14"
        },
        {
            id: "v7",
            text: "For we walk by faith, not by sight.",
            reference: "2 Corinthians 5:7"
        },
        {
            id: "v8",
            text: "The Lord is good, a strong hold in the day of trouble; and he knoweth them that trust in him.",
            reference: "Nahum 1:7"
        },
        {
            id: "v9",
            text: "I will praise thee; for I am fearfully and wonderfully made.",
            reference: "Psalm 139:14"
        },
        {
            id: "v10",
            text: "Cast thy burden upon the Lord, and he shall sustain thee.",
            reference: "Psalm 55:22"
        },
        {
            id: "v11",
            text: "Let us not be weary in well doing: for in due season we shall reap, if we faint not.",
            reference: "Galatians 6:9"
        },
        {
            id: "v12",
            text: "The Lord is nigh unto all them that call upon him, to all that call upon him in truth.",
            reference: "Psalm 145:18"
        },
        {
            id: "v13",
            text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.",
            reference: "Colossians 3:23"
        },
        {
            id: "v14",
            text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
            reference: "2 Timothy 1:7"
        },
        {
            id: "v15",
            text: "This is the day which the Lord hath made; we will rejoice and be glad in it.",
            reference: "Psalm 118:24"
        },
        {
            id: "v16",
            text: "Commit thy works unto the Lord, and thy thoughts shall be established.",
            reference: "Proverbs 16:3"
        },
        {
            id: "v17",
            text: "The Lord is my strength and my shield; my heart trusted in him, and I am helped.",
            reference: "Psalm 28:7"
        },
        {
            id: "v18",
            text: "With God all things are possible.",
            reference: "Matthew 19:26"
        },
        {
            id: "v19",
            text: "Rejoicing in hope; patient in tribulation; continuing instant in prayer.",
            reference: "Romans 12:12"
        },
        {
            id: "v20",
            text: "He giveth power to the faint; and to them that have no might he increaseth strength.",
            reference: "Isaiah 40:29"
        },
        {
            id: "v21",
            text: "Let your heart therefore be perfect with the Lord our God, to walk in his statutes, and to keep his commandments.",
            reference: "1 Kings 8:61"
        },
        {
            id: "v22",
            text: "The joy of the Lord is your strength.",
            reference: "Nehemiah 8:10"
        },
        {
            id: "v23",
            text: "In every thing give thanks: for this is the will of God in Christ Jesus concerning you.",
            reference: "1 Thessalonians 5:18"
        },
        {
            id: "v24",
            text: "The Lord shall fight for you, and ye shall hold your peace.",
            reference: "Exodus 14:14"
        },
        {
            id: "v25",
            text: "Thy word is a lamp unto my feet, and a light unto my path.",
            reference: "Psalm 119:105"
        },
        {
            id: "v26",
            text: "And let us consider one another to provoke unto love and to good works.",
            reference: "Hebrews 10:24"
        },
        {
            id: "v27",
            text: "The name of the Lord is a strong tower: the righteous runneth into it, and is safe.",
            reference: "Proverbs 18:10"
        },
        {
            id: "v28",
            text: "Peace I leave with you, my peace I give unto you.",
            reference: "John 14:27"
        },
        {
            id: "v29",
            text: "Wait on the Lord: be of good courage, and he shall strengthen thine heart.",
            reference: "Psalm 27:14"
        },
        {
            id: "v30",
            text: "The Lord is good unto them that wait for him, to the soul that seeketh him.",
            reference: "Lamentations 3:25"
        }
    ];

    /* ---------- DATE HELPERS ---------- */

    function getLocalDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(dateKey) {
        const [year, month, day] = dateKey.split("-").map(Number);

        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(new Date(year, month - 1, day));
    }

    function getDayNumber(dateKey) {
        const [year, month, day] = dateKey.split("-").map(Number);

        return Math.floor(
            Date.UTC(year, month - 1, day) / 86400000
        );
    }

    /* ---------- STORAGE ---------- */

    function getHistory() {
        try {
            const stored = JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );

            return Array.isArray(stored) ? stored : [];
        } catch (error) {
            console.error("Could not read verse history:", error);
            return [];
        }
    }

    function saveHistory(history) {
        try {
            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(history)
            );
        } catch (error) {
            console.error("Could not save verse history:", error);
        }
    }

    /* ---------- DAILY VERSE ---------- */

    function getDailyVerse(dateKey = getLocalDateKey()) {
        const anchorDate = "2026-11-03";

        const daysSinceAnchor =
            getDayNumber(dateKey) - getDayNumber(anchorDate);

        const index =
            ((daysSinceAnchor % verses.length) + verses.length) %
            verses.length;

        return verses[index];
    }

    function getOrCreateDailyRecord() {
        const today = getLocalDateKey();
        const dailyVerse = getDailyVerse(today);

        const history = getHistory();

        let record = history.find(item => item.date === today);

        if (!record) {
            record = {
                date: today,
                id: dailyVerse.id,
                text: dailyVerse.text,
                reference: dailyVerse.reference,
                favorite: false
            };

            history.push(record);
            history.sort((a, b) => b.date.localeCompare(a.date));

            saveHistory(history);
        }

        return record;
    }

    /* ---------- HOMEPAGE VERSE ---------- */

    function displayHomepageVerse(record) {
        const textElement = document.getElementById("dailyVerseText");
        const referenceElement = document.getElementById("dailyVerseReference");
        const messageElement = document.getElementById("dailyVerseMessage");

        if (textElement) {
            textElement.textContent = `“${record.text}”`;
        }

        if (referenceElement) {
            referenceElement.textContent = record.reference;
        }

        if (messageElement) {
            messageElement.textContent = "A little reminder for your day. ♡";
        }
    }

    /* ---------- VERSE HISTORY PAGE ---------- */

    function displayCurrentVerse(record) {
        const dateElement = document.getElementById("currentVerseDate");
        const textElement = document.getElementById("currentVerseText");
        const referenceElement = document.getElementById("currentVerseReference");

        if (dateElement) {
            dateElement.textContent = formatDate(record.date);
        }

        if (textElement) {
            textElement.textContent = `“${record.text}”`;
        }

        if (referenceElement) {
            referenceElement.textContent = record.reference;
        }

        updateCurrentBookmarkButton(record);
    }

    function updateCurrentBookmarkButton(record) {
        const button = document.getElementById("bookmarkCurrentVerse");

        if (!button) return;

        const icon = button.querySelector("i");
        const label = button.querySelector("span");

        if (record.favorite) {
            if (icon) icon.setAttribute("data-lucide", "bookmark-check");
            if (label) label.textContent = "Saved";
            button.classList.add("is-saved");
        } else {
            if (icon) icon.setAttribute("data-lucide", "bookmark");
            if (label) label.textContent = "Save verse";
            button.classList.remove("is-saved");
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function createHistoryItem(record) {
        const article = document.createElement("article");
        article.className = "verse-history-item";

        const content = document.createElement("div");
        content.className = "verse-history-content";

        const date = document.createElement("p");
        date.className = "verse-history-date";
        date.textContent = formatDate(record.date);

        const text = document.createElement("p");
        text.className = "verse-history-text";
        text.textContent = `“${record.text}”`;

        const reference = document.createElement("p");
        reference.className = "verse-history-reference";
        reference.textContent = record.reference;

        content.append(date, text, reference);

        const bookmarkButton = document.createElement("button");
        bookmarkButton.type = "button";
        bookmarkButton.className = "verse-bookmark-button";
        bookmarkButton.setAttribute(
            "aria-label",
            record.favorite ? "Remove saved verse" : "Save verse"
        );
        bookmarkButton.dataset.verseDate = record.date;

        const icon = document.createElement("i");
        icon.setAttribute(
            "data-lucide",
            record.favorite ? "bookmark-check" : "bookmark"
        );

        bookmarkButton.appendChild(icon);
        article.append(content, bookmarkButton);

        if (record.favorite) {
            article.classList.add("is-favorite");
        }

        return article;
    }

    function renderHistory() {
        const list = document.getElementById("verseHistoryList");
        const count = document.getElementById("verseHistoryCount");
        const searchInput = document.getElementById("verseSearch");
        const filterSelect = document.getElementById("verseFilter");

        if (!list) return;

        const query = (searchInput?.value || "").trim().toLowerCase();
        const filter = filterSelect?.value || "all";

        const history = getHistory().sort((a, b) =>
            b.date.localeCompare(a.date)
        );

        const filtered = history.filter(record => {
            const matchesSearch = [
                record.text,
                record.reference,
                record.date,
                formatDate(record.date)
            ].join(" ").toLowerCase().includes(query);

            const matchesFilter =
                filter === "all" || record.favorite === true;

            return matchesSearch && matchesFilter;
        });

        if (count) {
            count.textContent =
                `${filtered.length} ${filtered.length === 1 ? "verse" : "verses"}`;
        }

        list.replaceChildren();

        if (filtered.length === 0) {
            const empty = document.createElement("div");
            empty.className = "verse-history-empty";

            const icon = document.createElement("i");
            icon.setAttribute("data-lucide", "book-open");

            const heading = document.createElement("h3");
            heading.textContent = query || filter === "saved"
                ? "No matching verses found."
                : "Your verse history will appear here.";

            const message = document.createElement("p");
            message.textContent = query || filter === "saved"
                ? "Try another search or change your filter."
                : "Come back each day to collect new reminders.";

            empty.append(icon, heading, message);
            list.appendChild(empty);
        } else {
            filtered.forEach(record => {
                list.appendChild(createHistoryItem(record));
            });
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /* ---------- BOOKMARKS ---------- */

    function toggleBookmark(dateKey) {
        const history = getHistory();
        const record = history.find(item => item.date === dateKey);

        if (!record) return null;

        record.favorite = !record.favorite;
        saveHistory(history);

        return record;
    }

    function setupBookmarkActions(currentRecord) {
        const currentButton = document.getElementById("bookmarkCurrentVerse");

        if (currentButton) {
            currentButton.addEventListener("click", () => {
                const updated = toggleBookmark(currentRecord.date);

                if (!updated) return;

                currentRecord.favorite = updated.favorite;
                updateCurrentBookmarkButton(updated);
                renderHistory();
            });
        }

        const historyList = document.getElementById("verseHistoryList");

        if (historyList) {
            historyList.addEventListener("click", event => {
                const button = event.target.closest("[data-verse-date]");

                if (!button) return;

                const updated = toggleBookmark(button.dataset.verseDate);

                if (updated) {
                    renderHistory();
                    displayCurrentVerse(currentRecord);
                }
            });
        }
    }

    /* ---------- INITIALIZATION ---------- */

    function initializeVerses() {
        const currentRecord = getOrCreateDailyRecord();

        // Homepage elements
        displayHomepageVerse(currentRecord);

        // Verse history page elements
        displayCurrentVerse(currentRecord);
        renderHistory();

        // Search and filter
        const searchInput = document.getElementById("verseSearch");
        const filterSelect = document.getElementById("verseFilter");

        if (searchInput) {
            searchInput.addEventListener("input", renderHistory);
        }

        if (filterSelect) {
            filterSelect.addEventListener("change", renderHistory);
        }

        setupBookmarkActions(currentRecord);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeVerses);
    } else {
        initializeVerses();
    }

})();
