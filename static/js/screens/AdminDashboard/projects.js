import { showMessage } from "../../dom.js";
import { PROJECTS, dash } from "./dashboardState.js";
import { hideAddProjectPanel } from "./modals.js";
import { renderVaultItems } from "./vault.js";


export function renderProjectButtons() {
    let container = document.getElementById("project-list");

    if (container === null) {
        return;
    }

    let html = "";

    for (let project of PROJECTS) {
        let activeClass = "";

        if (project.name === dash.selectedProject) {
            activeClass = "active";
        }

        html += `
            <button class="project-button ${activeClass}" data-project="${project.name}">
                <span>▱ ${project.name}</span>
                <b>${countProjectItems(project.name)}</b>
            </button>
        `;
    }

    container.innerHTML = html;

    let buttons = document.querySelectorAll(".project-button");

    for (let button of buttons) {
        button.addEventListener("click", function () {
            dash.selectedProject = button.dataset.project;
            dash.selectedVaultId = "";
            renderProjectButtons();
            renderVaultItems();
        });
    }
}


function countProjectItems(projectName) {
    return dash.vaultItems.filter(item => getProjectName(item) === projectName).length;
}


export function addProject(name) {
    let alreadyExists = PROJECTS.some(project => project.name.toLowerCase() === name.toLowerCase());

    if (alreadyExists) {
        showMessage("A project with that name already exists.");
        return;
    }

    let slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    PROJECTS.push({
        name: name,
        prefixes: [slug + "-"]
    });

    dash.selectedProject = name;
    dash.selectedVaultId = "";

    hideAddProjectPanel();
    renderProjectButtons();
    renderVaultItems();
    showMessage("Project added.", false);
}


export function saveProject(vaultId, projectName) {
    localStorage.setItem("vault_project_" + vaultId, projectName);
}


export function getProjectName(item) {
    let savedProject = localStorage.getItem("vault_project_" + item.vault_id);

    if (savedProject !== null) {
        return savedProject;
    }

    let host = item.host_name.toLowerCase();

    let project = PROJECTS.find(p => p.prefixes.some(prefix => host.includes(prefix)));

    return project ? project.name : "Internal Systems";
}


export function getProjectOptions() {
    return PROJECTS
        .map(project => `<option value="${project.name}">${project.name}</option>`)
        .join("");
}

