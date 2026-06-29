const app = document.getElementById("app");


export function setPage(html) {
    app.innerHTML = html;
}


export function getInputValue(id) {
    return document.getElementById(id).value;
}


export function showMessage(message, isError = true) {
    const messageBox = document.getElementById("message");

    if (messageBox) {
        messageBox.innerText = message;
        messageBox.style.color = isError ? "red" : "green";
    }
}