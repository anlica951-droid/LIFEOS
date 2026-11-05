(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const button = document.getElementById("sidebarCollapse");

        if (!button) {
            console.error("LIFEOS: Sidebar button not found.");
            return;
        }

        const STORAGE_KEY = "lifeos_sidebar_collapsed";

        function updateSidebar(collapsed) {
            document.body.classList.toggle("sidebar-collapsed", collapsed);

            button.setAttribute(
                "aria-label",
                collapsed ? "Expand sidebar" : "Collapse sidebar"
            );

            button.innerHTML = collapsed
                ? '<i data-lucide="chevron-right"></i>'
                : '<i data-lucide="chevron-left"></i>';

            if (window.lucide) {
                window.lucide.createIcons();
            }
        }

        const savedState =
            localStorage.getItem(STORAGE_KEY) === "true";

        updateSidebar(savedState);

        button.addEventListener("click", () => {
            const isCollapsed =
                document.body.classList.contains("sidebar-collapsed");

            const newState = !isCollapsed;

            localStorage.setItem(STORAGE_KEY, String(newState));
            updateSidebar(newState);
        });
    });
})();