import { getInputValue, setPage, showMessage } from "../../dom.js";
import { appState, clearState } from "../../state.js";
import { dash } from "./dashboardState.js";
import { escapeHtml, getInitials, getTypeOptions } from "./helpers.js";
import { closeAccountFlyout, handleModalEscape, handleOutsideFlyoutClick, hideAddPanel, hideAddProjectPanel, showAddPanel, showAddProjectPanel, toggleAccountFlyout, toggleFlyoutSettingsAccordion } from "./modals.js";
import { copyGeneratedPassword, generatePassword, togglePasswordGenerator, useGeneratedPassword } from "./passwordGenerator.js";
import { addProject, getProjectOptions, renderProjectButtons } from "./projects.js";
import { stopTotpSession } from "./totp.js";
import { addVaultItem, loadVaultItems, renderVaultItems } from "./vault.js";


export function renderDashboard(navigate, user) {
    if (user === null) {
        user = appState.loggedInUser;
    }

    document.body.classList.add("dashboard-body");

    setPage(`
        <div class="dashboard-shell">

            <aside class="dashboard-sidebar">
                <div class="brand-row">
                    <div class="brand-icon">⌑</div>
                    <div>
                        <div class="brand-name">SINAM</div>
                        <div class="brand-subtitle">CREDENTIALS</div>
                    </div>
                </div>

                <div class="sidebar-label">PROJECTS</div>

                <div id="project-list"></div>

                <button id="open-add-project-button" class="add-project-trigger" type="button">
                    <span class="flyout-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                    </span>
                    Add Project
                </button>
            </aside>


            <main class="dashboard-main">

                <header class="dashboard-topbar">
                    <div>
                        <span id="breadcrumb-project">${dash.selectedProject.toUpperCase()}</span>
                        <span class="breadcrumb-separator">›</span>
                        <span>CREDENTIALS</span>
                    </div>

                    <div class="topbar-actions">
                        <button id="open-add-button">+ Add Credential</button>

                        <div class="account-menu-wrap">
                            <button id="account-trigger" class="account-trigger" type="button">
                                <span class="account-trigger-info">
                                    <span class="account-trigger-name">${escapeHtml(user.full_name)}</span>
                                    <span class="account-trigger-role">${escapeHtml(user.role)}</span>
                                </span>
                                <span class="account-trigger-avatar">${getInitials(user.full_name)}</span>
                            </button>
<div id="account-flyout" class="account-flyout hidden" role="menu">
                                <div class="flyout-header">
                                    <span class="flyout-avatar">${getInitials(user.full_name)}</span>
                                    <div class="flyout-header-text">
                                        <div class="flyout-name">${escapeHtml(user.full_name)}</div>
                                        <div class="flyout-email">${escapeHtml(user.email || "")}</div>
                                        <span class="flyout-role-badge">${escapeHtml(user.role).toUpperCase()}</span>
                                    </div>
                                </div>

                                <div class="flyout-divider"></div>

                                <button class="flyout-accordion-toggle" id="flyout-settings-toggle" type="button">
                                    <span class="flyout-item-label">
                                        <span class="flyout-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                                                <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.8 7.8 0 0 0-1.7-1L15 3h-4l-.3 2.4a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.8 7.8 0 0 0 1.7 1L11 21h4l.3-2.4a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6z"/>
                                            </svg>
                                        </span>
                                        Account Settings
                                    </span>
                                    <span class="flyout-chevron" id="flyout-settings-chevron">
                                        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
                                    </span>
                                </button>

                                <div class="flyout-subitems" id="flyout-settings-subitems">
                                    <button class="flyout-subitem" data-section="account" type="button">My Account</button>
                                    <button class="flyout-subitem" data-section="security" type="button">Security</button>
                                    <button class="flyout-subitem" data-section="appearance" type="button">Appearance</button>
                                </div>

                                <button class="flyout-item" id="flyout-change-password" type="button">
                                    <span class="flyout-item-label">
                                        <span class="flyout-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M15.5 7.5a4 4 0 1 0-3.1 3.9l1.6 1.6h2v2h2v2h2.5v-3.5l-5-5z"/>
                                                <circle cx="7.5" cy="7.5" r="1.5"/>
                                            </svg>
                                        </span>
                                        Change Password
                                    </span>
                                </button>

                                <div class="flyout-divider"></div>

                                <button class="flyout-item" id="flyout-lock" type="button">
                                    <span class="flyout-item-label">
                                        <span class="flyout-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 0 0-6 0v2z"/>
                                            </svg>
                                        </span>
                                        Lock
                                    </span>
                                </button>

                                <button class="flyout-item flyout-item-danger" id="flyout-signout" type="button">
                                    <span class="flyout-item-label">
                                        <span class="flyout-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M16 17l5-5-5-5M21 12H9M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/>
                                            </svg>
                                        </span>
                                        Sign Out
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>


                <div id="add-panel-backdrop" class="modal-backdrop hidden">
                    <section id="add-panel" class="add-panel" role="dialog" aria-modal="true" aria-labelledby="add-panel-title">
                        <div class="modal-header-row">
                            <h2 id="add-panel-title">Add Credential</h2>
                            <button id="close-add-button" type="button" class="modal-close-button" aria-label="Close">✕</button>
                        </div>

                    <label>Project</label>
                    <select id="project_name">
                        ${getProjectOptions()}
                    </select>

                    <label>Host name</label>
                    <input id="host_name" type="text" placeholder="gm-prod-01.company.local">

                    
                    <label>Description</label>
<textarea
    id="server_description"
    class="credential-description-input"
    placeholder="Example: Production PostgreSQL database for Asan Visa backend. Owner: backend team. Rotation: every 90 days."
></textarea>

<label>Password</label>
<div class="generated-password-row">
    <input id="server_password" type="password" placeholder="Server password">
    <button id="toggle-generator-button" type="button" class="secondary generator-small-button">
        Generate
    </button>
</div>

<section id="password-generator-panel" class="password-generator-panel hidden">
    <div class="generator-header">
        <div>
            <h3>Password Generator</h3>
            <p>Create a strong server password before saving this credential.</p>
        </div>

        <span id="password_strength_badge" class="strength-badge strong">
            Strong
        </span>
    </div>

    <label>Password length</label>
    <div class="length-row">
        <input id="password_length" type="range" min="12" max="64" value="24">
        <span id="password_length_value">24</span>
    </div>

    <div class="generator-options">
        <label class="generator-check">
            <input id="include_uppercase" type="checkbox" checked>
            Uppercase letters
        </label>

        <label class="generator-check">
            <input id="include_lowercase" type="checkbox" checked>
            Lowercase letters
        </label>

        <label class="generator-check">
            <input id="include_numbers" type="checkbox" checked>
            Numbers
        </label>

        <label class="generator-check">
            <input id="include_symbols" type="checkbox" checked>
            Symbols
        </label>

        <label class="generator-check">
            <input id="avoid_ambiguous" type="checkbox" checked>
            Avoid ambiguous characters
        </label>
    </div>

    <label>Generated password</label>
    <div class="generated-output-row">
        <code id="generated_password_output"></code>
    </div>

    <div class="generator-actions">
        <button id="regenerate-password-button" type="button" class="secondary">
            Regenerate
        </button>

        <button id="use-password-button" type="button">
            Use Password
        </button>

        <button id="copy-password-button" type="button" class="secondary">
            Copy
        </button>
    </div>
</section>

<label>Type</label>
<select id="server_type">
    ${getTypeOptions()}
</select>

<label>TOTP Secret (optional)</label>
<input id="server_totp_secret" type="text" placeholder="e.g. JBSWY3DPEHPK3PXP" autocomplete="off" spellcheck="false" class="totp-secret-input">
<p class="field-hint">If this server has 2FA, paste its authenticator secret here to generate live codes from the dashboard.</p>


                    <div class="panel-actions">
                        <button id="add-button">Save Credential</button>
                        <button id="cancel-add-button" class="secondary">Cancel</button>
                    </div>
                    </section>
                </div>

                <p id="message"></p>


                <section class="dashboard-controls">
                    <input id="filter_name" type="text" placeholder="Filter host name">
                    <input id="filter_date" type="date">

                    <select id="filter_type">
                        <option value="All">All types</option>
                        ${getTypeOptions()}
                    </select>
                </section>


                <section class="view-actions">
                    <button id="list-button">List View</button>
                    <button id="tiles-button" class="secondary">Tiles View</button>
                </section>


                <section class="credentials-area">
                    <div class="host-list-card">
                        <div class="section-title-row">
                            <h2>Server Host Names</h2>
                            <span id="host-count">0</span>
                        </div>

                        <div id="vault-list"></div>
                    </div>

                    <div class="credential-detail-card">
                        <div id="credential-detail"></div>
                    </div>
                </section>
                <section id="super-admin-requests-panel" class="super-admin-requests-panel hidden"></section>

                </main>

            <div id="add-project-backdrop" class="modal-backdrop hidden">
                <section id="add-project-panel" class="add-panel add-project-panel" role="dialog" aria-modal="true" aria-labelledby="add-project-title">
                    <div class="modal-header-row">
                        <h2 id="add-project-title">Add Project</h2>
                        <button id="close-add-project-button" type="button" class="modal-close-button" aria-label="Close">✕</button>
                    </div>

                    <label>Project name</label>
                    <input id="new_project_name" type="text" placeholder="e.g. Mobile Backend">

                    <div class="panel-actions">
                        <button id="save-project-button">Save Project</button>
                        <button id="cancel-add-project-button" class="secondary">Cancel</button>
                    </div>
                </section>
            </div>

            <div id="totp-toast" class="totp-toast"></div>

        </div>
    `);

    renderProjectButtons();

document.getElementById("open-add-button").addEventListener("click", showAddPanel);
    document.getElementById("cancel-add-button").addEventListener("click", hideAddPanel);
    document.getElementById("close-add-button").addEventListener("click", hideAddPanel);

    document.getElementById("add-panel-backdrop").addEventListener("click", function (event) {
        if (event.target === this) {
            hideAddPanel();
        }
    });

    document.getElementById("add-button").addEventListener("click", addVaultItem);
    document.getElementById("toggle-generator-button").addEventListener("click", togglePasswordGenerator);
document.getElementById("regenerate-password-button").addEventListener("click", generatePassword);
document.getElementById("use-password-button").addEventListener("click", useGeneratedPassword);
document.getElementById("copy-password-button").addEventListener("click", copyGeneratedPassword);

document.getElementById("password_length").addEventListener("input", function () {
    document.getElementById("password_length_value").innerText = this.value;
    generatePassword();
});

for (let optionId of ["include_uppercase", "include_lowercase", "include_numbers", "include_symbols", "avoid_ambiguous"]) {
    document.getElementById(optionId).addEventListener("change", generatePassword);
}

    document.getElementById("filter_name").addEventListener("input", renderVaultItems);
    document.getElementById("filter_date").addEventListener("change", renderVaultItems);
    document.getElementById("filter_type").addEventListener("change", renderVaultItems);

    for (let [buttonId, mode] of [["list-button", "list"], ["tiles-button", "tiles"]]) {
        document.getElementById(buttonId).addEventListener("click", function () {
            dash.viewMode = mode;
            renderVaultItems();
        });
    }

    document.getElementById("account-trigger").addEventListener("click", function (event) {
        event.stopPropagation();
        toggleAccountFlyout();
    });

    document.getElementById("flyout-settings-toggle").addEventListener("click", function (event) {
        event.stopPropagation();
        toggleFlyoutSettingsAccordion();
    });

    function leaveDashboard() {
        closeAccountFlyout();
        stopTotpSession();
        document.body.classList.remove("dashboard-body");
    }

    for (let subitem of document.querySelectorAll(".flyout-subitem")) {
        subitem.addEventListener("click", function () {
            leaveDashboard();
            navigate("settings", subitem.dataset.section);
        });
    }

    document.getElementById("flyout-change-password").addEventListener("click", function () {
        leaveDashboard();
        navigate("changePassword");
    });

    document.getElementById("flyout-lock").addEventListener("click", function () {
        leaveDashboard();
        showMessage("Vault locked.", false);
        navigate("login");
    });

    document.getElementById("flyout-signout").addEventListener("click", function () {
        leaveDashboard();
        clearState();
        navigate("home");
    });

    document.getElementById("open-add-project-button").addEventListener("click", showAddProjectPanel);
    document.getElementById("cancel-add-project-button").addEventListener("click", hideAddProjectPanel);
    document.getElementById("close-add-project-button").addEventListener("click", hideAddProjectPanel);

    document.getElementById("add-project-backdrop").addEventListener("click", function (event) {
        if (event.target === this) {
            hideAddProjectPanel();
        }
    });

    document.getElementById("save-project-button").addEventListener("click", function () {
        let name = getInputValue("new_project_name").trim();

        if (name === "") {
            showMessage("Project name cannot be empty.");
            return;
        }

        addProject(name);
        document.getElementById("new_project_name").value = "";
    });

    document.removeEventListener("click", handleOutsideFlyoutClick);
    document.addEventListener("click", handleOutsideFlyoutClick);

    document.removeEventListener("keydown", handleModalEscape);
    document.addEventListener("keydown", handleModalEscape);

    loadVaultItems();
}

