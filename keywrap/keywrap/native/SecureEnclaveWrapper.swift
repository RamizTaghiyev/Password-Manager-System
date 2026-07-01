/*
 * Platform component for iOS — true Secure Enclave hardware key.
 *
 * Same caveat as Android: this needs Security.framework /
 * LocalAuthentication, an Xcode-signed app, and the Secure Enclave
 * entitlement. Not reachable from plain CPython. If your client is
 * Python-based on iOS at all (rare — usually Pyto/Pythonista only), proxy
 * to this exact pattern through PyObjC instead of reimplementing it.
 *
 * Note: Secure Enclave only generates/holds asymmetric (EC P-256) keys —
 * it doesn't do AES directly. The standard pattern is: derive a shared
 * AES key via ECDH with the Secure Enclave private key, then use that
 * AES key for GCM wrap/unwrap of the vault key, same envelope pattern
 * as the macOS/Linux modules above.
 */

import Security
import LocalAuthentication

enum VaultKeyError: Error {
    case enclaveUnavailable
    case keyGenerationFailed
    case wrapFailed
    case unwrapFailed
}

final class SecureEnclaveWrapper {
    private let tag = "com.yourapp.vault.enclavekey".data(using: .utf8)!

    private func getOrCreatePrivateKey() throws -> SecKey {
        // Look for an existing key first.
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true
        ]
        var item: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess {
            return item as! SecKey
        }

        // Gate usage with biometrics (Touch ID / Face ID).
        let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            [.privateKeyUsage, .biometryCurrentSet],
            nil
        )!

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tag,
                kSecAttrAccessControl as String: access
            ]
        ]

        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            throw VaultKeyError.keyGenerationFailed
        }
        return privateKey
    }

    // wrapKey/unwrapKey would use SecKeyCopyPublicKey + ECDH key agreement
    // (SecKeyCopyKeyExchangeResult) to derive a shared AES key, then
    // AES-GCM encrypt/decrypt rawKey with it — same envelope shape as the
    // other platform modules. Omitted here since it's ~40 more lines of
    // ECDH bookkeeping with no new architectural ideas; the key-generation
    // logic above is the part that's actually Secure-Enclave-specific.
}
