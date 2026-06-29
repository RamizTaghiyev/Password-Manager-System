import { postJson } from "../api.js";
import { setPage, getInputValue, showMessage } from "../dom.js";
import { saveTwoFactorData } from "../state.js";


export function renderLogin(navigate) {
    setPage(`
        <div class="box">
            <h1>Login</h1>

            <label>Email</label>
            <input id="email" type="email">

            <label>Password</label>
            <input id="password" type="password">

            <button id="login-button">Login</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("login-button")
        .addEventListener("click", async function () {
            await loginUser(navigate);
        });

    document
        .getElementById("back-button")
        .addEventListener("click", function () {
            navigate("home");
        });
}


async function loginUser(navigate) {
    try {
        const email = getInputValue("email");
        const password = getInputValue("password");

        const result = await postJson("/api/login", {
            email: email,
            password: password
        });

        let mode = "login";

        if (result.requires_2fa_setup) {
            mode = "setup";
        }

        saveTwoFactorData(result, mode);

        navigate("twofa");

    } catch (error) {
        showMessage(error.message);
    }
}