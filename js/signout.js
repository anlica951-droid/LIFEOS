
import { supabase } from "./supabase.js";

const signOutBtn = document.getElementById("signOutBtn");

if (signOutBtn) {
    // Add modal styles
    const modalStyles = document.createElement("style");

    modalStyles.textContent = `
        .lifeos-logout-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(35, 49, 38, .35);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            opacity: 0;
            visibility: hidden;
            transition: opacity .25s ease, visibility .25s ease;
        }

        .lifeos-logout-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .lifeos-logout-modal {
            width: 100%;
            max-width: 390px;
            padding: 32px;
            border-radius: 28px;
            background: rgba(248, 250, 245, .94);
            border: 1px solid rgba(255,255,255,.9);
            box-shadow: 0 25px 80px rgba(35, 55, 39, .2);
            text-align: center;
            transform: translateY(15px) scale(.97);
            transition: transform .25s ease;
        }

        .lifeos-logout-overlay.active .lifeos-logout-modal {
            transform: translateY(0) scale(1);
        }

        .lifeos-logout-icon {
            width: 66px;
            height: 66px;
            margin: 0 auto 19px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: #e3ecdf;
            color: #425d48;
        }

        .lifeos-logout-icon svg {
            width: 27px;
            height: 27px;
            stroke: currentColor;
            fill: none;
            stroke-width: 1.8;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .lifeos-logout-modal h2 {
            margin: 0 0 10px;
            color: #344c3d;
            font-family: 'DM Sans', sans-serif;
            font-size: 22px;
            font-weight: 700;
        }

        .lifeos-logout-modal p {
            margin: 0 auto 25px;
            max-width: 280px;
            color: #7b897b;
            font-family: 'DM Sans', sans-serif;
            font-size: 13px;
            line-height: 1.7;
        }

        .lifeos-logout-actions {
            display: flex;
            gap: 11px;
        }

        .lifeos-logout-actions button {
            flex: 1;
            min-height: 47px;
            border: none;
            border-radius: 14px;
            font-family: 'DM Sans', sans-serif;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: .2s ease;
        }

        .lifeos-logout-cancel {
            background: #e6ede2;
            color: #425d48;
        }

        .lifeos-logout-cancel:hover {
            background: #dce7d7;
        }

        .lifeos-logout-confirm {
            background: linear-gradient(135deg, #708a70, #425d48);
            color: white;
            box-shadow: 0 5px 14px rgba(52,76,61,.16);
        }

        .lifeos-logout-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 18px rgba(52,76,61,.22);
        }

        .lifeos-logout-actions button:disabled {
            opacity: .6;
            cursor: not-allowed;
            transform: none;
        }

        .lifeos-logout-error {
            display: none;
            margin-top: 16px;
            padding: 10px;
            border-radius: 10px;
            background: #fff0ed;
            color: #a34e45;
            font-size: 12px;
            line-height: 1.5;
        }

        .lifeos-logout-error.show {
            display: block;
        }

        @media (max-width: 480px) {
            .lifeos-logout-modal {
                padding: 27px 22px;
                border-radius: 24px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .lifeos-logout-overlay,
            .lifeos-logout-modal {
                transition: none;
            }
        }
    `;

    document.head.appendChild(modalStyles);

    // Create modal
    const overlay = document.createElement("div");

    overlay.className = "lifeos-logout-overlay";

    overlay.innerHTML = `
        <section
            class="lifeos-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logoutTitle"
            aria-describedby="logoutDescription"
        >
            <div class="lifeos-logout-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10 17l5-5-5-5"/>
                    <path d="M15 12H3"/>
                    <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>
                </svg>
            </div>

            <h2 id="logoutTitle">Leaving so soon?</h2>

            <p id="logoutDescription">
                Are you sure you want to sign out of your LIFEOS account?
                Your saved information will remain in your account.
            </p>

            <div class="lifeos-logout-actions">
                <button
                    type="button"
                    class="lifeos-logout-cancel"
                    id="cancelLogout"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="lifeos-logout-confirm"
                    id="confirmLogout"
                >
                    Sign Out
                </button>
            </div>

            <div
                class="lifeos-logout-error"
                id="logoutError"
                role="alert"
            ></div>
        </section>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector("#cancelLogout");
    const confirmBtn = overlay.querySelector("#confirmLogout");
    const errorMessage = overlay.querySelector("#logoutError");

    let isSigningOut = false;

    // Open modal
    function openModal() {
        overlay.classList.add("active");
        cancelBtn.focus();
    }

    // Close modal
    function closeModal() {
        if (isSigningOut) return;

        overlay.classList.remove("active");
        signOutBtn.focus();

        errorMessage.classList.remove("show");
        errorMessage.textContent = "";
    }

    // Open when the sign-out button is clicked
    signOutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        openModal();
    });

    // Cancel
    cancelBtn.addEventListener("click", closeModal);

    // Close when clicking outside the modal
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    // Close using Escape
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            overlay.classList.contains("active")
        ) {
            closeModal();
        }
    });

    // Confirm sign out
    confirmBtn.addEventListener("click", async () => {
        if (isSigningOut) return;

        isSigningOut = true;

        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        signOutBtn.disabled = true;

        confirmBtn.textContent = "Signing out...";

        errorMessage.classList.remove("show");

        const originalLabel = signOutBtn.querySelector("span");

        if (originalLabel) {
            originalLabel.textContent = "Signing out...";
        }

        try {
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            window.location.replace(
                new URL("../login.html", import.meta.url).href
            );

        } catch (error) {
            console.error("Sign out failed:", error);

            isSigningOut = false;

            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
            signOutBtn.disabled = false;

            confirmBtn.textContent = "Sign Out";

            if (originalLabel) {
                originalLabel.textContent = "Sign Out";
            }

            errorMessage.textContent =
                "Unable to sign out. Please try again.";

            errorMessage.classList.add("show");
        }
    });
}
