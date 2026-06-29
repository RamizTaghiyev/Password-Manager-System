import { renderHome } from "./screens/home.js";
import { renderRegister } from "./screens/register.js";
import { renderLogin } from "./screens/login.js";
import { renderTwoFactor } from "./screens/twofaScreen.js";
import { renderDashboard } from "./screens/dashboard.js";
import { renderChangePassword } from "./screens/changePassword.js";
import { renderForgotPassword } from "./screens/forgotPassword.js";


export function navigate(screen, data = null) {
    if (screen === "home") {
        renderHome(navigate);
    }

    if (screen === "register") {
        renderRegister(navigate);
    }

    if (screen === "login") {
        renderLogin(navigate);
    }

    if (screen === "twofa") {
        renderTwoFactor(navigate);
    }

    if (screen === "dashboard") {
        renderDashboard(navigate, data);
    }

    if (screen === "changePassword") {
        renderChangePassword(navigate);
    }

    if (screen === "forgotPassword") {
        renderForgotPassword(navigate);
    }
}


navigate("home");