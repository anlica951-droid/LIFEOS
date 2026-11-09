
import { supabase } from "./supabase.js";

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

let mode = "login";
let submitting = false;
let animationTimer;

const dashboardURL = new URL("dashboard.html", window.location.href).href;

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

    // Highlight and shake the password for login errors.
    if (mode === "login") {
        void password.offsetWidth;
        password.classList.add("input-error");
    }

    animationTimer = setTimeout(() => {
        loginCard.classList.remove("shake");
    }, 450);
}

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

// Clear errors when the user starts correcting their details.
password.addEventListener("input", clearErrorEffects);
email.addEventListener("input", clearErrorEffects);

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

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

googleBtn.addEventListener("click", async () => {
    if (submitting) return;

    clearErrorEffects();
    setLoading(true);

    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: dashboardURL
            }
        });

        if (error) throw error;

    } catch (error) {
        showFeedback(error.message || "Google sign-in failed.");
        setLoading(false);
    }
});

// Initialize login mode.
setMode("login");
