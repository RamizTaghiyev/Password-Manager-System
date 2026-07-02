import { postJson } from "../../api.js";
import { showMessage } from "../../dom.js";
import { appState } from "../../state.js";
import { dash } from "./dashboardState.js";
import { escapeHtml } from "./helpers.js";
import { getServerPasswordChangeHtml } from "./passwordRequests.js";
import { getProjectName } from "./projects.js";
import { getTotpBoxHtml } from "./totp.js";
import { getItemById, renderVaultItems } from "./vault.js";


export function renderCredentialDetail() {
    let container = document.getElementById("credential-detail");

    if (dash.selectedVaultId === "") {
        container.innerHTML = `
            <div class="empty-detail">
                <h2>Select a server host</h2>
                <p>Click a host name from the selected project to view its credentials.</p>
            </div>
        `;
        return;
    }

    let item = getItemById(dash.selectedVaultId);

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

    if (dash.revealed[item.vault_id] !== undefined) {
        passwordText = dash.revealed[item.vault_id];
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


export function addRevealEvents() {
    let buttons = document.querySelectorAll(".reveal-button");

    for (let button of buttons) {
        button.addEventListener("click", async function () {
            let vaultId = button.dataset.id;
            await toggleReveal(vaultId);
        });
    }
}


async function toggleReveal(vaultId) {
    if (dash.revealed[vaultId] !== undefined) {
        delete dash.revealed[vaultId];
        renderVaultItems();
        return;
    }

    let user = appState.loggedInUser;

    try {
        let result = await postJson("/api/vault-items/reveal", {
            users_id: user.users_id,
            vault_id: vaultId
        });

        dash.revealed[vaultId] = result.password;
        renderVaultItems();

    } catch (error) {
        showMessage(error.message);
    }
}

