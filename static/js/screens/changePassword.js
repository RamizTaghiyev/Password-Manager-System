import { postJson } from "../api.js";
import { setPage, getInputValue, showMessage } from "../dom.js";
import { appState } from "../state.js";

let changePasswordFlowId = "";
let changePasswordQrDataUrl = "";
let changePasswordSecret = "";


export function renderChangePassword(navigate) {
    renderOldPasswordScreen(navigate);
}


function renderOldPasswordScreen(navigate) {
    setPage(`
        <div class="box">
            <h1>Password Change</h1>

            <p>Step 1: Enter your old password.</p>

            <label>Old password</label>
            <input id="old_password" type="password">

            <button id="continue-button">Continue</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document.getElementById("continue-button").addEventListener("click", async function () {
        await checkOldPassword(navigate);
    });

    document.getElementById("back-button").addEventListener("click", function () {
        navigate("dashboard", appState.loggedInUser);
    });
}


async function checkOldPassword(navigate) {
    try {
        const oldPassword = getInputValue("old_password");

        const result = await postJson("/api/change-password/check-old", {
            users_id: appState.currentUserId,
            old_password: oldPassword
        });

        changePasswordFlowId = result.flow_id;
        changePasswordQrDataUrl = result.qr_data_url;
        changePasswordSecret = result.secret;

        renderTwoFactorScreen(navigate);

    } catch (error) {
        showMessage(error.message);
    }
}


function renderTwoFactorScreen(navigate) {
    setPage(`
        <div class="box">
            <h1>Password Change</h1>

            <p>Step 2: Verify 2FA.</p>

            <p>Scan this QR code if your authenticator app does not have this account.</p>

            <img class="qr" src="${changePasswordQrDataUrl}">

            <p><b>Manual secret:</b></p>
            <p class="secret">${appState.currentSecret}</p>

            <label>2FA code</label>
            <input id="totp_code" type="text" maxlength="6">

            <button id="verify-2fa-button">Verify 2FA</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document.getElementById("verify-2fa-button").addEventListener("click", async function () {
        await verifyTwoFactor(navigate);
    });

    document.getElementById("back-button").addEventListener("click", function () {
        renderOldPasswordScreen(navigate);
    });
}


async function verifyTwoFactor(navigate) {
    try {
        const code = getInputValue("totp_code");

        await postJson("/api/change-password/verify-2fa", {
            flow_id: changePasswordFlowId,
            code: code
        });

        renderEmailCodeScreen(navigate);

    } catch (error) {
        showMessage(error.message);
    }
}


function renderEmailCodeScreen(navigate) {
    setPage(`
        <div class="box">
            <h1>Password Change</h1>

            <p>Step 3: Enter the email verification code sent to your email.</p>

            <label>Email verification code</label>
            <input id="email_code" type="text">

            <button id="verify-email-button">Verify Email Code</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document.getElementById("verify-email-button").addEventListener("click", async function () {
        await verifyEmailCode(navigate);
    });

    document.getElementById("back-button").addEventListener("click", function () {
        renderTwoFactorScreen(navigate);
    });
}


async function verifyEmailCode(navigate) {
    try {
        const emailCode = getInputValue("email_code");

        await postJson("/api/change-password/verify-email-code", {
            flow_id: changePasswordFlowId,
            email_code: emailCode
        });

        renderNewPasswordScreen(navigate);

    } catch (error) {
        showMessage(error.message);
    }
}


function renderNewPasswordScreen(navigate) {
    setPage(`
        <div class="box">
            <h1>Password Change</h1>

            <p>Step 4: Enter your new password.</p>

            <label>New password</label>
            <input id="new_password" type="password">

            <label>Confirm new password</label>
            <input id="confirm_new_password" type="password">

            <button id="finish-button">Update Password</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document.getElementById("finish-button").addEventListener("click", async function () {
        await finishPasswordChange(navigate);
    });

    document.getElementById("back-button").addEventListener("click", function () {
        renderEmailCodeScreen(navigate);
    });
}


async function finishPasswordChange(navigate) {
    try {
        const newPassword = getInputValue("new_password");
        const confirmNewPassword = getInputValue("confirm_new_password");

        const result = await postJson("/api/change-password/finish", {
            flow_id: changePasswordFlowId,
            new_password: newPassword,
            confirm_new_password: confirmNewPassword
        });

        changePasswordFlowId = "";

        showMessage(result.message, false);

        setTimeout(function () {
            navigate("dashboard", appState.loggedInUser);
        }, 1200);

    } catch (error) {
        showMessage(error.message);
    }
}