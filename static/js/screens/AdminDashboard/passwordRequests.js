import { postJson } from "../../api.js";
import { getInputValue, showMessage } from "../../dom.js";
import { appState } from "../../state.js";
import { dash } from "./dashboardState.js";
import { escapeHtml } from "./helpers.js";
import { loadVaultItems } from "./vault.js";


export async function loadPasswordChangeRequests() {
    let user = appState.loggedInUser;

    try {
        let response = await fetch(
            "/api/server-password-change-requests?users_id=" + user.users_id
        );

        let result = await response.json();

        if (!response.ok) {
            dash.passwordChangeRequests = {};
            return;
        }

        dash.passwordChangeRequests = {};

        for (let request of result.requests) {
            (dash.passwordChangeRequests[request.vault_id] ??= []).push(request);
        }

    } catch (error) {
        dash.passwordChangeRequests = {};
    }
}


function getLatestRequestForVault(vaultId) {
    let requests = dash.passwordChangeRequests[vaultId];

    if (requests === undefined || requests.length === 0) {
        return null;
    }

    return requests[0];
}


export function getServerPasswordChangeHtml(item) {
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


export function addServerPasswordRequestEvents() {
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


export function addServerPasswordUpdateEvents() {
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


export function renderSuperAdminRequests() {
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

    let allRequests = Object.values(dash.passwordChangeRequests)
        .flat()
        .filter(request => request.status === "pending");

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


export function addSuperAdminReviewEvents() {
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

