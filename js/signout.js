
import { supabase } from "./supabase.js";

const signOutBtn = document.getElementById("signOutBtn");

signOutBtn?.addEventListener("click", async () => {
    const confirmed = window.confirm(
        "Are you sure you want to sign out of LIFEOS?"
    );

    if (!confirmed) return;

    signOutBtn.disabled = true;

    const label = signOutBtn.querySelector("span");

    if (label) label.textContent = "Signing out...";

    try {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        window.location.replace(
            new URL("../login.html", import.meta.url).href
        );

    } catch (error) {
        console.error("Sign out failed:", error);

        alert("Unable to sign out. Please try again.");

        signOutBtn.disabled = false;

        if (label) label.textContent = "Sign Out";
    }
});
