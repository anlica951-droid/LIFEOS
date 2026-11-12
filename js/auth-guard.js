
import { supabase } from "./supabase.js";

async function protectDashboard() {
    const { data: { user }, error } = await supabase.auth.getUser();

    // Redirect users who are not signed in.
    if (error || !user) {
        window.location.replace(
            new URL("login.html", window.location.href).href
        );
        return;
    }

    // Retrieve the user's saved display name.
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Could not load profile:", profileError.message);
    }

    const name =
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "My Space";

    const profileName = document.querySelector(".profile-name");
    const profileAvatar = document.querySelector(".profile-avatar");

    // Display the account name.
    if (profileName) {
        profileName.textContent = name;
    }

    // Display the initial as the default avatar.
    if (profileAvatar) {
        profileAvatar.textContent = name.charAt(0).toUpperCase();

        const photoPath = user.user_metadata?.avatar_path;

        // Retrieve the private profile photo.
        if (photoPath) {
            const { data, error: photoError } = await supabase.storage
                .from("profile-photos")
                .createSignedUrl(photoPath, 3600);

            if (photoError) {
                console.error("Could not load profile photo:", photoError.message);
            } else if (data?.signedUrl) {
                const image = document.createElement("img");

                image.src = data.signedUrl;
                image.alt = "Profile photo";
                image.style.width = "100%";
                image.style.height = "100%";
                image.style.objectFit = "cover";
                image.style.borderRadius = "50%";
                image.style.display = "block";

                profileAvatar.replaceChildren(image);
            }
        }
    }
}

protectDashboard();
