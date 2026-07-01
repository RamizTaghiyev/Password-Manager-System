/*
 * Platform component for Android — implements the same wrap/unwrap
 * contract as keywrap.base.PlatformKeyWrapper, just in Kotlin since
 * that's what actually has access to android.security.keystore.*.
 *
 * Prefers StrongBox (dedicated secure chip, like a TPM) and falls back
 * to the TEE-backed Keystore on devices that don't have one.
 */

package com.yourapp.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.security.keystore.StrongBoxUnavailableException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object VaultKeystore {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "vault_wrap_key"
    private const val GCM_TAG_LENGTH_BITS = 128
    private const val NONCE_LENGTH_BYTES = 12

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

        keyStore.getKey(KEY_ALIAS, null)?.let { return it as SecretKey }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE
        )

        fun buildSpec(useStrongBox: Boolean) = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            // Require the user to have authenticated (biometric/PIN) within
            // the last `setUserAuthenticationValidityDurationSeconds`, or
            // require it per-use by setting that to -1 with biometric-bound keys.
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationValidityDurationSeconds(30)
            .setIsStrongBoxBacked(useStrongBox)
            .build()

        try {
            keyGenerator.init(buildSpec(useStrongBox = true))
        } catch (e: StrongBoxUnavailableException) {
            // Device has no dedicated secure chip — fall back to the
            // TEE-backed (non-StrongBox) Keystore implementation.
            keyGenerator.init(buildSpec(useStrongBox = false))
        }

        return keyGenerator.generateKey()
    }

    fun wrapKey(rawKey: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val ciphertext = cipher.doFinal(rawKey)
        // iv (nonce) must travel with the ciphertext to unwrap later.
        return cipher.iv + ciphertext
    }

    fun unwrapKey(wrappedKey: ByteArray): ByteArray {
        val nonce = wrappedKey.copyOfRange(0, NONCE_LENGTH_BYTES)
        val ciphertext = wrappedKey.copyOfRange(NONCE_LENGTH_BYTES, wrappedKey.size)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), spec)
        return cipher.doFinal(ciphertext)
    }
}
