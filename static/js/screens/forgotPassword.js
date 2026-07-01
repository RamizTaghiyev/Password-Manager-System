import { postJson } from "../api.js";
import { setPage, getInputValue, showMessage } from "../dom.js";


let forgotPasswordFlowId = "";
let forgotPasswordQrDataUrl = "";
let forgotPasswordSecret = "";


export function renderForgotPassword(navigate) {
    renderEmailScreen(navigate);
}


function renderEmailScreen(navigate) {
    setPage(`
        <div class="box">
            <h1>Forgot Password</h1>

            <p>Step 1: Enter your email.</p>

            <label>Email</label>
            <input id="email" type="email">

            <button id="continue-button">Continue</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("continue-button")
        .addEventListener("click", async function () {
            await startForgotPassword(navigate);
        });

    document
        .getElementById("back-button")
        .addEventListener("click", function () {
            navigate("home");
        });
}


async function startForgotPassword(navigate) {
    try {
        const email = getInputValue("email");

        const result = await postJson("/api/forgot-password/start", {
            email: email
        });

        forgotPasswordFlowId = result.flow_id;
        forgotPasswordQrDataUrl = result.qr_data_url;
        forgotPasswordSecret = result.secret;

        renderTwoFactorScreen(navigate);

    } catch (error) {
        showMessage(error.message);
    }
}


function renderTwoFactorScreen(navigate) {
    setPage(`
        <div class="box">
            <h1>Forgot Password</h1>

            <p>Step 2: Verify 2FA.</p>

            <p>Scan this QR code using your authenticator app.</p>

            <img class="qr" src="${forgotPasswordQrDataUrl}">

            <!-- Optional for testing -->
            
            <p><b>Manual secret:</b></p>
            <p class="secret">${forgotPasswordSecret}</p>
            

            <label>2FA code</label>
            <input id="totp_code" type="text" maxlength="6">

            <button id="verify-2fa-button">Verify 2FA</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("verify-2fa-button")
        .addEventListener("click", async function () {
            await verifyTwoFactor(navigate);
        });

    document
        .getElementById("back-button")
        .addEventListener("click", function () {
            renderEmailScreen(navigate);
        });
}


async function verifyTwoFactor(navigate) {
    try {
        const code = getInputValue("totp_code");

        await postJson("/api/forgot-password/verify-2fa", {
            flow_id: forgotPasswordFlowId,
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
            <h1>Forgot Password</h1>

            <p>Step 3: Enter the email verification code sent to your email.</p>

            <label>Email verification code</label>
            <input id="email_code" type="text">

            <button id="verify-email-button">Verify Email Code</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("verify-email-button")
        .addEventListener("click", async function () {
            await verifyEmailCode(navigate);
        });

    document
        .getElementById("back-button")
        .addEventListener("click", function () {
            renderTwoFactorScreen(navigate);
        });
}


async function verifyEmailCode(navigate) {
    try {
        const emailCode = getInputValue("email_code");

        await postJson("/api/forgot-password/verify-email-code", {
            flow_id: forgotPasswordFlowId,
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
            <h1>Forgot Password</h1>

            <p>Step 4: Enter your new password.</p>

            <label>New password</label>
            <input id="new_password" type="password">

            <label>Confirm new password</label>
            <input id="confirm_new_password" type="password">

            <button id="reset-password-button">Reset Password</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("reset-password-button")
        .addEventListener("click", async function () {
            await finishForgotPassword(navigate);
        });

    document
        .getElementById("back-button")
        .addEventListener("click", function () {
            renderEmailCodeScreen(navigate);
        });
}


async function finishForgotPassword(navigate) {
    try {
        const newPassword = getInputValue("new_password");
        const confirmNewPassword = getInputValue("confirm_new_password");

        const result = await postJson("/api/forgot-password/finish", {
            flow_id: forgotPasswordFlowId,
            new_password: newPassword,
            confirm_new_password: confirmNewPassword
        });

        forgotPasswordFlowId = "";
        forgotPasswordQrDataUrl = "";
        forgotPasswordSecret = "";

        showMessage(result.message, false);

        setTimeout(function () {
            navigate("login");
        }, 1500);

    } catch (error) {
        showMessage(error.message);
    }
}