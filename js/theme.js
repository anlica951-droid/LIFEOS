/* =========================================
   LIFEOS - GLOBAL THEME MANAGER
========================================= */

(function () {
    const SETTINGS_KEY = "lifeos_settings";

    function getSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        } catch (error) {
            return {};
        }
    }

    function applyTheme() {
        const settings = getSettings();
        const preference = settings.appearance || "light";

        const systemPrefersDark =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;

        const activeTheme = preference === "system"
            ? (systemPrefersDark ? "dark" : "light")
            : preference;

        document.documentElement.setAttribute("data-theme", activeTheme);
        document.documentElement.setAttribute("data-theme-preference", preference);
        document.documentElement.style.colorScheme = activeTheme;
    }

    applyTheme();

    if (window.matchMedia) {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

        const handleSystemThemeChange = function () {
            if (getSettings().appearance === "system") {
                applyTheme();
            }
        };

        if (systemTheme.addEventListener) {
            systemTheme.addEventListener("change", handleSystemThemeChange);
        } else {
            systemTheme.addListener(handleSystemThemeChange);
        }
    }

    window.addEventListener("storage", function (event) {
        if (event.key === SETTINGS_KEY) {
            applyTheme();
        }
    });
})();