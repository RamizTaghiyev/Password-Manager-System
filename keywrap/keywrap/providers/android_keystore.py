"""
Android: wrapped_vault_key can only be unwrapped by Android Keystore.

Important difference from the other two: the Android Keystore / StrongBox
API simply does not exist in CPython. It's a Java/Kotlin API surface
(android.security.keystore.*). There are two real ways to reach it:

  (a) Your client app is *not* CPython at all on Android — it's a native
      Kotlin/Java app (or a Kotlin Multiplatform / React Native app with a
      native module). The Keystore code lives there natively. This is the
      normal, production path — see native/VaultKeystore.kt below.

  (b) Your client app is built with Chaquopy or Kivy+pyjnius (Python
      actually running on Android via a JVM bridge). In that case this
      class below is a real, working implementation — it calls into the
      Kotlin object in native/VaultKeystore.kt through the JVM bridge.

If you're building a normal native Android admin app, treat this file as
documentation of the calling contract, and implement the real logic in
Kotlin (native/VaultKeystore.kt), with that Kotlin class implementing the
same wrap/unwrap shape so your architecture stays symmetric across platforms.
"""

import platform

from ..base import KeyWrapError, PlatformKeyWrapper, UnsupportedPlatformError


def _running_under_chaquopy() -> bool:
    try:
        import java  # provided by Chaquopy at runtime
        return True
    except ImportError:
        return False


class AndroidKeystoreKeyWrapper(PlatformKeyWrapper):
    """
    Only usable when this Python process is actually running inside an
    Android app via Chaquopy/pyjnius. Bridges to the Kotlin
    `VaultKeystore` singleton (native/VaultKeystore.kt), which:
      - generates a non-exportable AES-256-GCM key in the Android Keystore
      - prefers StrongBox (setIsStrongBoxBacked(true)) and falls back to
        the TEE-backed Keystore on devices without a StrongBox chip
      - optionally requires biometric auth per-use via
        setUserAuthenticationRequired(true)
    """

    def __init__(self):
        if platform.system() != "Linux" or not _running_under_chaquopy():
            raise UnsupportedPlatformError(
                "Android Keystore is only reachable from a Python process "
                "running inside an Android app via Chaquopy/pyjnius. For a "
                "native Kotlin app, call VaultKeystore.kt directly instead "
                "of going through this Python class."
            )

    def is_available(self) -> bool:
        if not _running_under_chaquopy():
            return False
        try:
            from java import jclass
            jclass("com.yourapp.security.VaultKeystore")
            return True
        except Exception:
            return False

    def wrap_key(self, raw_key: bytes) -> bytes:
        try:
            from java import jclass
            VaultKeystore = jclass("com.yourapp.security.VaultKeystore")
            # Kotlin side returns a ByteArray; pyjnius/Chaquopy marshal it to bytes.
            return bytes(VaultKeystore.INSTANCE.wrapKey(raw_key))
        except Exception as e:
            raise KeyWrapError(f"Android Keystore wrap failed: {e}") from e

    def unwrap_key(self, wrapped_key: bytes) -> bytes:
        try:
            from java import jclass
            VaultKeystore = jclass("com.yourapp.security.VaultKeystore")
            return bytes(VaultKeystore.INSTANCE.unwrapKey(wrapped_key))
        except Exception as e:
            raise KeyWrapError(f"Android Keystore unwrap failed: {e}") from e
