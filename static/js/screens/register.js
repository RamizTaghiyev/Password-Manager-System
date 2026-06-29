import { postJson } from "../api.js";
import { setPage, getInputValue, showMessage } from "../dom.js";
import { saveTwoFactorData } from "../state.js";


export function renderRegister(navigate) {
    setPage(`
        <div class="box">
            <h1>Sign up</h1>

            <label>Full name</label>
            <input id="full_name" type="text">

            <label>Email</label>
            <input id="email" type="email">

            <label>Password</label>
            <input id="password" type="password">

            <label>Confirm password</label>
            <input id="confirm_password" type="password">

            <button id="create-account-button">Create account</button>
            <button id="back-button">Back</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("create-account-button")
        .addEventListener("click", async function () {
            await registerUser(navigate);
        });

    document
        .getElementById("back-button")
        .addEventListener("click", function () {
            navigate("home");
        });
}


async function registerUser(navigate) {
    try {
        const fullName = getInputValue("full_name");
        const email = getInputValue("email");
        const password = getInputValue("password");
        const confirmPassword = getInputValue("confirm_password");

        const result = await postJson("/api/register", {
            full_name: fullName,
            email: email,
            password: password,
            confirm_password: confirmPassword
        });

        saveTwoFactorData(result, "setup");

        navigate("twofa");

    } catch (error) {
        showMessage(error.message);
    }
}