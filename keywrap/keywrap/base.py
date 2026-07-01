"""
Abstract Interface — the box at the top of your architecture diagram.

                 ┌──────────────────────┐
                  │     Client Code      │
                  └──────────┬───────────┘
                             │ Uses
                             ▼
                  ┌──────────────────────┐
                  │  Abstract Interface  │   <-- this file
                  └──────────────────────┘
                             ▲
              ┌──────────────┴──────────────┐
              │ Implements                  │ Implements
  ┌───────────┴───────────┐     ┌───────────┴───────────┐
  │ Platform A Component  │     │ Platform B Component  │
  └───────────────────────┘     └───────────────────────┘

Contract:
  - The database NEVER stores the raw 32-byte AES-256 vault key.
  - It stores wrap_key()'s output as `wrapped_vault_key`.
  - unwrap_key() is the only place the raw key is reconstructed, and it
    only succeeds on the device/user the key was wrapped for, because the
    OS-level secret backing it (DPAPI master key, Keychain item, Keystore
    alias) never leaves that device.
  - Client code (your vault service) only ever talks to this interface —
    it never imports win32crypt / Keychain / Keystore directly. That's
    the whole point of the Factory Pattern: swap platforms without
    touching business logic.
"""

from abc import ABC, abstractmethod


class KeyWrapError(Exception):
    """Wrap/unwrap failed: wrong device, locked TPM, user cancelled biometric prompt, etc."""


class UnsupportedPlatformError(Exception):
    """No secure module is available for the current platform/runtime."""


class PlatformKeyWrapper(ABC):
    @abstractmethod
    def wrap_key(self, raw_key: bytes) -> bytes:
        """Encrypt raw_key (the AES-256 vault key) using this platform's
        secure module. Returns an opaque blob safe to persist in the DB."""
        raise NotImplementedError

    @abstractmethod
    def unwrap_key(self, wrapped_key: bytes) -> bytes:
        """Reverse of wrap_key. Only works on the device/user it was
        wrapped for. Raises KeyWrapError on failure."""
        raise NotImplementedError

    @abstractmethod
    def is_available(self) -> bool:
        """True if this platform's secure module is actually usable right now
        (right OS, required library installed, hardware present)."""
        raise NotImplementedError
