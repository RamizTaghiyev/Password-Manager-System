import { getInputValue, showMessage } from "../../dom.js";
import { dash } from "./dashboardState.js";


export function togglePasswordGenerator() {
    let panel = document.getElementById("password-generator-panel");

    if (panel.classList.contains("hidden")) {
        panel.classList.remove("hidden");
        generatePassword();
    } else {
        panel.classList.add("hidden");
    }
}


export function generatePassword() {
    let length = Number(getInputValue("password_length"));

    let includeUppercase = document.getElementById("include_uppercase").checked;
    let includeLowercase = document.getElementById("include_lowercase").checked;
    let includeNumbers = document.getElementById("include_numbers").checked;
    let includeSymbols = document.getElementById("include_symbols").checked;
    let avoidAmbiguous = document.getElementById("avoid_ambiguous").checked;

    let candidateSets = [
        [includeUppercase, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", true],
        [includeLowercase, "abcdefghijklmnopqrstuvwxyz", true],
        [includeNumbers, "0123456789", true],
        [includeSymbols, "!@#$%^&*()-_=+[]{};:,.<>?", false]
    ];

    let characterSets = [];

    for (let [enabled, characters, stripAmbiguous] of candidateSets) {
        if (!enabled) {
            continue;
        }

        if (avoidAmbiguous && stripAmbiguous) {
            characters = removeAmbiguousCharacters(characters);
        }

        characterSets.push(characters);
    }

    let allCharacters = characterSets.join("");

    if (allCharacters.length === 0) {
        showMessage("Select at least one password character type.");
        return;
    }

    let passwordCharacters = [];

    for (let set of characterSets) {
        passwordCharacters.push(getSecureRandomCharacter(set));
    }

    while (passwordCharacters.length < length) {
        passwordCharacters.push(getSecureRandomCharacter(allCharacters));
    }

    passwordCharacters = secureShuffle(passwordCharacters);

    dash.generatedPassword = passwordCharacters.join("");

    document.getElementById("generated_password_output").innerText = dash.generatedPassword;

    updatePasswordStrengthBadge(dash.generatedPassword, characterSets.length);
}


function removeAmbiguousCharacters(value) {
    return value.replace(/[0Oo1Il]/g, "");
}


function getSecureRandomCharacter(characters) {
    let randomIndex = getSecureRandomNumber(characters.length);
    return characters[randomIndex];
}


function getSecureRandomNumber(max) {
    let array = new Uint32Array(1);
    crypto.getRandomValues(array);

    return array[0] % max;
}


function secureShuffle(items) {
    let result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
        let j = getSecureRandomNumber(i + 1);
        let temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }

    return result;
}


function updatePasswordStrengthBadge(password, usedSetCount) {
    let badge = document.getElementById("password_strength_badge");

    let score = [
        password.length >= 12,
        password.length >= 18,
        password.length >= 24,
        usedSetCount >= 3,
        usedSetCount >= 4
    ].filter(Boolean).length;

    badge.classList.remove("weak", "medium", "strong");

    if (score <= 2) {
        badge.innerText = "Weak";
        badge.classList.add("weak");
        return;
    }

    if (score <= 4) {
        badge.innerText = "Medium";
        badge.classList.add("medium");
        return;
    }

    badge.innerText = "Strong";
    badge.classList.add("strong");
}


export function useGeneratedPassword() {
    if (dash.generatedPassword === "") {
        generatePassword();
    }

    document.getElementById("server_password").value = dash.generatedPassword;
    showMessage("Generated password inserted.", false);
}


export async function copyGeneratedPassword() {
    if (dash.generatedPassword === "") {
        generatePassword();
    }

    try {
        await navigator.clipboard.writeText(dash.generatedPassword);
        showMessage("Generated password copied.", false);
    } catch (error) {
        showMessage("Could not copy password. Use the generated password manually.");
    }
}

