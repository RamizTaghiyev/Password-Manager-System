"""
macOS/iOS: wrapped_vault_key can only be unwrapped by Keychain/Secure Enclave.

Two tiers:

1. MacOSKeychainKeyWrapper
   Practical, pure-Python: a random AES-256 "wrap key" is generated once
   and stored as a Keychain item (via the `keyring` package, which talks
   to Keychain Services for you). That wrap key then does AES-256-GCM
   envelope encryption of the real vault key. Killing the app/process
   doesn't lose anything — the wrap key persists in Keychain, scoped to
   your app's bundle ID.

   pip install keyring pycryptodome

2. Secure Enclave (reference only, not achievable in pure Python)
   A *hardware* non-extractable P-256 key generated with
   SecKeyCreateRandomKey(kSecAttrTokenIDSecureEnclave). This needs
   PyObjC bindings to Security.framework, an Xcode-signed app with the
   correct entitlement, and (for biometric gating) LocalAuthentication.
   In a normal codebase this is written in Swift, not Python — see
   native/SecureEnclaveWrapper.swift for the real implementation. If you
   need it reachable from Python, write that Swift code as a small
   command-line helper/XPC service and shell out to it, same pattern as
   the Windows TPM helper.
"""

import platform
import secrets

from ..base import KeyWrapError, PlatformKeyWrapper, UnsupportedPlatformError

NONCE_LEN = 12
TAG_LEN = 16


class MacOSKeychainKeyWrapper(PlatformKeyWrapper):
    SERVICE_NAME = "com.yourapp.vaultkeywrap"
    ACCOUNT_NAME = "vault_wrap_key"

    def __init__(self):
        if platform.system() != "Darwin":
            raise UnsupportedPlatformError("Keychain wrapper is only available on macOS")

    def is_available(self) -> bool:
        if platform.system() != "Darwin":
            return False
        try:
            import keyring  # noqa: F401
            return True
        except ImportError:
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
            raise KeyWrapError(f"Keychain wrap failed: {e}") from e

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
            raise KeyWrapError(f"Keychain unwrap failed: {e}") from e
