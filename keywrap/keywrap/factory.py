"""
Factory Pattern — client code calls KeyWrapperFactory.create() and never
imports a platform-specific module directly. This is the piece in your
notes: "It only calls a common interface, and the correct platform
implementation is selected using a Factory Pattern."
"""

import os
import platform

from .base import PlatformKeyWrapper, UnsupportedPlatformError


def _is_android() -> bool:
    # platform.system() reports "Linux" on Android too. Chaquopy/Kivy set
    # this env var; adjust if your build tooling uses a different signal.
    return "ANDROID_ARGUMENT" in os.environ or "ANDROID_ROOT" in os.environ


class KeyWrapperFactory:
    @staticmethod
    def create() -> PlatformKeyWrapper:
        system = platform.system()

        if system == "Windows":
            from .providers.windows_dpapi import WindowsDPAPIKeyWrapper
            return WindowsDPAPIKeyWrapper()

        if system == "Darwin":
            from .providers.macos_keychain import MacOSKeychainKeyWrapper
            return MacOSKeychainKeyWrapper()

        if system == "Linux" and _is_android():
            from .providers.android_keystore import AndroidKeystoreKeyWrapper
            return AndroidKeystoreKeyWrapper()

        if system == "Linux":
            from .providers.linux_secret_service import LinuxSecretServiceKeyWrapper
            return LinuxSecretServiceKeyWrapper()

        raise UnsupportedPlatformError(f"No secure key wrapper implemented for: {system}")
