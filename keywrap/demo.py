"""
End-to-end demo matching your spec:

  "The database stores the wrapped vault key, not the real AES vault key."

Flow:
  1. (First run on a device) generate a random 256-bit vault key.
  2. wrap_key() it via the Factory -> store ONLY the wrapped blob in
     `vaults.wrapped_vault_key` (sqlite/Postgres/whatever backs main.py).
  3. On every subsequent unlock: read wrapped_vault_key from the DB,
     unwrap_key() it locally, use the raw key in memory only, for only as
     long as the vault is unlocked. Never persist the raw key.
  4. Use the raw vault key for AES-256-GCM encrypt/decrypt of the actual
     stored hostname/password credentials, same as your "Personal
     dashboard" section describes.
"""

import secrets

from Crypto.Cipher import AES

from keywrap import KeyWrapperFactory, KeyWrapError, UnsupportedPlatformError

VAULT_KEY_LEN = 32   # 256 bits
NONCE_LEN = 12
TAG_LEN = 16


def encrypt_credential(vault_key: bytes, plaintext_password: str) -> bytes:
    nonce = secrets.token_bytes(NONCE_LEN)
    cipher = AES.new(vault_key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext_password.encode("utf-8"))
    return nonce + tag + ciphertext


def decrypt_credential(vault_key: bytes, blob: bytes) -> str:
    nonce, tag, ciphertext = blob[:NONCE_LEN], blob[NONCE_LEN:NONCE_LEN + TAG_LEN], blob[NONCE_LEN + TAG_LEN:]
    cipher = AES.new(vault_key, AES.MODE_GCM, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag).decode("utf-8")


def main():
    try:
        wrapper = KeyWrapperFactory.create()
    except UnsupportedPlatformError as e:
        print(f"No secure module available: {e}")
        return

    if not wrapper.is_available():
        print(f"{type(wrapper).__name__} selected but not currently usable "
              f"(missing dependency or platform feature).")
        return

    # --- First-time setup for this device/admin user ---
    vault_key = secrets.token_bytes(VAULT_KEY_LEN)
    try:
        wrapped = wrapper.wrap_key(vault_key)
    except KeyWrapError as e:
        print(f"Wrap failed: {e}")
        return

    print(f"Provider: {type(wrapper).__name__}")
    print(f"wrapped_vault_key ({len(wrapped)} bytes) -> this is what gets INSERTed into the DB")

    # --- Simulate storing it, then loading it back later and using it ---
    stored_wrapped_vault_key = wrapped  # imagine this round-tripped through sqlite

    raw_vault_key = wrapper.unwrap_key(stored_wrapped_vault_key)
    assert raw_vault_key == vault_key, "unwrap should reconstruct the original key"

    encrypted = encrypt_credential(raw_vault_key, "S3cure-Server-Password!")
    decrypted = decrypt_credential(raw_vault_key, encrypted)

    print(f"Round-trip credential decrypt OK: {decrypted == 'S3cure-Server-Password!'}")

    # Good hygiene: drop the raw key reference as soon as the vault locks.
    del raw_vault_key


if __name__ == "__main__":
    main()
