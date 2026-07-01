import { postJson } from "../api.js";
import { setPage, getInputValue, showMessage } from "../dom.js";
import { appState, saveLoggedInUser } from "../state.js";


export function renderTwoFactor(navigate) {
    setPage(`
        <div class="box">
            <h1>2FA Verification</h1>

            <p>
                Scan this QR code using Authenticator App of your choice (e.g. Google Authenticator,
                OneAuth, Guardian)
            </p>

            <img class="qr" src="${appState.currentQrDataUrl}">

            <p><b>Manual secret:</b></p>
            <p class="secret">${appState.currentSecret}</p>

            <label>Enter 6-digit code</label>
            <input id="totp_code" type="text" maxlength="6">

            <button id="verify-button">Verify</button>
            <button id="cancel-button">Cancel</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("verify-button")
        .addEventListener("click", async function () {
            await verifyTwoFactor(navigate);
        });

    document
        .getElementById("cancel-button")
        .addEventListener("click", function () {
            navigate("home");
        });
}


async function verifyTwoFactor(navigate) {
    try {
        const code = getInputValue("totp_code");

        let url = "";

        if (appState.twofaMode === "setup") {
            url = "/api/setup-2fa";
        } else {
            url = "/api/verify-login-2fa";
        }

        const result = await postJson(url, {
            users_id: appState.currentUserId,
            code: code
        });

        saveLoggedInUser(result.user);

        navigate("dashboard", result.user);

    } catch (error) {
        showMessage(error.message);
    }
}