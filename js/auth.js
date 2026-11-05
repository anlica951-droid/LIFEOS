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

let mode = "login";

function setMode(nextMode) {
    mode = nextMode;
    const registering = mode === "register";

    loginTab.classList.toggle("active", !registering);
    registerTab.classList.toggle("active", registering);
    nameField.hidden = !registering;
    displayName.required = registering;
    submitBtn.textContent = registering ? "Create Account" : "Sign In";
    password.autocomplete = registering ? "new-password" : "current-password";
    feedback.textContent = "";
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    submitBtn.disabled = true;

    try {
        const userEmail = email.value.trim();
        const userPassword = password.value;

        if (mode === "register") {
            const name = displayName.value.trim();
            if (!name) throw new Error("Please enter your name.");

            const { data, error } = await supabase.auth.signUp({
                email: userEmail,
                password: userPassword,
                options: {
                    data: { display_name: name },
                    emailRedirectTo: "https://anlica951-droid.github.io/LIFEOS/"
                }
            });

            if (error) throw error;

            if (data.session) {
               window.location.href = "dashboard.html";
            } else {
                feedback.style.color = "#607b63";
                feedback.textContent =
                    "Account created! Check your email to confirm your account.";
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: userPassword
            });

            if (error) throw error;
            if (data.session) window.location.href = "dashboard.html";
        }
    } catch (error) {
        feedback.style.color = "#9b594e";
        feedback.textContent = error.message;
    } finally {
        submitBtn.disabled = false;
    }
});

googleBtn.addEventListener("click", async () => {
    feedback.textContent = "";

    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin +
                   window.location.pathname.replace(/[^/]*$/, "dashboard.html")
            }
        });

        if (error) throw error;
    } catch (error) {
        feedback.textContent = error.message;
    }
});