import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


KEY_SIZE = 32
NONCE_SIZE = 12
TAG_SIZE = 16


def get_vault_key():
    key_text = os.getenv("VAULT_KEY_BASE64")

    if not key_text:
        raise Exception("VAULT_KEY_BASE64 is missing.")

    key = base64.b64decode(key_text)

    if len(key) != KEY_SIZE:
        raise Exception("Vault key must be exactly 32 bytes.")

    return key


def encrypt_password(password):
    key = get_vault_key()
    nonce = os.urandom(NONCE_SIZE)

    aesgcm = AESGCM(key)

    encrypted = aesgcm.encrypt(
        nonce,
        password.encode("utf-8"),
        None
    )

    ciphertext = encrypted[:-TAG_SIZE]
    tag = encrypted[-TAG_SIZE:]

    return {
        "encrypted_data": base64.b64encode(ciphertext).decode("utf-8"),
        "nonce": base64.b64encode(nonce).decode("utf-8"),
        "auth_tag": base64.b64encode(tag).decode("utf-8")
    }


def decrypt_password(encrypted_data, nonce, auth_tag):
    key = get_vault_key()

    ciphertext = base64.b64decode(encrypted_data)
    nonce_bytes = base64.b64decode(nonce)
    tag = base64.b64decode(auth_tag)

    encrypted = ciphertext + tag

    aesgcm = AESGCM(key)

    decrypted = aesgcm.decrypt(
        nonce_bytes,
        encrypted,
        None
    )

    return decrypted.decode("utf-8")