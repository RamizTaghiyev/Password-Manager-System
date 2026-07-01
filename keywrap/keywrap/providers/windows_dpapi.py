"""
Windows: wrapped_vault_key can only be unwrapped by DPAPI/TPM.

Two tiers, both included:

1. WindowsDPAPIKeyWrapper
   Uses CryptProtectData / CryptUnprotectData. The key DPAPI uses to
   protect your blob is itself derived from the user's logon credentials,
   and on modern Windows (8+) that master key chain is sealed by
   Credential Guard / the TPM where available — you get "only this
   Windows user, on this machine" without writing any key-derivation
   code yourself.

   pip install pywin32

2. WindowsTPMKeyWrapper
   Goes one level deeper: generates a non-exportable AES key directly
   inside the TPM via CNG (Microsoft Platform Crypto Provider), so the
   key material never exists outside the chip, even transiently in
   process memory during wrap/unwrap on another machine. More setup,
   stronger guarantee. Use this tier if "Super Admin" master-key material
   is what's being wrapped; DPAPI is fine for regular admin vault keys.
"""

import platform

from ..base import KeyWrapError, PlatformKeyWrapper, UnsupportedPlatformError


class WindowsDPAPIKeyWrapper(PlatformKeyWrapper):
    """Practical default for desktop admin clients."""

    def __init__(self, entropy: bytes | None = None, bind_to_machine: bool = False):
        if platform.system() != "Windows":
            raise UnsupportedPlatformError("DPAPI is only available on Windows")
        # Optional second factor mixed into the encryption. If you use this,
        # store it in app config / a separate secrets store — NEVER alongside
        # wrapped_vault_key in the same DB row, or it adds no protection.
        self._entropy = entropy
        # CRYPTPROTECT_LOCAL_MACHINE: any user on this machine can unwrap,
        # vs. the default (only the current Windows user account).
        self._flags = 4 if bind_to_machine else 0

    def is_available(self) -> bool:
        if platform.system() != "Windows":
            return False
        try:
            import win32crypt  # noqa: F401
            return True
        except ImportError:
            return False

    def wrap_key(self, raw_key: bytes) -> bytes:
        try:
            import win32crypt
            blob = win32crypt.CryptProtectData(
                raw_key,
                "vault_key",      # description, stored alongside the blob by Windows
                self._entropy,
                None,
                None,
                self._flags,
            )
            return blob
        except Exception as e:
            raise KeyWrapError(f"DPAPI wrap failed: {e}") from e

    def unwrap_key(self, wrapped_key: bytes) -> bytes:
        try:
            import win32crypt
            _description, raw_key = win32crypt.CryptUnprotectData(
                wrapped_key, self._entropy, None, None, self._flags
            )
            return raw_key
        except Exception as e:
            raise KeyWrapError(f"DPAPI unwrap failed: {e}") from e


class WindowsTPMKeyWrapper(PlatformKeyWrapper):
    """
    Hardware-bound tier: AES key generated and held inside the TPM via CNG's
    "Microsoft Platform Crypto Provider" (MS_PLATFORM_CRYPTO_PROVIDER).
    The key is non-exportable — wrap/unwrap both happen as TPM operations,
    so raw key bytes are never reconstructed outside the chip's boundary.

    There's no mature pywin32 wrapper for this; in practice teams either:
      (a) P/Invoke NCryptOpenStorageProvider / NCryptCreatePersistedKey via
          ctypes against ncrypt.dll, or
      (b) write a small C# helper (CNG is first-class in .NET) and call it
          from Python as a subprocess / named-pipe service.
    Since you're already maintaining a parallel C#/ASP.NET Core build of
    this system, (b) is the path of least resistance — let the C# side own
    TPM-bound keys and expose wrap/unwrap over a local IPC call that this
    class proxies to.
    """

    def __init__(self, helper_pipe_name: str = r"\\.\pipe\vault_tpm_helper"):
        if platform.system() != "Windows":
            raise UnsupportedPlatformError("TPM/CNG wrapper is only available on Windows")
        self._pipe_name = helper_pipe_name

    def is_available(self) -> bool:
        # Real check: try to open self._pipe_name and ping the helper.
        # Left as a stub — wire this up once the C# CNG helper exists.
        return platform.system() == "Windows"

    def wrap_key(self, raw_key: bytes) -> bytes:
        raise NotImplementedError(
            "Proxy this call to the C# CNG helper over named pipe / localhost gRPC. "
            "See native/WindowsTpmHelper.cs for the CNG-side implementation."
        )

    def unwrap_key(self, wrapped_key: bytes) -> bytes:
        raise NotImplementedError(
            "Proxy this call to the C# CNG helper over named pipe / localhost gRPC."
        )
