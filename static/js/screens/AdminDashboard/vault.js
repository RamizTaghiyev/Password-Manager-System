import { postJson } from "../../api.js";
import { getInputValue, showMessage } from "../../dom.js";
import { appState } from "../../state.js";
import { dash } from "./dashboardState.js";
import { addRevealEvents, renderCredentialDetail } from "./credentialDetail.js";
import { escapeHtml } from "./helpers.js";
import { hideAddPanel } from "./modals.js";
import { addServerPasswordRequestEvents, addServerPasswordUpdateEvents, addSuperAdminReviewEvents, loadPasswordChangeRequests, renderSuperAdminRequests } from "./passwordRequests.js";
import { getProjectName, renderProjectButtons, saveProject } from "./projects.js";
import { addTotpEvents, animateStaminaWheel, stopTotpSession, updateStaminaSecondsLabel } from "./totp.js";


export async function loadVaultItems() {
    let user = appState.loggedInUser;

    let response = await fetch("/api/vault-items?users_id=" + user.users_id);
    let result = await response.json();

    if (!response.ok) {
        showMessage(result.error);
        return;
    }

    dash.vaultItems = result.items;
    dash.revealed = {};

    await loadPasswordChangeRequests();

    renderProjectButtons();
    renderVaultItems();
}


export async function addVaultItem() {
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

        dash.selectedProject = projectName;
        dash.selectedVaultId = result.vault_id;

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


function getFilteredItems() {
    let nameFilter = getInputValue("filter_name").toLowerCase();
    let dateFilter = getInputValue("filter_date");
    let typeFilter = getInputValue("filter_type");

    return dash.vaultItems.filter(item =>
        getProjectName(item) === dash.selectedProject &&
        item.host_name.toLowerCase().includes(nameFilter) &&
        (dateFilter === "" || item.created_at.split(" ")[0] === dateFilter) &&
        (typeFilter === "All" || item.type === typeFilter)
    );
}


export function renderVaultItems() {
    let items = getFilteredItems();

    document.getElementById("breadcrumb-project").innerText = dash.selectedProject.toUpperCase();
    document.getElementById("host-count").innerText = items.length;

    document.getElementById("list-button").classList.toggle("secondary", dash.viewMode !== "list");
    document.getElementById("tiles-button").classList.toggle("secondary", dash.viewMode !== "tiles");

    if (!items.some(item => item.vault_id === dash.selectedVaultId)) {
        dash.selectedVaultId = "";
    }

    if (dash.totpActiveVaultId !== null && dash.totpActiveVaultId !== dash.selectedVaultId) {
        stopTotpSession();
    }

    if (dash.viewMode === "list") {
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

    if (dash.totpActiveVaultId !== null && dash.totpActiveVaultId === dash.selectedVaultId) {
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

        if (item.vault_id === dash.selectedVaultId) {
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

        if (item.vault_id === dash.selectedVaultId) {
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


export function addHostEvents() {
    for (let host of document.querySelectorAll(".host-row, .host-tile")) {
        host.addEventListener("click", function () {
            dash.selectedVaultId = host.dataset.id;
            renderVaultItems();
        });
    }
}


export function getItemById(vaultId) {
    return dash.vaultItems.find(item => item.vault_id === vaultId) || null;
}

