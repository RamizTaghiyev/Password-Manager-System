import { setPage } from "../dom.js";
import { appState } from "../state.js";


let openSection = "account";


export function renderSettings(navigate, section) {
    if (section) {
        openSection = section;
    }

    let user = appState.loggedInUser;

    document.body.classList.add("dashboard-body");

    setPage(`
        <div class="dashboard-shell settings-shell">
            <main class="dashboard-main settings-main">

                <header class="dashboard-topbar">
                    <div>
                        <span class="settings-topbar-title">SETTINGS</span>
                    </div>

                    <button id="back-to-dashboard-button" class="secondary">← Back to Dashboard</button>
                </header>

                <p id="message"></p>

                <div class="settings-accordion">

                    <section class="settings-accordion-section">
                        <button class="settings-accordion-header" data-section="account" type="button">
                            <span class="settings-header-label">
                                <span class="settings-header-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="15.5" cy="14" r="1.2" fill="currentColor" stroke="none"/>
        <path d="M12 3a9 9 0 0 0 0 18c1.4 0 1.8-1 1.2-2-.5-.7-.2-1.6.6-1.8 3.7-1 5.2-4 5.2-6.2A9 9 0 0 0 12 3z"/>
    </svg>
</span>
                                My Account
                            </span>
                            <span class="settings-chevron">
                                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
                            </span>
                        </button>
                        <div class="settings-accordion-body">
                            <div class="settings-accordion-body-inner">
                                <label>Full name</label>
                                <input value="${escapeHtml(user.full_name)}" disabled>

                                <label>Email</label>
                                <input value="${escapeHtml(user.email || "")}" disabled>

                                <label>Role</label>
                                <input value="${escapeHtml(user.role)}" disabled>

                                <p class="change-help">
                                    Profile editing isn't available yet. Contact a Super Admin to update these details.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section class="settings-accordion-section">
                        <button class="settings-accordion-header" data-section="security" type="button">
                            <span>Security</span>
                            <span class="flyout-chevron settings-chevron">›</span>
                        </button>
                        <div class="settings-accordion-body">
                            <div class="settings-accordion-body-inner">
                                <p class="change-help">
                                    Update your master password. You'll be asked to verify with 2FA and email before it changes.
                                </p>
                                <button id="go-change-password-button">Change Password</button>
                            </div>
                        </div>
                    </section>

                    <section class="settings-accordion-section">
                        <button class="settings-accordion-header" data-section="appearance" type="button">
                            <span>Appearance</span>
                            <span class="flyout-chevron settings-chevron">›</span>
                        </button>
                        <div class="settings-accordion-body">
                            <div class="settings-accordion-body-inner">
                                <label>Theme</label>
                                <select disabled>
                                    <option>Dark (default)</option>
                                </select>
                                <p class="change-help">only dark theme for now... so...</p>
                            </div>
                        </div>
                    </section>

                </div>

            </main>
        </div>
    `);

    let sections = document.querySelectorAll(".settings-accordion-section");

    for (let sectionEl of sections) {
        let header = sectionEl.querySelector(".settings-accordion-header");
        let body = sectionEl.querySelector(".settings-accordion-body");

        if (header.dataset.section === openSection) {
            body.classList.add("open");
            header.classList.add("active");
        }

        header.addEventListener("click", function () {
            let isOpen = body.classList.contains("open");

            body.classList.toggle("open", !isOpen);
            header.classList.toggle("active", !isOpen);
            openSection = isOpen ? "" : header.dataset.section;
        });
    }

    document.getElementById("go-change-password-button").addEventListener("click", function () {
        document.body.classList.remove("dashboard-body");
        navigate("changePassword");
    });

    document.getElementById("back-to-dashboard-button").addEventListener("click", function () {
        document.body.classList.remove("dashboard-body");
        navigate("dashboard", null);
    });
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}