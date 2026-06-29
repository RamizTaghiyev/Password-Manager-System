import { setPage } from "../dom.js";
import { clearState, appState } from "../state.js";


export function renderDashboard(navigate, user) {
    if (user === null) {
        user = appState.loggedInUser;
    }

    setPage(`
        <div class="box">
            <h1>Dashboard</h1>

            <p>Login successful.</p>
            <p>Welcome, <b>${user.full_name}</b></p>
            <p>Email: ${user.email}</p>
            <p>Role: ${user.role}</p>

            <button id="change-password-button">Change Password</button>
            <button id="logout-button">Logout</button>
        </div>
    `);

    document
        .getElementById("change-password-button")
        .addEventListener("click", function () {
            navigate("changePassword");
        });

    document
        .getElementById("logout-button")
        .addEventListener("click", function () {
            clearState();
            navigate("home");
        });
}