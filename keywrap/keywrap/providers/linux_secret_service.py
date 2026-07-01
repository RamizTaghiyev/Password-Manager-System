"""
Not in your original three platforms, but worth having: your Super Admin
tooling will likely run on Linux dev/CI machines too, and `keyring`'s
Secret Service backend (GNOME Keyring / KWallet) gives you the same
envelope-encryption pattern as the macOS module for free.

pip install keyring pycryptodome secretstorage
"""

import platform
import secrets

from ..base import KeyWrapError, PlatformKeyWrapper, UnsupportedPlatformError

NONCE_LEN = 12
TAG_LEN = 16


class LinuxSecretServiceKeyWrapper(PlatformKeyWrapper):
    SERVICE_NAME = "com.yourapp.vaultkeywrap"
    ACCOUNT_NAME = "vault_wrap_key"

    def __init__(self):
        if platform.system() != "Linux":
            raise UnsupportedPlatformError("Secret Service wrapper is only available on Linux")

    def is_available(self) -> bool:
        if platform.system() != "Linux":
            return False
        try:
            import keyring
            return keyring.get_keyring().priority > 0
        except Exception:
            return False

    def _get_or_create_wrap_key(self) -> bytes:
        import base64
        import keyring

        existing = keyring.get_password(self.SERVICE_NAME, self.ACCOUNT_NAME)
        if existing:
            return base64.b64decode(existing)

        new_key = secrets.token_bytes(32)
        keyring.set_password(
            self.SERVICE_NAME, self.ACCOUNT_NAME, base64.b64encode(new_key).decode()
        )
        return new_key

    def wrap_key(self, raw_key: bytes) -> bytes:
        try:
            from Crypto.Cipher import AES

            wrap_key = self._get_or_create_wrap_key()
            nonce = secrets.token_bytes(NONCE_LEN)
            cipher = AES.new(wrap_key, AES.MODE_GCM, nonce=nonce)
            ciphertext, tag = cipher.encrypt_and_digest(raw_key)
            return nonce + tag + ciphertext
        except Exception as e:
            raise KeyWrapError(f"Secret Service wrap failed: {e}") from e

    def unwrap_key(self, wrapped_key: bytes) -> bytes:
        try:
            from Crypto.Cipher import AES

            wrap_key = self._get_or_create_wrap_key()
            nonce = wrapped_key[:NONCE_LEN]
            tag = wrapped_key[NONCE_LEN:NONCE_LEN + TAG_LEN]
            ciphertext = wrapped_key[NONCE_LEN + TAG_LEN:]
            cipher = AES.new(wrap_key, AES.MODE_GCM, nonce=nonce)
            return cipher.decrypt_and_verify(ciphertext, tag)
        except Exception as e:
            raise KeyWrapError(f"Secret Service unwrap failed: {e}") from e
