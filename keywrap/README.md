# Cross-Platform Vault Key Wrapping

Implements the architecture from your notes: an abstract interface, a
Factory Pattern that picks the right platform component, and one
implementation per secure module (DPAPI/TPM, Keychain/Secure Enclave,
Android Keystore/StrongBox).

```
keywrap/
  base.py                          # abstract interface (PlatformKeyWrapper)
  factory.py                       # KeyWrapperFactory.create()
  providers/
    windows_dpapi.py               # DPAPI (working) + TPM/CNG (stub, see below)
    macos_keychain.py              # Keychain envelope-encryption (working)
    linux_secret_service.py        # bonus: GNOME Keyring/KWallet (working)
    android_keystore.py            # Python-side bridge stub (Chaquopy only)
  native/
    VaultKeystore.kt               # real Android Keystore/StrongBox impl
    SecureEnclaveWrapper.swift     # real iOS Secure Enclave impl
demo.py                            # ties it into your AES-256-GCM vault flow
```

## The one thing that changes your architecture

**This code cannot run inside `main.py` (your Flask server).** DPAPI,
Keychain, and Android Keystore are all OS-local APIs scoped to a process
running *on the user's device*. A browser hitting your Flask routes has
no way to reach them, and neither does your server process sitting on a
host somewhere.

That means "client-side vs. server-side unwrapping" isn't really an open
choice — it has to be client-side, full stop, if you want the hardware
binding your spec describes. The practical split:

- **Flask (`main.py`)**: stores `wrapped_vault_key` as an opaque column,
  serves it to authenticated clients, never sees the raw key. Everything
  in this repo today (bcrypt, TOTP, JWT/RBAC) stays exactly as is.
- **A native client per platform** (Windows desktop app, macOS app,
  Android app): owns this `keywrap` package (or `VaultKeystore.kt` /
  `SecureEnclaveWrapper.swift` natively), does wrap/unwrap locally, and
  only ever sends the *wrapped* blob over the network to sync it.

If your "Personal dashboard" is meant to be a plain web page, you have
two honest options: (1) ship a thin native companion app/agent just for
vault unlock, which is what 1Password/Bitwarden desktop apps actually do,
or (2) drop the hardware-binding requirement for the web client and use a
password-derived key (Argon2id) instead — weaker guarantee, but it's
real for a browser. Worth deciding explicitly before you build further,
since it changes what "Super Admin" access actually means for the web
flow.

## Dependencies

| Platform | Install |
|---|---|
| Windows (DPAPI) | `pip install pywin32` |
| macOS (Keychain) | `pip install keyring pycryptodome` |
| Linux (Secret Service) | `pip install keyring pycryptodome secretstorage` |
| Android | Kotlin only — no pip install; wire `VaultKeystore.kt` into your Android project |
| iOS | Swift only — `SecureEnclaveWrapper.swift` into your Xcode project |

## What's a working implementation vs. a documented stub

- **Working today**: Windows DPAPI, macOS Keychain, Linux Secret Service —
  all three actually wrap/unwrap bytes if you run `demo.py` on that OS.
- **Stub with a clear next step**: `WindowsTPMKeyWrapper` (true TPM-bound
  CNG keys need a small C# helper, since you're already building the
  ASP.NET Core version — CNG is first-class there). `AndroidKeystoreKeyWrapper`
  is a real bridge *if* you're running Python on Android via Chaquopy;
  otherwise the truth lives in `VaultKeystore.kt`, which is a complete,
  working Kotlin implementation with StrongBox-with-fallback already
  written out.

## Try it

```bash
pip install pycryptodome keyring  # + pywin32 on Windows
python demo.py
```

This generates a vault key, wraps it with whatever provider your current
OS resolves to via the factory, "stores" the wrapped blob, unwraps it
back, and uses it to AES-GCM encrypt/decrypt a sample credential — the
same shape as your "Personal dashboard" flow.
