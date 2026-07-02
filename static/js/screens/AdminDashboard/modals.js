import { dash } from "./dashboardState.js";


function openModal(backdropId) {
    let backdrop = document.getElementById(backdropId);

    backdrop.classList.remove("hidden");
    document.body.classList.add("modal-open");

    // Force layout so the transition below actually animates in.
    backdrop.getBoundingClientRect();

    requestAnimationFrame(function () {
        backdrop.classList.add("visible");
    });
}


function closeModal(backdropId) {
    let backdrop = document.getElementById(backdropId);

    if (backdrop.classList.contains("hidden")) {
        return;
    }

    backdrop.classList.remove("visible");
    document.body.classList.remove("modal-open");

    setTimeout(function () {
        backdrop.classList.add("hidden");
    }, 220);
}


export function showAddPanel() {
    document.getElementById("project_name").value = dash.selectedProject;
    openModal("add-panel-backdrop");
}


export function hideAddPanel() {
    closeModal("add-panel-backdrop");
}


export function showAddProjectPanel() {
    openModal("add-project-backdrop");
}


export function hideAddProjectPanel() {
    closeModal("add-project-backdrop");
}


export function handleModalEscape(event) {
    if (event.key !== "Escape") {
        return;
    }

    for (let backdropId of ["add-panel-backdrop", "add-project-backdrop"]) {
        let backdrop = document.getElementById(backdropId);

        if (backdrop !== null && backdrop.classList.contains("visible")) {
            closeModal(backdropId);
        }
    }

    closeAccountFlyout();
}


export function toggleAccountFlyout() {
    let flyout = document.getElementById("account-flyout");

    if (flyout.classList.contains("visible")) {
        closeAccountFlyout();
    } else {
        openAccountFlyout();
    }
}


function openAccountFlyout() {
    let flyout = document.getElementById("account-flyout");

    flyout.classList.remove("hidden");

    flyout.getBoundingClientRect();

    requestAnimationFrame(function () {
        flyout.classList.add("visible");
    });
}


export function closeAccountFlyout() {
    let flyout = document.getElementById("account-flyout");

    if (flyout === null || !flyout.classList.contains("visible")) {
        return;
    }

    flyout.classList.remove("visible");

    setTimeout(function () {
        flyout.classList.add("hidden");
    }, 180);
}


export function toggleFlyoutSettingsAccordion() {
    let subitems = document.getElementById("flyout-settings-subitems");
    let chevron = document.getElementById("flyout-settings-chevron");

    subitems.classList.toggle("open");
    chevron.classList.toggle("rotated");
}


export function handleOutsideFlyoutClick(event) {
    let flyout = document.getElementById("account-flyout");
    let trigger = document.getElementById("account-trigger");

    if (flyout === null || trigger === null) {
        return;
    }

    if (!flyout.contains(event.target) && !trigger.contains(event.target)) {
        closeAccountFlyout();
    }
}
