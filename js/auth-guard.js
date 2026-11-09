
import { supabase } from "./supabase.js";

async function protectDashboard() {
    const { data: { user }, error } = await supabase.auth.getUser();

    // No valid signed-in user: return to login.
    if (error || !user) {
        window.location.replace(
            new URL("login.html", window.location.href).href
        );
        return;
    }

    // Get the user's saved profile.
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Could not load profile:", profileError.message);
    }

    // Use the profile name, then Auth metadata, then email.
    const name =
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "My Space";

    const profileName = document.querySelector(".profile-name");
    const profileAvatar = document.querySelector(".profile-avatar");

    if (profileName) {
        profileName.textContent = name;
    }

    if (profileAvatar) {
        profileAvatar.textContent = name.charAt(0).toUpperCase();
    }
}

protectDashboard();
<script type="module" src="js/signout.js"></script>