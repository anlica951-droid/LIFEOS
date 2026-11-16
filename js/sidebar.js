
/* =========================================================
   LIFEOS — GLOBAL SIDEBAR
   File: js/sidebar.js
========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "lifeos_sidebar_collapsed";

    function initializeSidebar() {
        const button = document.getElementById("sidebarCollapse");
        const sidebar = document.getElementById("sidebar");

        if (!button || !sidebar) return;

        // Avoid attaching duplicate listeners.
        if (button.dataset.sidebarInitialized === "true") return;
        button.dataset.sidebarInitialized = "true";

        function updateSidebar(collapsed) {
            document.body.classList.toggle(
                "sidebar-collapsed",
                collapsed
            );

            sidebar.classList.toggle(
                "collapsed",
                collapsed
            );

            button.setAttribute(
                "aria-label",
                collapsed ? "Expand sidebar" : "Collapse sidebar"
            );

            button.setAttribute("aria-expanded", String(!collapsed));

            button.innerHTML = collapsed
                ? '<i data-lucide="chevron-right"></i>'
                : '<i data-lucide="chevron-left"></i>';

            if (window.lucide) {
                window.lucide.createIcons();
            }
        }

        // Restore saved preference.
        let savedState = false;

        try {
            savedState =
                localStorage.getItem(STORAGE_KEY) === "true";
        } catch (error) {
            console.warn("LIFEOS: Sidebar preference unavailable.");
        }

        updateSidebar(savedState);

        // Toggle sidebar.
        button.addEventListener("click", () => {
            const newState =
                !document.body.classList.contains("sidebar-collapsed");

            updateSidebar(newState);

            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    String(newState)
                );
            } catch (error) {
                console.warn("LIFEOS: Could not save sidebar preference.");
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeSidebar
        );
    } else {
        initializeSidebar();
    }

})();
