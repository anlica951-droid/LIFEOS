
import { supabase } from "./supabase.js";

const form = document.getElementById("profileForm");
const displayNameInput = document.getElementById("displayName");
const emailInput = document.getElementById("accountEmail");

const avatar = document.getElementById("profileAvatar");
const summaryName = document.getElementById("profileDisplayName");
const summaryEmail = document.getElementById("profileEmail");

const sidebarName = document.getElementById("sidebarName");
const sidebarAvatar = document.getElementById("sidebarAvatar");

const feedback = document.getElementById("profileFeedback");
const saveButton = document.getElementById("saveProfile");
const cancelButton = document.getElementById("cancelProfile");

const photoInput = document.getElementById("profilePhotoInput");
const choosePhotoButton = document.getElementById("choosePhotoButton");
const removePhotoButton = document.getElementById("removePhotoButton");

const BUCKET = "profile-photos";
const PHOTO_PATH = "avatar";

let currentUser = null;
let originalDisplayName = "";
let currentPhotoPath = null;
let previewUrl = null;

function showFeedback(message, type = "") {
    feedback.textContent = message;
    feedback.className = `profile-feedback ${type}`;
}

function updatePhoto(element, imageUrl, initial) {
    if (!element) return;

    if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "Profile photo";
        element.replaceChildren(image);
    } else {
        element.textContent = initial;
    }
}

function updateNameDisplay(name) {
    const cleanName = name.trim() || "My Space";
    const initial = cleanName.charAt(0).toUpperCase();

    summaryName.textContent = cleanName;

    if (sidebarName) sidebarName.textContent = cleanName;

    if (!currentPhotoPath) {
        updatePhoto(avatar, null, initial);
        updatePhoto(sidebarAvatar, null, initial);
    }

    const headerName = document.querySelector(".profile-name");
    if (headerName) headerName.textContent = cleanName;
}

async function displaySavedPhoto(path) {
    if (!path || !currentUser) {
        currentPhotoPath = null;
        const initial = (displayNameInput.value.trim() || "A")
            .charAt(0).toUpperCase();

        updatePhoto(avatar, null, initial);
        updatePhoto(sidebarAvatar, null, initial);
        return;
    }

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);

    if (error) {
        console.error("Could not load profile photo:", error.message);
        return;
    }

    currentPhotoPath = path;

    const initial = (displayNameInput.value.trim() || "A")
        .charAt(0).toUpperCase();

    updatePhoto(avatar, data.signedUrl, initial);
    updatePhoto(sidebarAvatar, data.signedUrl, initial);
}

async function loadProfile() {
    showFeedback("Loading your profile...");

    const { data: { user }, error: authError } =
        await supabase.auth.getUser();

    if (authError || !user) {
        window.location.replace("../login.html");
        return;
    }

    currentUser = user;

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile loading error:", profileError);
        showFeedback(
            "Could not load your profile. Please refresh and try again.",
            "error"
        );
        return;
    }

    const savedName =
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "";

    originalDisplayName = savedName;

    displayNameInput.value = savedName;
    emailInput.value = user.email || "";
    summaryEmail.textContent = user.email || "No email available";

    updateNameDisplay(savedName);

    await displaySavedPhoto(user.user_metadata?.avatar_path || null);

    showFeedback("Your profile details are ready to edit.");
}

async function saveProfile(event) {
    event.preventDefault();

    if (!currentUser) {
        showFeedback(
            "Your account could not be verified. Please sign in again.",
            "error"
        );
        return;
    }

    const newName = displayNameInput.value.trim();

    if (!newName) {
        showFeedback("Please enter a display name.", "error");
        displayNameInput.focus();
        return;
    }

    if (newName.length > 60) {
        showFeedback(
            "Your display name must be 60 characters or fewer.",
            "error"
        );
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
                {
                    id: currentUser.id,
                    display_name: newName
                },
                { onConflict: "id" }
            );

        if (profileError) throw profileError;

        const { data: updatedUser, error: metadataError } =
            await supabase.auth.updateUser({
                data: {
                    ...currentUser.user_metadata,
                    display_name: newName
                }
            });

        if (metadataError) throw metadataError;

        currentUser = updatedUser.user;

        originalDisplayName = newName;
        updateNameDisplay(newName);

        showFeedback(
            "Your profile has been saved successfully.",
            "success"
        );

    } catch (error) {
        console.error("Profile save error:", error);
        showFeedback(
            error.message || "Unable to save your profile. Please try again.",
            "error"
        );
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = '<i data-lucide="check"></i> Save changes';

        if (window.lucide) window.lucide.createIcons();
    }
}

function cancelChanges() {
    displayNameInput.value = originalDisplayName;
    updateNameDisplay(originalDisplayName);
    showFeedback("Your unsaved name changes have been discarded.");
}

function choosePhoto() {
    photoInput.click();
}

async function uploadPhoto(file) {
    if (!currentUser || !file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        showFeedback("Please choose a JPG, PNG, or WEBP image.", "error");
        photoInput.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showFeedback("Your photo must be 5 MB or smaller.", "error");
        photoInput.value = "";
        return;
    }

    choosePhotoButton.disabled = true;
    removePhotoButton.disabled = true;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);

    updatePhoto(avatar, previewUrl, "A");
    showFeedback("Uploading your profile photo...");

    try {
        const path = `${currentUser.id}/${PHOTO_PATH}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
                upsert: true,
                contentType: file.type,
                cacheControl: "3600"
            });

        if (uploadError) throw uploadError;

        const { data: updatedUser, error: metadataError } =
            await supabase.auth.updateUser({
                data: {
                    ...currentUser.user_metadata,
                    avatar_path: path
                }
            });

        if (metadataError) throw metadataError;

        currentUser = updatedUser.user;
        currentPhotoPath = path;

        await displaySavedPhoto(path);

        showFeedback("Your profile photo has been saved.", "success");

    } catch (error) {
        console.error("Photo upload error:", error);

        await displaySavedPhoto(currentUser.user_metadata?.avatar_path || null);

        showFeedback(
            error.message || "Could not upload your photo. Please try again.",
            "error"
        );
    } finally {
        choosePhotoButton.disabled = false;
        removePhotoButton.disabled = false;
        photoInput.value = "";

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
    }
}

async function removePhoto() {
    if (!currentUser || !currentPhotoPath) {
        showFeedback("You do not have a profile photo to remove.");
        return;
    }

    choosePhotoButton.disabled = true;
    removePhotoButton.disabled = true;

    try {
        const { error: deleteError } = await supabase.storage
            .from(BUCKET)
            .remove([currentPhotoPath]);

        if (deleteError) throw deleteError;

        const { data: updatedUser, error: metadataError } =
            await supabase.auth.updateUser({
                data: {
                    ...currentUser.user_metadata,
                    avatar_path: null
                }
            });

        if (metadataError) throw metadataError;

        currentUser = updatedUser.user;
        currentPhotoPath = null;

        const initial = (displayNameInput.value.trim() || "A")
            .charAt(0).toUpperCase();

        updatePhoto(avatar, null, initial);
        updatePhoto(sidebarAvatar, null, initial);

        showFeedback("Your profile photo has been removed.", "success");

    } catch (error) {
        console.error("Photo removal error:", error);
        showFeedback(
            error.message || "Could not remove your photo. Please try again.",
            "error"
        );
    } finally {
        choosePhotoButton.disabled = false;
        removePhotoButton.disabled = false;
    }
}

form?.addEventListener("submit", saveProfile);
cancelButton?.addEventListener("click", cancelChanges);

choosePhotoButton?.addEventListener("click", choosePhoto);

photoInput?.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (file) uploadPhoto(file);
});

removePhotoButton?.addEventListener("click", removePhoto);

loadProfile();
