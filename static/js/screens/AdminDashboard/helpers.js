import { CRED_TYPES } from "./dashboardState.js";


export function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


export function getInitials(name) {
    let parts = name.split(" ");

    if (parts.length === 1) {
        return parts[0][0].toUpperCase();
    }

    return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
}


export function getTypeOptions() {
    return CRED_TYPES
        .map(type => `<option value="${type}">${type}</option>`)
        .join("");
}

