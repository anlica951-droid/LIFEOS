import { supabase } from "./supabase.js";

/* =========================================
   LIFEOS — AUTHENTICATION
   File: js/auth.js
========================================= */

// ELEMENTS
const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const nameField = document.getElementById("nameField");
const displayName = document.getElementById("displayName");
const email = document.getElementById("email");
const password = document.getElementById("password");
const submitBtn = document.getElementById("submitBtn");
const googleBtn = document.getElementById("googleBtn");
const feedback = document.getElementById("feedback");
const loginCard = document.querySelector(".login-card");

// REDIRECT URLS
const dashboardURL = new URL("dashboard.html", window.location.href).href;
const loginURL = new URL("login.html", window.location.href).href;

// STATE
let mode = "login";
let submitting = false;
let animationTimer;


// =========================================
// FEEDBACK
// =========================================

function clearErrorEffects() {
    feedback.classList.remove("show", "success");
    feedback.textContent = "";

    loginCard.classList.remove("shake");
    password.classList.remove("input-error");

    clearTimeout(animationTimer);
}

function showFeedback(message, type = "error") {
    clearErrorEffects();

    feedback.textContent = message;
    feedback.classList.add("show");

    if (type === "success") {
        feedback.classList.add("success");
        return;
    }

    // Shake the login card.
    void loginCard.offsetWidth;
    loginCard.classList.add("shake");

    // Highlight password for login errors.
    if (mode === "login") {
        void password.offsetWidth;
        password.classList.add("input-error");
    }

    animationTimer = setTimeout(() => {
        loginCard.classList.remove("shake");
    }, 450);
}


// =========================================
// LOGIN / REGISTER MODE
// =========================================

function setMode(nextMode) {
    clearErrorEffects();

    mode = nextMode;

    const registering = mode === "register";

    loginTab.classList.toggle("active", !registering);
    registerTab.classList.toggle("active", registering);

    nameField.hidden = !registering;
    displayName.required = registering;

    submitBtn.textContent = registering
        ? "Create Account"
        : "Sign In";

    password.autocomplete = registering
        ? "new-password"
        : "current-password";
}


// =========================================
// LOADING STATE
// =========================================

function setLoading(loading) {
    submitting = loading;

    submitBtn.disabled = loading;
    googleBtn.disabled = loading;

    submitBtn.textContent = loading
        ? "Please wait..."
        : mode === "register"
            ? "Create Account"
            : "Sign In";
}


// =========================================
// TAB EVENTS
// =========================================

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));


// =========================================
// CLEAR ERRORS WHEN TYPING
// =========================================

password.addEventListener("input", clearErrorEffects);
email.addEventListener("input", clearErrorEffects);


// =========================================
// EMAIL SIGN IN / REGISTRATION
// =========================================

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitting) return;

    clearErrorEffects();
    setLoading(true);

    try {
        const userEmail = email.value.trim();
        const userPassword = password.value;

        if (!userEmail || !userPassword) {
            throw new Error("Please complete all required fields.");
        }

        // REGISTER
        if (mode === "register") {
            const name = displayName.value.trim();

            if (!name) {
                throw new Error("Please enter your name.");
            }

            const { data, error } = await supabase.auth.signUp({
                email: userEmail,
                password: userPassword,
                options: {
                    data: {
                        display_name: name
                    },
                    emailRedirectTo: dashboardURL
                }
            });

            if (error) throw error;

            if (data.session) {
                window.location.replace(dashboardURL);
                return;
            }

            showFeedback(
                "Account created! Please check your email to confirm your account.",
                "success"
            );

        } else {
            // SIGN IN
            const { data, error } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: userPassword
            });

            if (error) throw error;

            if (data.session) {
                window.location.replace(dashboardURL);
                return;
            }
        }

    } catch (error) {
        console.error("Authentication error:", error);

        showFeedback(
            error.message || "Something went wrong. Please try again."
        );

    } finally {
        setLoading(false);
    }
});


// =========================================
// GOOGLE SIGN IN
// =========================================

googleBtn.addEventListener("click", async () => {
    if (submitting) return;

    clearErrorEffects();
    setLoading(true);

    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                // Return to the LIFEOS login page first.
                redirectTo: loginURL
            }
        });

        if (error) throw error;

    } catch (error) {
        console.error("Google sign-in error:", error);

        showFeedback(
            error.message || "Google sign-in failed. Please try again."
        );

        setLoading(false);
    }
});


// =========================================
// HANDLE GOOGLE AUTHENTICATION CALLBACK
// =========================================

// Successful Google sign-in returns to login.html.
// Supabase restores the session and triggers SIGNED_IN.
// Then send the user to the dashboard.

supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
        window.location.replace(dashboardURL);
    }
});


// =========================================
// HANDLE GOOGLE SIGN-IN ERRORS
// =========================================

function handleOAuthError() {
    const params = new URLSearchParams(window.location.search);

    const errorCode = params.get("error");
    const errorDescription = params.get("error_description");

    if (!errorCode && !errorDescription) return;

    const cancelled =
        errorCode === "access_denied" ||
        (errorDescription &&
            errorDescription.toLowerCase().includes("cancel"));

    // Remove OAuth error parameters from the address bar.
    params.delete("error");
    params.delete("error_code");
    params.delete("error_description");

    const cleanQuery = params.toString();

    const cleanURL =
        window.location.pathname +
        (cleanQuery ? `?${cleanQuery}` : "") +
        window.location.hash;

    window.history.replaceState({}, document.title, cleanURL);

    if (cancelled) {
        showFeedback(
            "Google sign-in was cancelled. You can sign in using your email instead."
        );
    } else {
        showFeedback(
            "Google sign-in could not be completed. Please try again."
        );
    }
}


// =========================================
// INITIALIZE LOGIN PAGE
// =========================================

// Support login.html?mode=login
// and login.html?mode=register

const initialMode = new URLSearchParams(window.location.search).get("mode");

setMode(initialMode === "register" ? "register" : "login");

handleOAuthError();