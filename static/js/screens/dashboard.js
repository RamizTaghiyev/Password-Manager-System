import { postJson } from "../api.js";
import { setPage, getInputValue, showMessage } from "../dom.js";
import { clearState, appState } from "../state.js";


let viewMode = "list";
let vaultItems = [];
let revealed = {};
let passwordChangeRequests = {};
let generatedPassword = "";

let selectedProject = "GoMap";
let selectedVaultId = "";

let totpActiveVaultId = null;
let totpCode = "";
let totpPeriod = 30;
let totpTickHandle = null;
let totpRefreshTimeoutHandle = null;
let totpDeadlineMs = 0;

const CRED_TYPES = ["Database", "API Server", "VPN", "Backup Server", "Server"];

const STAMINA_RADIUS = 52;
const STAMINA_CIRCUMFERENCE = 2 * Math.PI * STAMINA_RADIUS;

const PROJECTS = [
    {
        name: "Asan Visa",
        prefixes: ["av-", "asan"]
    },
    {
        name: "GoMap",
        prefixes: ["gm-", "gomap"]
    },
    {
        name: "e-Tender",
        prefixes: ["et-", "tender"]
    },
    {
        name: "EduNet",
        prefixes: ["edu-", "edunet"]
    },
    {
        name: "Internal Systems",
        prefixes: ["int-", "internal"]
    }
];


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
                        <span id="breadcrumb-project">${selectedProject.toUpperCase()}</span>
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

document.getElementById("include_uppercase").addEventListener("change", generatePassword);
document.getElementById("include_lowercase").addEventListener("change", generatePassword);
document.getElementById("include_numbers").addEventListener("change", generatePassword);
document.getElementById("include_symbols").addEventListener("change", generatePassword);
document.getElementById("avoid_ambiguous").addEventListener("change", generatePassword);

    document.getElementById("filter_name").addEventListener("input", renderVaultItems);
    document.getElementById("filter_date").addEventListener("change", renderVaultItems);
    document.getElementById("filter_type").addEventListener("change", renderVaultItems);

    document.getElementById("list-button").addEventListener("click", function () {
        viewMode = "list";
        renderVaultItems();
    });

    document.getElementById("tiles-button").addEventListener("click", function () {
        viewMode = "tiles";
        renderVaultItems();
    });

    document.getElementById("account-trigger").addEventListener("click", function (event) {
        event.stopPropagation();
        toggleAccountFlyout();
    });

    document.getElementById("flyout-settings-toggle").addEventListener("click", function (event) {
        event.stopPropagation();
        toggleFlyoutSettingsAccordion();
    });

    let flyoutSubitems = document.querySelectorAll(".flyout-subitem");

    for (let subitem of flyoutSubitems) {
        subitem.addEventListener("click", function () {
            let section = subitem.dataset.section;
            closeAccountFlyout();
            stopTotpSession();
            document.body.classList.remove("dashboard-body");
            navigate("settings", section);
        });
    }

    document.getElementById("flyout-change-password").addEventListener("click", function () {
        closeAccountFlyout();
        stopTotpSession();
        document.body.classList.remove("dashboard-body");
        navigate("changePassword");
    });

    document.getElementById("flyout-lock").addEventListener("click", function () {
        closeAccountFlyout();
        stopTotpSession();
        document.body.classList.remove("dashboard-body");
        showMessage("Vault locked.", false);
        navigate("login");
    });

    document.getElementById("flyout-signout").addEventListener("click", function () {
        closeAccountFlyout();
        stopTotpSession();
        document.body.classList.remove("dashboard-body");
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


async function loadVaultItems() {
    let user = appState.loggedInUser;

    let response = await fetch("/api/vault-items?users_id=" + user.users_id);
    let result = await response.json();

    if (!response.ok) {
        showMessage(result.error);
        return;
    }

    vaultItems = result.items;
    revealed = {};

    await loadPasswordChangeRequests();

    renderProjectButtons();
    renderVaultItems();
}


async function addVaultItem() {
    let user = appState.loggedInUser;

    let projectName = getInputValue("project_name");
    let hostName = getInputValue("host_name");
    let description = getInputValue("server_description");
    let password = getInputValue("server_password");
    let type = getInputValue("server_type");
    let totpSecret = getInputValue("server_totp_secret");

    try {
        let result = await postJson("/api/vault-items", {
            users_id: user.users_id,
            host_name: hostName,
            description: description,
            password: password,
            type: type,
            totp_secret: totpSecret
        });

        saveProject(result.vault_id, projectName);

        selectedProject = projectName;
        selectedVaultId = result.vault_id;

        document.getElementById("host_name").value = "";
        document.getElementById("server_description").value = "";
        document.getElementById("server_password").value = "";
        document.getElementById("server_totp_secret").value = "";

        hideAddPanel();

        showMessage("Credential saved.", false);

        loadVaultItems();

    } catch (error) {
        showMessage(error.message);
    }
}


function renderProjectButtons() {
    let container = document.getElementById("project-list");

    if (container === null) {
        return;
    }

    let html = "";

    for (let project of PROJECTS) {
        let activeClass = "";

        if (project.name === selectedProject) {
            activeClass = "active";
        }

        html += `
            <button class="project-button ${activeClass}" data-project="${project.name}">
                <span>▱ ${project.name}</span>
                <b>${countProjectItems(project.name)}</b>
            </button>
        `;
    }

    container.innerHTML = html;

    let buttons = document.querySelectorAll(".project-button");

    for (let button of buttons) {
        button.addEventListener("click", function () {
            selectedProject = button.dataset.project;
            selectedVaultId = "";
            renderProjectButtons();
            renderVaultItems();
        });
    }
}


function getFilteredItems() {
    let nameFilter = getInputValue("filter_name").toLowerCase();
    let dateFilter = getInputValue("filter_date");
    let typeFilter = getInputValue("filter_type");

    let filteredItems = [];

    for (let item of vaultItems) {
        let itemProject = getProjectName(item);
        let itemDate = item.created_at.split(" ")[0];

        let projectMatches = itemProject === selectedProject;
        let nameMatches = item.host_name.toLowerCase().includes(nameFilter);
        let dateMatches = dateFilter === "" || itemDate === dateFilter;
        let typeMatches = typeFilter === "All" || item.type === typeFilter;

        if (projectMatches && nameMatches && dateMatches && typeMatches) {
            filteredItems.push(item);
        }
    }

    return filteredItems;
}


function renderVaultItems() {
    let items = getFilteredItems();

    document.getElementById("breadcrumb-project").innerText = selectedProject.toUpperCase();
    document.getElementById("host-count").innerText = items.length;

    document.getElementById("list-button").classList.toggle("secondary", viewMode !== "list");
    document.getElementById("tiles-button").classList.toggle("secondary", viewMode !== "tiles");

    let selectedStillExists = false;

    for (let item of items) {
        if (item.vault_id === selectedVaultId) {
            selectedStillExists = true;
        }
    }

    if (!selectedStillExists) {
        selectedVaultId = "";
    }

    if (totpActiveVaultId !== null && totpActiveVaultId !== selectedVaultId) {
        stopTotpSession();
    }

    if (viewMode === "list") {
        renderHostList(items);
    } else {
        renderHostTiles(items);
    }

    renderCredentialDetail();
    renderSuperAdminRequests();

    addHostEvents();
    addRevealEvents();
    addServerPasswordRequestEvents();
    addServerPasswordUpdateEvents();
    addSuperAdminReviewEvents();
    addTotpEvents();

    if (totpActiveVaultId !== null && totpActiveVaultId === selectedVaultId) {
        animateStaminaWheel();
        updateStaminaSecondsLabel();
    }
}


function renderHostList(items) {
    let container = document.getElementById("vault-list");

    if (items.length === 0) {
        container.innerHTML = `<p class="empty-text">No server hosts in this project.</p>`;
        return;
    }

    let html = `
        <table class="host-table">
            <tr>
                <th>Host Name</th>
                <th>Type</th>
                <th>Date Added</th>
            </tr>
    `;

    for (let item of items) {
        let activeClass = "";

        if (item.vault_id === selectedVaultId) {
            activeClass = "selected-row";
        }

        html += `
            <tr class="host-row ${activeClass}" data-id="${item.vault_id}">
                <td class="host-name">${escapeHtml(item.host_name)}</td>
                <td>${escapeHtml(item.type)}</td>
                <td class="date-text">${escapeHtml(item.created_at)}</td>
            </tr>
        `;
    }

    html += "</table>";

    container.innerHTML = html;
}


function renderHostTiles(items) {
    let container = document.getElementById("vault-list");

    if (items.length === 0) {
        container.innerHTML = `<p class="empty-text">No server hosts in this project.</p>`;
        return;
    }

    let html = `<div class="host-tiles">`;

    for (let item of items) {
        let activeClass = "";

        if (item.vault_id === selectedVaultId) {
            activeClass = "selected-tile";
        }

        html += `
            <button class="host-tile ${activeClass}" data-id="${item.vault_id}">
                <div class="tile-type">${escapeHtml(item.type)}</div>
                <h3>${escapeHtml(item.host_name)}</h3>
                <p>${escapeHtml(item.created_at)}</p>
            </button>
        `;
    }

    html += `</div>`;

    container.innerHTML = html;
}


function renderCredentialDetail() {
    let container = document.getElementById("credential-detail");

    if (selectedVaultId === "") {
        container.innerHTML = `
            <div class="empty-detail">
                <h2>Select a server host</h2>
                <p>Click a host name from the selected project to view its credentials.</p>
            </div>
        `;
        return;
    }

    let item = getItemById(selectedVaultId);

    if (item === null) {
        container.innerHTML = `
            <div class="empty-detail">
                <h2>Credential not found</h2>
            </div>
        `;
        return;
    }

    let passwordText = "••••••••••••";
    let revealText = "Reveal";

    if (revealed[item.vault_id] !== undefined) {
        passwordText = revealed[item.vault_id];
        revealText = "Hide";
    }

    container.innerHTML = `
        <div class="detail-header">
            <div>
                <p class="detail-label">SELECTED SERVER</p>
                <h2>${escapeHtml(item.host_name)}</h2>
            </div>

            <span class="detail-badge">${escapeHtml(item.type)}</span>
        </div>

        <div class="detail-grid">
            <div>
                <p class="detail-label">Project</p>
                <p>${escapeHtml(getProjectName(item))}</p>
            </div>

            <div>
                <p class="detail-label">Type</p>
                <p>${escapeHtml(item.type)}</p>
            </div>

            <div>
                <p class="detail-label">Date Added</p>
                <p>${escapeHtml(item.created_at)}</p>
            </div>

            <div>
                <p class="detail-label">Updated At</p>
                <p>${escapeHtml(item.updated_at)}</p>
            </div>

            <div class="description-detail">
                <p class="detail-label">Description</p>
                <p>${escapeHtml(item.description || "No description added.")}</p>
            </div>

        </div>

        <div class="password-box">
            <p class="detail-label">Password</p>
            <div class="password-row">
                <code>${escapeHtml(passwordText)}</code>
                <button class="reveal-button" data-id="${item.vault_id}">
                    ${revealText}
                </button>
            </div>
        </div>

        ${getTotpBoxHtml(item)}

        ${getServerPasswordChangeHtml(item)}
    `;
}


function addHostEvents() {
    let rows = document.querySelectorAll(".host-row");
    let tiles = document.querySelectorAll(".host-tile");

    for (let row of rows) {
        row.addEventListener("click", function () {
            selectedVaultId = row.dataset.id;
            renderVaultItems();
        });
    }

    for (let tile of tiles) {
        tile.addEventListener("click", function () {
            selectedVaultId = tile.dataset.id;
            renderVaultItems();
        });
    }
}

function getTotpBoxHtml(item) {
    if (!item.has_totp) {
        return `
            <div class="totp-box">
                <p class="detail-label">One-Time Code (TOTP)</p>
                <p class="change-help">
                    No authenticator secret is linked to this credential yet. Add one to
                    generate live 2FA codes for this server without leaving the dashboard.
                </p>

                <label>Authenticator secret</label>
                <input
                    id="new_totp_secret"
                    type="text"
                    placeholder="e.g. JBSWY3DPEHPK3PXP"
                    autocomplete="off"
                    spellcheck="false"
                    class="totp-secret-input"
                >

                <button class="save-totp-secret-button" data-id="${item.vault_id}">
                    Save TOTP Secret
                </button>
            </div>
        `;
    }

    let isActive = totpActiveVaultId === item.vault_id && totpCode !== "";

    if (!isActive) {
        return `
            <div class="totp-box">
                <p class="detail-label">One-Time Code (TOTP)</p>
                <p class="change-help">Generate a live 6-digit code for this server's 2FA.</p>

                <button class="generate-totp-button" data-id="${item.vault_id}">
                    Generate TOTP
                </button>
            </div>
        `;
    }

    return `
        <div class="totp-box">
            <p class="detail-label">One-Time Code (TOTP)</p>

            <div class="totp-active-row">
                <div class="stamina-wheel" id="stamina-wheel">
                    <svg viewBox="0 0 120 120" class="stamina-wheel-svg">
                        <circle class="stamina-track" cx="60" cy="60" r="${STAMINA_RADIUS}"></circle>
                        <circle
                            class="stamina-fill"
                            id="stamina-fill"
                            cx="60" cy="60" r="${STAMINA_RADIUS}"
                            style="stroke-dasharray:${STAMINA_CIRCUMFERENCE};stroke-dashoffset:0;"
                        ></circle>
                    </svg>

                    <div class="stamina-wheel-center">
                        <span class="stamina-code">${escapeHtml(formatTotpCode(totpCode))}</span>
                        <span class="stamina-seconds" id="stamina-seconds">${totpPeriod}s</span>
                    </div>
                </div>

                <div class="totp-active-actions">
                    <p class="change-help">Code refreshes automatically every ${totpPeriod} seconds.</p>

                    <button class="copy-totp-button" data-id="${item.vault_id}">
                        Copy Code
                    </button>

                    <button class="stop-totp-button secondary" data-id="${item.vault_id}">
                        Hide
                    </button>
                </div>
            </div>
        </div>
    `;
}


function formatTotpCode(code) {
    if (code.length !== 6) {
        return code;
    }

    return code.slice(0, 3) + " " + code.slice(3);
}


function addTotpEvents() {
    let generateButtons = document.querySelectorAll(".generate-totp-button");
    let copyButtons = document.querySelectorAll(".copy-totp-button");
    let stopButtons = document.querySelectorAll(".stop-totp-button");
    let saveSecretButtons = document.querySelectorAll(".save-totp-secret-button");

    for (let button of generateButtons) {
        button.addEventListener("click", function () {
            startTotpForVault(button.dataset.id);
        });
    }

    for (let button of copyButtons) {
        button.addEventListener("click", function () {
            copyTotpCode();
        });
    }

    for (let button of stopButtons) {
        button.addEventListener("click", function () {
            stopTotpSession();
            renderCredentialDetail();
            addTotpEvents();
        });
    }

    for (let button of saveSecretButtons) {
        button.addEventListener("click", async function () {
            await saveTotpSecretForVault(button.dataset.id);
        });
    }
}


async function saveTotpSecretForVault(vaultId) {
    let user = appState.loggedInUser;
    let secret = getInputValue("new_totp_secret");

    try {
        let result = await postJson("/api/vault-items/set-totp-secret", {
            users_id: user.users_id,
            vault_id: vaultId,
            totp_secret: secret
        });

        showMessage(result.message, false);

        await loadVaultItems();

    } catch (error) {
        showMessage(error.message);
    }
}


async function startTotpForVault(vaultId) {
    let user = appState.loggedInUser;

    try {
        let result = await postJson("/api/vault-items/generate-totp", {
            users_id: user.users_id,
            vault_id: vaultId
        });

        totpActiveVaultId = vaultId;
        totpCode = result.code;
        totpPeriod = result.period;
        totpDeadlineMs = Date.now() + (result.seconds_remaining * 1000);

        renderCredentialDetail();
        addTotpEvents();
        startTotpTimers();

    } catch (error) {
        showMessage(error.message);
    }
}


async function refreshTotpForVault(vaultId) {
    let user = appState.loggedInUser;

    try {
        let result = await postJson("/api/vault-items/generate-totp", {
            users_id: user.users_id,
            vault_id: vaultId
        });

        if (totpActiveVaultId !== vaultId) {
            return;
        }

        totpCode = result.code;
        totpPeriod = result.period;
        totpDeadlineMs = Date.now() + (result.seconds_remaining * 1000);

        renderCredentialDetail();
        addTotpEvents();
        startTotpTimers();

    } catch (error) {
        stopTotpSession();
        renderCredentialDetail();
        addTotpEvents();
        showMessage(error.message);
    }
}


function startTotpTimers() {
    stopTotpTimers();

    updateStaminaSecondsLabel();
    animateStaminaWheel();

    totpTickHandle = setInterval(updateStaminaSecondsLabel, 250);

    let remainingMs = Math.max(totpDeadlineMs - Date.now(), 0);

    totpRefreshTimeoutHandle = setTimeout(function () {
        refreshTotpForVault(totpActiveVaultId);
    }, remainingMs);
}


function stopTotpTimers() {
    if (totpTickHandle !== null) {
        clearInterval(totpTickHandle);
        totpTickHandle = null;
    }

    if (totpRefreshTimeoutHandle !== null) {
        clearTimeout(totpRefreshTimeoutHandle);
        totpRefreshTimeoutHandle = null;
    }
}


function stopTotpSession() {
    stopTotpTimers();
    totpActiveVaultId = null;
    totpCode = "";
}


function animateStaminaWheel() {
    let fill = document.getElementById("stamina-fill");

    if (fill === null) {
        return;
    }

    let remainingMs = Math.max(totpDeadlineMs - Date.now(), 0);

    fill.style.transition = "none";
    fill.style.strokeDashoffset = "0";

    // Force a reflow so the browser registers the reset before animating.
    fill.getBoundingClientRect();

    fill.style.transition = "stroke-dashoffset " + (remainingMs / 1000) + "s linear";
    fill.style.strokeDashoffset = String(STAMINA_CIRCUMFERENCE);
}


function updateStaminaSecondsLabel() {
    let label = document.getElementById("stamina-seconds");
    let wheel = document.getElementById("stamina-wheel");

    if (label === null || wheel === null) {
        return;
    }

    let remainingMs = Math.max(totpDeadlineMs - Date.now(), 0);
    let remainingSeconds = Math.ceil(remainingMs / 1000);

    label.innerText = remainingSeconds + "s";

    wheel.classList.remove("stamina-warning", "stamina-critical");

    if (remainingSeconds <= 5) {
        wheel.classList.add("stamina-critical");
    } else if (remainingSeconds <= 12) {
        wheel.classList.add("stamina-warning");
    }
}


async function copyTotpCode() {
    if (totpCode === "") {
        return;
    }

    try {
        await navigator.clipboard.writeText(totpCode);
        showTotpToast("Code copied to clipboard");
    } catch (error) {
        showMessage("Could not copy code. Copy it manually.");
    }
}


function showTotpToast(text) {
    let toast = document.getElementById("totp-toast");

    if (toast === null) {
        return;
    }

    toast.innerText = text;
    toast.classList.add("visible");

    clearTimeout(toast._hideHandle);

    toast._hideHandle = setTimeout(function () {
        toast.classList.remove("visible");
    }, 2200);
}

function addRevealEvents() {
    let buttons = document.querySelectorAll(".reveal-button");

    for (let button of buttons) {
        button.addEventListener("click", async function () {
            let vaultId = button.dataset.id;
            await toggleReveal(vaultId);
        });
    }
}


async function toggleReveal(vaultId) {
    if (revealed[vaultId] !== undefined) {
        delete revealed[vaultId];
        renderVaultItems();
        return;
    }

    let user = appState.loggedInUser;

    try {
        let result = await postJson("/api/vault-items/reveal", {
            users_id: user.users_id,
            vault_id: vaultId
        });

        revealed[vaultId] = result.password;
        renderVaultItems();

    } catch (error) {
        showMessage(error.message);
    }
}

async function loadPasswordChangeRequests() {
    let user = appState.loggedInUser;

    try {
        let response = await fetch(
            "/api/server-password-change-requests?users_id=" + user.users_id
        );

        let result = await response.json();

        if (!response.ok) {
            passwordChangeRequests = {};
            return;
        }

        passwordChangeRequests = {};

        for (let request of result.requests) {
            if (passwordChangeRequests[request.vault_id] === undefined) {
                passwordChangeRequests[request.vault_id] = [];
            }

            passwordChangeRequests[request.vault_id].push(request);
        }

    } catch (error) {
        passwordChangeRequests = {};
    }
}


function getLatestRequestForVault(vaultId) {
    let requests = passwordChangeRequests[vaultId];

    if (requests === undefined || requests.length === 0) {
        return null;
    }

    return requests[0];
}


function getServerPasswordChangeHtml(item) {
    let request = getLatestRequestForVault(item.vault_id);

    if (request === null || request.status === "rejected" || request.status === "completed") {
        let rejectedMessage = "";

        if (request !== null && request.status === "rejected") {
            rejectedMessage = `
                <div class="request-status rejected">
                    <b>Rejected by Super Admin.</b>
                    <p>${escapeHtml(request.review_note || "No reason provided.")}</p>
                </div>
            `;
        }

        return `
            <div class="server-password-change-box">
                <p class="detail-label">Change Server Password</p>
                <p class="change-help">
                    You cannot change this server password directly. First send a request to Super Admin.
                </p>

                ${rejectedMessage}

                <label>Reason for password change</label>
                <textarea id="password_change_reason" placeholder="Example: server password rotation, employee left the project, suspected compromise"></textarea>

                <button class="request-server-password-change-button" data-id="${item.vault_id}">
                    Request Password Change
                </button>
            </div>
        `;
    }

    if (request.status === "pending") {
        return `
            <div class="server-password-change-box">
                <p class="detail-label">Change Server Password</p>

                <div class="request-status pending">
                    <b>Pending Super Admin approval.</b>
                    <p>Your request was sent on ${escapeHtml(request.created_at)}.</p>
                </div>
            </div>
        `;
    }

    if (request.status === "approved") {
        return `
            <div class="server-password-change-box">
                <p class="detail-label">Change Server Password</p>

                <div class="request-status approved">
                    <b>Approved by Super Admin.</b>
                    <p>You can now change this server password.</p>
                </div>

                <label>New server password</label>
                <input id="new_server_password" type="password">

                <label>Confirm new server password</label>
                <input id="confirm_new_server_password" type="password">

                <button class="update-server-password-button" data-id="${item.vault_id}">
                    Update Server Password
                </button>
            </div>
        `;
    }

    return "";
}


function addServerPasswordRequestEvents() {
    let buttons = document.querySelectorAll(".request-server-password-change-button");

    for (let button of buttons) {
        button.addEventListener("click", async function () {
            let vaultId = button.dataset.id;
            await requestServerPasswordChange(vaultId);
        });
    }
}


async function requestServerPasswordChange(vaultId) {
    let user = appState.loggedInUser;
    let reason = getInputValue("password_change_reason");

    try {
        let result = await postJson("/api/server-password-change-requests", {
            users_id: user.users_id,
            vault_id: vaultId,
            reason: reason
        });

        showMessage(result.message, false);

        await loadVaultItems();

    } catch (error) {
        showMessage(error.message);
    }
}


function addServerPasswordUpdateEvents() {
    let buttons = document.querySelectorAll(".update-server-password-button");

    for (let button of buttons) {
        button.addEventListener("click", async function () {
            let vaultId = button.dataset.id;
            await updateServerPassword(vaultId);
        });
    }
}


async function updateServerPassword(vaultId) {
    let user = appState.loggedInUser;

    let newPassword = getInputValue("new_server_password");
    let confirmNewPassword = getInputValue("confirm_new_server_password");

    try {
        let result = await postJson("/api/vault-items/change-server-password", {
            users_id: user.users_id,
            vault_id: vaultId,
            new_password: newPassword,
            confirm_new_password: confirmNewPassword
        });

        showMessage(result.message, false);

        await loadVaultItems();

    } catch (error) {
        showMessage(error.message);
    }
}


function renderSuperAdminRequests() {
    let panel = document.getElementById("super-admin-requests-panel");

    if (panel === null) {
        return;
    }

    let user = appState.loggedInUser;

    if (user.role !== "super_admin") {
        panel.classList.add("hidden");
        panel.innerHTML = "";
        return;
    }

    let allRequests = [];

    for (let vaultId in passwordChangeRequests) {
        for (let request of passwordChangeRequests[vaultId]) {
            if (request.status === "pending") {
                allRequests.push(request);
            }
        }
    }

    if (allRequests.length === 0) {
        panel.classList.remove("hidden");
        panel.innerHTML = `
            <div class="section-title-row">
                <h2>Super Admin Requests</h2>
                <span>0</span>
            </div>
            <p class="empty-text">No pending password change requests.</p>
        `;
        return;
    }

    let html = `
        <div class="section-title-row">
            <h2>Super Admin Requests</h2>
            <span>${allRequests.length}</span>
        </div>

        <div class="request-list">
    `;

    for (let request of allRequests) {
        html += `
            <div class="request-card">
                <div>
                    <p class="detail-label">SERVER</p>
                    <h3>${escapeHtml(request.host_name)}</h3>
                    <p>
                        Requested by:
                        <b>${escapeHtml(request.requested_by_name)}</b>
                        (${escapeHtml(request.requested_by_email)})
                    </p>
                    <p>Reason: ${escapeHtml(request.reason || "No reason provided.")}</p>
                    <p class="date-text">${escapeHtml(request.created_at)}</p>
                </div>

                <div class="request-actions">
                    <input
                        id="review_note_${request.request_id}"
                        type="text"
                        placeholder="Optional review note"
                    >

                    <button
                        class="approve-request-button"
                        data-id="${request.request_id}"
                    >
                        Approve
                    </button>

                    <button
                        class="reject-request-button danger"
                        data-id="${request.request_id}"
                    >
                        Reject
                    </button>
                </div>
            </div>
        `;
    }

    html += `
        </div>
    `;

    panel.classList.remove("hidden");
    panel.innerHTML = html;
}


function addSuperAdminReviewEvents() {
    let approveButtons = document.querySelectorAll(".approve-request-button");
    let rejectButtons = document.querySelectorAll(".reject-request-button");

    for (let button of approveButtons) {
        button.addEventListener("click", async function () {
            await reviewPasswordChangeRequest(button.dataset.id, "approved");
        });
    }

    for (let button of rejectButtons) {
        button.addEventListener("click", async function () {
            await reviewPasswordChangeRequest(button.dataset.id, "rejected");
        });
    }
}


async function reviewPasswordChangeRequest(requestId, decision) {
    let user = appState.loggedInUser;
    let reviewNoteInput = document.getElementById("review_note_" + requestId);
    let reviewNote = "";

    if (reviewNoteInput !== null) {
        reviewNote = reviewNoteInput.value;
    }

    try {
        let result = await postJson("/api/server-password-change-requests/review", {
            super_admin_id: user.users_id,
            request_id: requestId,
            decision: decision,
            review_note: reviewNote
        });

        showMessage(result.message, false);

        await loadVaultItems();

    } catch (error) {
        showMessage(error.message);
    }
}

function togglePasswordGenerator() {
    let panel = document.getElementById("password-generator-panel");

    if (panel.classList.contains("hidden")) {
        panel.classList.remove("hidden");
        generatePassword();
    } else {
        panel.classList.add("hidden");
    }
}


function generatePassword() {
    let length = Number(getInputValue("password_length"));

    let includeUppercase = document.getElementById("include_uppercase").checked;
    let includeLowercase = document.getElementById("include_lowercase").checked;
    let includeNumbers = document.getElementById("include_numbers").checked;
    let includeSymbols = document.getElementById("include_symbols").checked;
    let avoidAmbiguous = document.getElementById("avoid_ambiguous").checked;

    let uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let lowercase = "abcdefghijklmnopqrstuvwxyz";
    let numbers = "0123456789";
    let symbols = "!@#$%^&*()-_=+[]{};:,.<>?";

    if (avoidAmbiguous) {
        uppercase = removeAmbiguousCharacters(uppercase);
        lowercase = removeAmbiguousCharacters(lowercase);
        numbers = removeAmbiguousCharacters(numbers);
    }

    let characterSets = [];
    let allCharacters = "";

    if (includeUppercase) {
        characterSets.push(uppercase);
        allCharacters += uppercase;
    }

    if (includeLowercase) {
        characterSets.push(lowercase);
        allCharacters += lowercase;
    }

    if (includeNumbers) {
        characterSets.push(numbers);
        allCharacters += numbers;
    }

    if (includeSymbols) {
        characterSets.push(symbols);
        allCharacters += symbols;
    }

    if (allCharacters.length === 0) {
        showMessage("Select at least one password character type.");
        return;
    }

    let passwordCharacters = [];

    for (let set of characterSets) {
        passwordCharacters.push(getSecureRandomCharacter(set));
    }

    while (passwordCharacters.length < length) {
        passwordCharacters.push(getSecureRandomCharacter(allCharacters));
    }

    passwordCharacters = secureShuffle(passwordCharacters);

    generatedPassword = passwordCharacters.join("");

    document.getElementById("generated_password_output").innerText = generatedPassword;

    updatePasswordStrengthBadge(generatedPassword, characterSets.length);
}


function removeAmbiguousCharacters(value) {
    return value
        .replaceAll("0", "")
        .replaceAll("O", "")
        .replaceAll("o", "")
        .replaceAll("1", "")
        .replaceAll("I", "")
        .replaceAll("l", "");
}


function getSecureRandomCharacter(characters) {
    let randomIndex = getSecureRandomNumber(characters.length);
    return characters[randomIndex];
}


function getSecureRandomNumber(max) {
    let array = new Uint32Array(1);
    crypto.getRandomValues(array);

    return array[0] % max;
}


function secureShuffle(items) {
    let result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
        let j = getSecureRandomNumber(i + 1);
        let temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }

    return result;
}


function updatePasswordStrengthBadge(password, usedSetCount) {
    let badge = document.getElementById("password_strength_badge");

    let score = 0;

    if (password.length >= 12) {
        score++;
    }

    if (password.length >= 18) {
        score++;
    }

    if (password.length >= 24) {
        score++;
    }

    if (usedSetCount >= 3) {
        score++;
    }

    if (usedSetCount >= 4) {
        score++;
    }

    badge.classList.remove("weak", "medium", "strong");

    if (score <= 2) {
        badge.innerText = "Weak";
        badge.classList.add("weak");
        return;
    }

    if (score <= 4) {
        badge.innerText = "Medium";
        badge.classList.add("medium");
        return;
    }

    badge.innerText = "Strong";
    badge.classList.add("strong");
}


function useGeneratedPassword() {
    if (generatedPassword === "") {
        generatePassword();
    }

    document.getElementById("server_password").value = generatedPassword;
    showMessage("Generated password inserted.", false);
}


async function copyGeneratedPassword() {
    if (generatedPassword === "") {
        generatePassword();
    }

    try {
        await navigator.clipboard.writeText(generatedPassword);
        showMessage("Generated password copied.", false);
    } catch (error) {
        showMessage("Could not copy password. Use the generated password manually.");
    }
}

function showAddPanel() {
    let backdrop = document.getElementById("add-panel-backdrop");

    backdrop.classList.remove("hidden");
    document.body.classList.add("modal-open");

    document.getElementById("project_name").value = selectedProject;

    // Force layout so the transition below actually animates in.
    backdrop.getBoundingClientRect();

    requestAnimationFrame(function () {
        backdrop.classList.add("visible");
    });
}


function hideAddPanel() {
    let backdrop = document.getElementById("add-panel-backdrop");

    if (backdrop.classList.contains("hidden")) {
        return;
    }

    backdrop.classList.remove("visible");
    document.body.classList.remove("modal-open");

    setTimeout(function () {
        backdrop.classList.add("hidden");
    }, 220);
}


function handleModalEscape(event) {
    if (event.key !== "Escape") {
        return;
    }

    let addBackdrop = document.getElementById("add-panel-backdrop");
    let projectBackdrop = document.getElementById("add-project-backdrop");

    if (addBackdrop !== null && addBackdrop.classList.contains("visible")) {
        hideAddPanel();
    }

    if (projectBackdrop !== null && projectBackdrop.classList.contains("visible")) {
        hideAddProjectPanel();
    }

    closeAccountFlyout();
}


function showAddProjectPanel() {
    let backdrop = document.getElementById("add-project-backdrop");

    backdrop.classList.remove("hidden");
    document.body.classList.add("modal-open");

    backdrop.getBoundingClientRect();

    requestAnimationFrame(function () {
        backdrop.classList.add("visible");
    });
}


function hideAddProjectPanel() {
    let backdrop = document.getElementById("add-project-backdrop");

    if (backdrop.classList.contains("hidden")) {
        return;
    }

    backdrop.classList.remove("visible");
    document.body.classList.remove("modal-open");

    setTimeout(function () {
        backdrop.classList.add("hidden");
    }, 220);
}


function addProject(name) {
    let alreadyExists = PROJECTS.some(function (project) {
        return project.name.toLowerCase() === name.toLowerCase();
    });

    if (alreadyExists) {
        showMessage("A project with that name already exists.");
        return;
    }

    let slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    PROJECTS.push({
        name: name,
        prefixes: [slug + "-"]
    });

    selectedProject = name;
    selectedVaultId = "";

    hideAddProjectPanel();
    renderProjectButtons();
    renderVaultItems();
    showMessage("Project added.", false);
}


function toggleAccountFlyout() {
    let flyout = document.getElementById("account-flyout");

    if (flyout.classList.contains("visible")) {
        closeAccountFlyout();
    } else {
        openAccountFlyout();
    }
}


function openAccountFlyout() {
    let flyout = document.getElementById("account-flyout");

    flyout.classList.remove("hidden");

    flyout.getBoundingClientRect();

    requestAnimationFrame(function () {
        flyout.classList.add("visible");
    });
}


function closeAccountFlyout() {
    let flyout = document.getElementById("account-flyout");

    if (flyout === null || !flyout.classList.contains("visible")) {
        return;
    }

    flyout.classList.remove("visible");

    setTimeout(function () {
        flyout.classList.add("hidden");
    }, 180);
}


function toggleFlyoutSettingsAccordion() {
    let subitems = document.getElementById("flyout-settings-subitems");
    let chevron = document.getElementById("flyout-settings-chevron");

    subitems.classList.toggle("open");
    chevron.classList.toggle("rotated");
}


function handleOutsideFlyoutClick(event) {
    let flyout = document.getElementById("account-flyout");
    let trigger = document.getElementById("account-trigger");

    if (flyout === null || trigger === null) {
        return;
    }

    if (!flyout.contains(event.target) && !trigger.contains(event.target)) {
        closeAccountFlyout();
    }
}


function getItemById(vaultId) {
    for (let item of vaultItems) {
        if (item.vault_id === vaultId) {
            return item;
        }
    }

    return null;
}


function countProjectItems(projectName) {
    let count = 0;

    for (let item of vaultItems) {
        if (getProjectName(item) === projectName) {
            count++;
        }
    }

    return count;
}


function saveProject(vaultId, projectName) {
    localStorage.setItem("vault_project_" + vaultId, projectName);
}


function getProjectName(item) {
    let savedProject = localStorage.getItem("vault_project_" + item.vault_id);

    if (savedProject !== null) {
        return savedProject;
    }

    let host = item.host_name.toLowerCase();

    for (let project of PROJECTS) {
        for (let prefix of project.prefixes) {
            if (host.includes(prefix)) {
                return project.name;
            }
        }
    }

    return "Internal Systems";
}


function getProjectOptions() {
    let html = "";

    for (let project of PROJECTS) {
        html += `<option value="${project.name}">${project.name}</option>`;
    }

    return html;
}


function getTypeOptions() {
    let html = "";

    for (let type of CRED_TYPES) {
        html += `<option value="${type}">${type}</option>`;
    }

    return html;
}


function getInitials(name) {
    let parts = name.split(" ");

    if (parts.length === 1) {
        return parts[0][0].toUpperCase();
    }

    return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}