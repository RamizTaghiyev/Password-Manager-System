import { setPage } from "../dom.js";


export function renderHome(navigate) {
    setPage(`
        <div class="box">
            <h1>Password Manager</h1>

            <button id="register-button">Sign up</button>
            <button id="login-button">Login</button>
            <button id="forgot-password-button">Forgot password</button>

            <p id="message"></p>
        </div>
    `);

    document
        .getElementById("register-button")
        .addEventListener("click", function () {
            navigate("register");
        });

    document
        .getElementById("login-button")
        .addEventListener("click", function () {
            navigate("login");
        });

    document
        .getElementById("forgot-password-button")
        .addEventListener("click", function () {
            navigate("forgotPassword");
        });
}