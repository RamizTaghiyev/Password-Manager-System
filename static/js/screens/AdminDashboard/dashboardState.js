// Shared mutable state and constants for the Admin Dashboard modules.
// All dashboard modules read and write through the `dash` object so
// they stay in sync without circular value copies.

export const dash = {
    viewMode: "list",
    vaultItems: [],
    revealed: {},
    passwordChangeRequests: {},
    generatedPassword: "",

    selectedProject: "GoMap",
    selectedVaultId: "",

    totpActiveVaultId: null,
    totpCode: "",
    totpPeriod: 30,
    totpTickHandle: null,
    totpRefreshTimeoutHandle: null,
    totpDeadlineMs: 0
};

export const CRED_TYPES = ["Database", "API Server", "VPN", "Backup Server", "Server"];

export const STAMINA_RADIUS = 52;
export const STAMINA_CIRCUMFERENCE = 2 * Math.PI * STAMINA_RADIUS;

export const PROJECTS = [
    {
        name: "Asan Visa",
        prefixes: ["av-", "asan"]
    },
    {
        name: "GoMap",
        prefixes: ["gm-", "gomap"]
    },
    {
        name: "e-Tender",
        prefixes: ["et-", "tender"]
    },
    {
        name: "EduNet",
        prefixes: ["edu-", "edunet"]
    },
    {
        name: "Internal Systems",
        prefixes: ["int-", "internal"]
    }
];
