
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

        if (!button || !sidebar) {
            console.warn("LIFEOS: Sidebar elements not found on this page.");
            return;
        }

        function updateSidebar(collapsed) {
            document.body.classList.toggle("sidebar-collapsed", collapsed);

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

        // Restore the saved sidebar state.
        let savedState = false;

        try {
            savedState = localStorage.getItem(STORAGE_KEY) === "true";
        } catch (error) {
            console.warn("LIFEOS: Could not read sidebar preference.", error);
        }

        updateSidebar(savedState);

        // Toggle sidebar when clicked.
        button.addEventListener("click", () => {
            const collapsed =
                document.body.classList.contains("sidebar-collapsed");

            const newState = !collapsed;

            updateSidebar(newState);

            try {
                localStorage.setItem(STORAGE_KEY, String(newState));
            } catch (error) {
                console.warn("LIFEOS: Could not save sidebar preference.", error);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeSidebar);
    } else {
        initializeSidebar();
    }

})();
