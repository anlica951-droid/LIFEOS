/* =========================================
   LIFEOS — SETTINGS
   File: js/settings.js
   ========================================= */

(() => {
  "use strict";

  const SETTINGS_KEY = "lifeos_settings";

  const DATA_KEYS = [
    "lifeos_tasks",
    "lifeos_calendar_events",
    "lifeos_reflections",
    "lifeos_focus_sessions",
    "lifeos_notes",
    "lifeos_verse_history",
    SETTINGS_KEY
  ];

  const DEFAULT_SETTINGS = {
    displayName: "",
    dailyGoal: 3,
    weekStart: "monday",
    dateFormat: "long",

    focusDuration: 25,
    shortBreak: 5,
    longBreak: 20,
    longBreakInterval: 3,
    autoStartFocus: false,
    autoStartBreak: true,

    appearance: "light",

    notificationsEnabled: false,
    taskReminders: true,
    focusAlerts: true
  };

  const $ = id => document.getElementById(id);

  const elements = {
    form: $("settingsForm"),
    displayName: $("settingsDisplayName"),
    dailyGoal: $("settingsDailyGoal"),
    weekStart: $("settingsWeekStart"),
    dateFormat: $("settingsDateFormat"),

    focusDuration: $("settingsFocusDuration"),
    shortBreak: $("settingsShortBreak"),
    longBreak: $("settingsLongBreak"),
    longBreakInterval: $("settingsLongBreakInterval"),
    autoStartFocus: $("settingsAutoStartFocus"),
    autoStartBreak: $("settingsAutoStartBreak"),

    themeLight: $("themeLight"),
    themeDark: $("themeDark"),
    themeSystem: $("themeSystem"),

    notificationToggle: $("notificationToggle"),
    notificationStatus: $("notificationStatus"),
    enableNotifications: $("enableNotifications"),
    taskReminders: $("settingsTaskReminders"),
    focusAlerts: $("settingsFocusAlerts"),

    feedback: $("settingsFeedback"),
    resetButton: $("resetSettings"),
    exportButton: $("exportData"),
    importButton: $("importData"),
    importFile: $("importFile")
  };

  let settings = loadSettings();
  let feedbackTimeout = null;
  let themeMediaQuery = null;

  /* -----------------------------------------
     STORAGE
  ----------------------------------------- */

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));

      if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
        return { ...DEFAULT_SETTINGS };
      }

      return normalizeSettings(saved);

    } catch (error) {
      console.error("Unable to load LIFEOS settings:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function normalizeSettings(data) {
    const merged = { ...DEFAULT_SETTINGS, ...data };

    return {
      ...merged,

      displayName: String(merged.displayName || "").slice(0, 40),

      dailyGoal: clampNumber(merged.dailyGoal, 3, 1, 50),

      weekStart: ["monday", "sunday"].includes(merged.weekStart)
        ? merged.weekStart
        : "monday",

      dateFormat: [
        "long",
        "short",
        "numeric",
        "day-first"
      ].includes(merged.dateFormat)
        ? merged.dateFormat
        : "long",

      focusDuration: clampNumber(merged.focusDuration, 25, 15, 60),
      shortBreak: clampNumber(merged.shortBreak, 5, 5, 15),
      longBreak: clampNumber(merged.longBreak, 20, 15, 30),
      longBreakInterval: clampNumber(merged.longBreakInterval, 3, 2, 5),

      autoStartFocus: Boolean(merged.autoStartFocus),
      autoStartBreak: Boolean(merged.autoStartBreak),

      appearance: ["light", "dark", "system"].includes(merged.appearance)
        ? merged.appearance
        : "light",

      notificationsEnabled: Boolean(merged.notificationsEnabled),
      taskReminders: Boolean(merged.taskReminders),
      focusAlerts: Boolean(merged.focusAlerts)
    };
  }

  function clampNumber(value, fallback, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) return fallback;

    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function persistSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error("Unable to save LIFEOS settings:", error);
      showFeedback("Unable to save. Your browser storage may be full or unavailable.");
      return false;
    }
  }

  /* -----------------------------------------
     FEEDBACK
  ----------------------------------------- */

  function showFeedback(message) {
    if (!elements.feedback) return;

    elements.feedback.textContent = message;
    elements.feedback.hidden = false;

    clearTimeout(feedbackTimeout);

    feedbackTimeout = setTimeout(() => {
      elements.feedback.hidden = true;
    }, 4000);
  }

  /* -----------------------------------------
     APPEARANCE
  ----------------------------------------- */

  function getResolvedTheme(preference) {
    if (preference === "system") {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }

    return preference === "dark" ? "dark" : "light";
  }

  function applyAppearance(preference) {
    const resolvedTheme = getResolvedTheme(preference);
    const root = document.documentElement;

    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolvedTheme;

    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (themeColor) {
      themeColor.content = resolvedTheme === "dark"
        ? "#202820"
        : "#f5f5ef";
    }
  }

  function getSelectedAppearance() {
    if (elements.themeDark?.checked) return "dark";
    if (elements.themeSystem?.checked) return "system";
    return "light";
  }

  function setupSystemThemeListener() {
    if (!window.matchMedia) return;

    themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      if (settings.appearance === "system") {
        applyAppearance("system");
      }
    };

    if (themeMediaQuery.addEventListener) {
      themeMediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      themeMediaQuery.addListener(handleSystemThemeChange);
    }
  }

  function setupThemeControls() {
    const themeInputs = [
      elements.themeLight,
      elements.themeDark,
      elements.themeSystem
    ].filter(Boolean);

    themeInputs.forEach(input => {
      input.addEventListener("change", () => {
        if (!input.checked) return;

        // Preview immediately. The preference is saved with the form.
        applyAppearance(input.value);
      });
    });
  }

  /* -----------------------------------------
     FORM VALUES
  ----------------------------------------- */

  function populateForm() {
    if (elements.displayName) {
      elements.displayName.value = settings.displayName;
    }

    if (elements.dailyGoal) {
      elements.dailyGoal.value = settings.dailyGoal;
    }

    if (elements.weekStart) {
      elements.weekStart.value = settings.weekStart;
    }

    if (elements.dateFormat) {
      elements.dateFormat.value = settings.dateFormat;
    }

    if (elements.focusDuration) {
      elements.focusDuration.value = settings.focusDuration;
    }

    if (elements.shortBreak) {
      elements.shortBreak.value = settings.shortBreak;
    }

    if (elements.longBreak) {
      elements.longBreak.value = settings.longBreak;
    }

    if (elements.longBreakInterval) {
      elements.longBreakInterval.value = settings.longBreakInterval;
    }

    if (elements.autoStartFocus) {
      elements.autoStartFocus.checked = settings.autoStartFocus;
    }

    if (elements.autoStartBreak) {
      elements.autoStartBreak.checked = settings.autoStartBreak;
    }

    if (elements.themeLight) {
      elements.themeLight.checked = settings.appearance === "light";
    }

    if (elements.themeDark) {
      elements.themeDark.checked = settings.appearance === "dark";
    }

    if (elements.themeSystem) {
      elements.themeSystem.checked = settings.appearance === "system";
    }

    if (elements.notificationToggle) {
      elements.notificationToggle.checked = settings.notificationsEnabled;
    }

    if (elements.taskReminders) {
      elements.taskReminders.checked = settings.taskReminders;
    }

    if (elements.focusAlerts) {
      elements.focusAlerts.checked = settings.focusAlerts;
    }

    applyAppearance(settings.appearance);
    updateNotificationStatus();
  }

  function readForm() {
    return normalizeSettings({
      displayName: elements.displayName?.value.trim() || "",
      dailyGoal: elements.dailyGoal?.value,
      weekStart: elements.weekStart?.value,
      dateFormat: elements.dateFormat?.value,

      focusDuration: elements.focusDuration?.value,
      shortBreak: elements.shortBreak?.value,
      longBreak: elements.longBreak?.value,
      longBreakInterval: elements.longBreakInterval?.value,

      autoStartFocus: elements.autoStartFocus?.checked,
      autoStartBreak: elements.autoStartBreak?.checked,

      appearance: getSelectedAppearance(),

      notificationsEnabled: settings.notificationsEnabled,
      taskReminders: elements.taskReminders?.checked,
      focusAlerts: elements.focusAlerts?.checked
    });
  }

  function validateForm() {
    const dailyGoal = Number(elements.dailyGoal?.value);
    const focusDuration = Number(elements.focusDuration?.value);

    if (!Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 50) {
      showFeedback("Your daily task goal must be between 1 and 50.");
      elements.dailyGoal?.focus();
      return false;
    }

    if (![15, 25, 30, 45, 50, 60].includes(focusDuration)) {
      showFeedback("Please select a valid focus duration.");
      elements.focusDuration?.focus();
      return false;
    }

    return true;
  }

  /* -----------------------------------------
     SAVE SETTINGS
  ----------------------------------------- */

  function handleSave(event) {
    event.preventDefault();

    if (!validateForm()) return;

    const previousSettings = { ...settings };
    settings = readForm();

    if (!persistSettings()) {
      settings = previousSettings;
      populateForm();
      return;
    }

    applyAppearance(settings.appearance);
    updateNotificationStatus();

    showFeedback("Your LIFEOS preferences have been saved.");
  }

  elements.form?.addEventListener("submit", handleSave);

  /* -----------------------------------------
     RESET SETTINGS
  ----------------------------------------- */

  function resetSettings() {
    const confirmed = window.confirm(
      "Restore all LIFEOS preferences to their defaults? Your tasks, notes, journal entries, and calendar events will remain untouched."
    );

    if (!confirmed) return;

    const previousSettings = settings;
    settings = { ...DEFAULT_SETTINGS };

    if (!persistSettings()) {
      settings = previousSettings;
      populateForm();
      return;
    }

    populateForm();
    showFeedback("Your preferences have been restored to their defaults.");
  }

  elements.resetButton?.addEventListener("click", resetSettings);

  /* -----------------------------------------
     NOTIFICATIONS
  ----------------------------------------- */

  function updateNotificationStatus() {
    if (!elements.notificationStatus) return;

    if (!("Notification" in window)) {
      elements.notificationStatus.textContent =
        "This browser does not support browser notifications.";

      if (elements.enableNotifications) {
        elements.enableNotifications.disabled = true;
      }

      return;
    }

    const permission = Notification.permission;

    if (permission === "granted") {
      elements.notificationStatus.textContent = settings.notificationsEnabled
        ? "Browser permission is allowed and LIFEOS notifications are enabled."
        : "Browser permission is allowed, but LIFEOS notifications are turned off.";
    } else if (permission === "denied") {
      elements.notificationStatus.textContent =
        "Notifications are blocked in your browser settings.";
    } else {
      elements.notificationStatus.textContent =
        "Notifications have not been allowed yet.";
    }

    if (elements.enableNotifications) {
      elements.enableNotifications.disabled = permission !== "default";
    }
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      showFeedback("Your browser does not support notifications.");
      return false;
    }

    if (!window.isSecureContext) {
      showFeedback("Browser notifications require HTTPS or localhost.");
      return false;
    }

    if (Notification.permission === "denied") {
      showFeedback("Notifications are blocked. Change permission in your browser settings.");
      updateNotificationStatus();
      return false;
    }

    try {
      const permission = await Notification.requestPermission();

      settings.notificationsEnabled = permission === "granted";

      if (!persistSettings()) {
        settings.notificationsEnabled = false;
      }

      if (elements.notificationToggle) {
        elements.notificationToggle.checked = settings.notificationsEnabled;
      }

      updateNotificationStatus();

      showFeedback(
        permission === "granted"
          ? "Browser notification permission granted."
          : "Notification permission was not granted."
      );

      return permission === "granted";

    } catch (error) {
      console.error("Notification permission error:", error);
      showFeedback("Unable to request notification permission.");
      return false;
    }
  }

  elements.enableNotifications?.addEventListener(
    "click",
    requestNotifications
  );

  elements.notificationToggle?.addEventListener("change", async event => {
    if (event.target.checked) {
      const granted = await requestNotifications();

      if (!granted) {
        event.target.checked = false;
      }

      return;
    }

    settings.notificationsEnabled = false;

    if (persistSettings()) {
      updateNotificationStatus();
      showFeedback("LIFEOS notifications are turned off.");
    } else {
      event.target.checked = true;
    }
  });

  /* -----------------------------------------
     EXPORT DATA
  ----------------------------------------- */

  function exportData() {
    try {
      const backup = {
        application: "LIFEOS",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {}
      };

      DATA_KEYS.forEach(key => {
        const saved = localStorage.getItem(key);

        if (saved === null) {
          backup.data[key] = key === SETTINGS_KEY
            ? { ...DEFAULT_SETTINGS }
            : [];
        } else {
          backup.data[key] = JSON.parse(saved);
        }
      });

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showFeedback("Your LIFEOS backup has been downloaded.");

    } catch (error) {
      console.error("Export failed:", error);
      showFeedback("Unable to export your data. Check your browser storage.");
    }
  }

  elements.exportButton?.addEventListener("click", exportData);

  /* -----------------------------------------
     IMPORT DATA
  ----------------------------------------- */

  function isValidBackup(backup) {
    if (
      !backup ||
      backup.application !== "LIFEOS" ||
      !backup.data ||
      typeof backup.data !== "object" ||
      Array.isArray(backup.data)
    ) {
      return false;
    }

    const arrayKeys = DATA_KEYS.filter(key => key !== SETTINGS_KEY);

    for (const key of arrayKeys) {
      if (
        backup.data[key] !== undefined &&
        !Array.isArray(backup.data[key])
      ) {
        return false;
      }
    }

    if (
      backup.data[SETTINGS_KEY] !== undefined &&
      (
        !backup.data[SETTINGS_KEY] ||
        typeof backup.data[SETTINGS_KEY] !== "object" ||
        Array.isArray(backup.data[SETTINGS_KEY])
      )
    ) {
      return false;
    }

    return true;
  }

  async function importData(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      showFeedback("Please choose a LIFEOS JSON backup file.");
      return;
    }

    try {
      const fileText = await file.text();
      const backup = JSON.parse(fileText);

      if (!isValidBackup(backup)) {
        showFeedback("This file is not a valid LIFEOS backup.");
        return;
      }

      const confirmed = window.confirm(
        "Import this backup? Existing information for the included categories will be replaced."
      );

      if (!confirmed) return;

      const previousData = {};

      DATA_KEYS.forEach(key => {
        previousData[key] = localStorage.getItem(key);
      });

      try {
        DATA_KEYS.forEach(key => {
          if (backup.data[key] === undefined) return;

          localStorage.setItem(
            key,
            JSON.stringify(backup.data[key])
          );
        });
      } catch (error) {
        DATA_KEYS.forEach(key => {
          const oldValue = previousData[key];

          if (oldValue === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, oldValue);
          }
        });

        throw error;
      }

      settings = loadSettings();
      populateForm();

      showFeedback("Backup imported successfully. Refreshing LIFEOS...");

      setTimeout(() => {
        window.location.reload();
      }, 1200);

    } catch (error) {
      console.error("Import failed:", error);
      showFeedback("Unable to import this backup. Check that the JSON file is valid.");
    } finally {
      if (elements.importFile) {
        elements.importFile.value = "";
      }
    }
  }

  elements.importButton?.addEventListener("click", () => {
    elements.importFile?.click();
  });

  elements.importFile?.addEventListener("change", event => {
    const file = event.target.files?.[0];

    if (file) {
      importData(file);
    }
  });

  /* -----------------------------------------
     CROSS-TAB SYNCHRONIZATION
  ----------------------------------------- */

  window.addEventListener("storage", event => {
    if (event.key === SETTINGS_KEY) {
      settings = loadSettings();
      populateForm();
    }
  });

  /* -----------------------------------------
     INITIALIZE
  ----------------------------------------- */

  populateForm();
  setupThemeControls();
  setupSystemThemeListener();

})();