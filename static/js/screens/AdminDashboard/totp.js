import { postJson } from "../../api.js";
import { getInputValue, showMessage } from "../../dom.js";
import { appState } from "../../state.js";
import { STAMINA_CIRCUMFERENCE, STAMINA_RADIUS, dash } from "./dashboardState.js";
import { renderCredentialDetail } from "./credentialDetail.js";
import { escapeHtml } from "./helpers.js";
import { loadVaultItems } from "./vault.js";


export function getTotpBoxHtml(item) {
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

    let isActive = dash.totpActiveVaultId === item.vault_id && dash.totpCode !== "";

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
                        <span class="stamina-code">${escapeHtml(formatTotpCode(dash.totpCode))}</span>
                        <span class="stamina-seconds" id="stamina-seconds">${dash.totpPeriod}s</span>
                    </div>
                </div>

                <div class="totp-active-actions">
                    <p class="change-help">Code refreshes automatically every ${dash.totpPeriod} seconds.</p>

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


export function addTotpEvents() {
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

        dash.totpActiveVaultId = vaultId;
        dash.totpCode = result.code;
        dash.totpPeriod = result.period;
        dash.totpDeadlineMs = Date.now() + (result.seconds_remaining * 1000);

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

        if (dash.totpActiveVaultId !== vaultId) {
            return;
        }

        dash.totpCode = result.code;
        dash.totpPeriod = result.period;
        dash.totpDeadlineMs = Date.now() + (result.seconds_remaining * 1000);

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

    dash.totpTickHandle = setInterval(updateStaminaSecondsLabel, 250);

    let remainingMs = Math.max(dash.totpDeadlineMs - Date.now(), 0);

    dash.totpRefreshTimeoutHandle = setTimeout(function () {
        refreshTotpForVault(dash.totpActiveVaultId);
    }, remainingMs);
}


function stopTotpTimers() {
    if (dash.totpTickHandle !== null) {
        clearInterval(dash.totpTickHandle);
        dash.totpTickHandle = null;
    }

    if (dash.totpRefreshTimeoutHandle !== null) {
        clearTimeout(dash.totpRefreshTimeoutHandle);
        dash.totpRefreshTimeoutHandle = null;
    }
}


export function stopTotpSession() {
    stopTotpTimers();
    dash.totpActiveVaultId = null;
    dash.totpCode = "";
}


export function animateStaminaWheel() {
    let fill = document.getElementById("stamina-fill");

    if (fill === null) {
        return;
    }

    let remainingMs = Math.max(dash.totpDeadlineMs - Date.now(), 0);

    fill.style.transition = "none";
    fill.style.strokeDashoffset = "0";

    // Force a reflow so the browser registers the reset before animating.
    fill.getBoundingClientRect();

    fill.style.transition = "stroke-dashoffset " + (remainingMs / 1000) + "s linear";
    fill.style.strokeDashoffset = String(STAMINA_CIRCUMFERENCE);
}


export function updateStaminaSecondsLabel() {
    let label = document.getElementById("stamina-seconds");
    let wheel = document.getElementById("stamina-wheel");

    if (label === null || wheel === null) {
        return;
    }

    let remainingMs = Math.max(dash.totpDeadlineMs - Date.now(), 0);
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
    if (dash.totpCode === "") {
        return;
    }

    try {
        await navigator.clipboard.writeText(dash.totpCode);
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

