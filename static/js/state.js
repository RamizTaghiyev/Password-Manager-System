export const appState = {
    currentUserId: "",
    currentSecret: "",
    currentQrDataUrl: "",
    twofaMode: "",
    loggedInUser: null
};


export function saveTwoFactorData(result, mode) {
    appState.currentUserId = result.users_id;
    appState.currentSecret = result.secret;
    appState.currentQrDataUrl = result.qr_data_url;
    appState.twofaMode = mode;
}


export function saveLoggedInUser(user) {
    appState.loggedInUser = user;
}


export function clearState() {
    appState.currentUserId = "";
    appState.currentSecret = "";
    appState.currentQrDataUrl = "";
    appState.twofaMode = "";
    appState.loggedInUser = null;
}