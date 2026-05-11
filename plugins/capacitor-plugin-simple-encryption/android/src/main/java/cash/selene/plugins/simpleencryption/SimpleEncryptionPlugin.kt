package cash.selene.plugins.simpleencryption

import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import javax.crypto.Cipher

@CapacitorPlugin(name = "SimpleEncryption")
class SimpleEncryptionPlugin : Plugin() {
    private lateinit var keyManager: KeyManager

    override fun load() {
        keyManager = KeyManager(context)
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        val pin = call.getString("pin")

        try {
            keyManager.initialize(pin)
            val result = JSObject()
            result.put("isNative", true)
            result.put("hasPinConfigured", keyManager.hasPinConfigured())
            result.put("isReady", keyManager.isReady)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.message ?: "Initialization failed", e)
        }
    }

    @PluginMethod
    fun hasPinConfigured(call: PluginCall) {
        val result = JSObject()
        result.put("value", keyManager.hasPinConfigured())
        call.resolve(result)
    }

    @PluginMethod
    fun setPin(call: PluginCall) {
        val newPin = call.getString("newPin")
        if (newPin == null) {
            call.reject("newPin is required")
            return
        }

        try {
            keyManager.setPin(newPin)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to set PIN", e)
        }
    }

    @PluginMethod
    fun removePin(call: PluginCall) {
        try {
            keyManager.removePin()
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to remove PIN", e)
        }
    }

    @PluginMethod
    fun verifyPin(call: PluginCall) {
        val pin = call.getString("pin")
        if (pin == null) {
            call.reject("pin is required")
            return
        }

        try {
            val isValid = keyManager.verifyPin(pin)
            val result = JSObject()
            result.put("isValid", isValid)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to verify PIN", e)
        }
    }

    @PluginMethod
    fun encrypt(call: PluginCall) {
        val plainString = call.getString("data")
        if (plainString == null) {
            call.reject("data is required")
            return
        }

        var data: ByteArray? = null
        try {
            data = plainString.toByteArray(Charsets.UTF_8)
            val encrypted = keyManager.encrypt(data)
            val result = JSObject()
            result.put("data", Base64.encodeToString(encrypted, Base64.NO_WRAP))
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.message ?: "Encryption failed", e)
        } finally {
            data?.fill(0)
        }
    }

    @PluginMethod
    fun decrypt(call: PluginCall) {
        val encryptedBase64 = call.getString("data")
        if (encryptedBase64 == null) {
            call.reject("data is required")
            return
        }

        var data: ByteArray? = null
        var decrypted: ByteArray? = null
        try {
            data = Base64.decode(encryptedBase64, Base64.NO_WRAP)
            decrypted = keyManager.decrypt(data)
            val result = JSObject()
            result.put("data", String(decrypted, Charsets.UTF_8))
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.message ?: "Decryption failed", e)
        } finally {
            data?.fill(0)
            decrypted?.fill(0)
        }
    }

    // ----Key Storage Settings

    @PluginMethod
    fun setKeyStorageSettings(call: PluginCall) {
        val deviceOnly = call.getBoolean("deviceOnly") ?: false

        try {
            keyManager.setDeviceOnly(deviceOnly)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to set key storage settings", e)
        }
    }

    // ----Key Backup/Restore

    @PluginMethod
    fun exportKeyBackup(call: PluginCall) {
        val password = call.getString("password")
        if (password == null) {
            call.reject("password is required")
            return
        }

        try {
            val backupData = keyManager.exportKeyBackup(password)
            val result = JSObject()
            result.put("data", Base64.encodeToString(backupData, Base64.NO_WRAP))
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to export key backup", e)
        }
    }

    @PluginMethod
    fun importKeyBackup(call: PluginCall) {
        val dataBase64 = call.getString("data")
        if (dataBase64 == null) {
            call.reject("data is required")
            return
        }

        val password = call.getString("password")
        if (password == null) {
            call.reject("password is required")
            return
        }

        try {
            val data = Base64.decode(dataBase64, Base64.NO_WRAP)
            keyManager.importKeyBackup(data, password)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to import key backup", e)
        }
    }

    // ----Re-encryption Support

    @PluginMethod
    fun exportCurrentKey(call: PluginCall) {
        var key: ByteArray? = null
        try {
            key = keyManager.exportCurrentKey()
            val result = JSObject()
            result.put("key", Base64.encodeToString(key, Base64.NO_WRAP))
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to export key", e)
        } finally {
            key?.fill(0)
        }
    }

    @PluginMethod
    fun decryptWithExplicitKey(call: PluginCall) {
        val encryptedBase64 = call.getString("data")
        if (encryptedBase64 == null) {
            call.reject("data is required")
            return
        }

        val keyBase64 = call.getString("key")
        if (keyBase64 == null) {
            call.reject("key is required")
            return
        }

        var key: ByteArray? = null
        var decrypted: ByteArray? = null
        try {
            key = Base64.decode(keyBase64, Base64.NO_WRAP)
            val data = Base64.decode(encryptedBase64, Base64.NO_WRAP)
            decrypted = keyManager.decryptWithKey(data, key)
            val result = JSObject()
            result.put("data", String(decrypted, Charsets.UTF_8))
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.message ?: "Decryption failed", e)
        } finally {
            key?.fill(0)
            decrypted?.fill(0)
        }
    }

    @PluginMethod
    fun loadKeyIntoMemory(call: PluginCall) {
        val keyBase64 = call.getString("key")
        if (keyBase64 == null) {
            call.reject("key is required")
            return
        }

        try {
            val key = Base64.decode(keyBase64, Base64.NO_WRAP)
            keyManager.loadKeyIntoMemory(key)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to load key into memory", e)
        }
    }

    @PluginMethod
    fun replaceKey(call: PluginCall) {
        val keyBase64 = call.getString("key")
        if (keyBase64 == null) {
            call.reject("key is required")
            return
        }

        try {
            val key = Base64.decode(keyBase64, Base64.NO_WRAP)
            keyManager.replaceKey(key)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to replace key", e)
        }
    }

    // ----Biometric Key Storage

    @PluginMethod
    fun storeBiometricKey(call: PluginCall) {
        val keyBase64 = call.getString("key")
        if (keyBase64 == null) {
            call.reject("key is required")
            return
        }

        val activity = activity as? FragmentActivity
        if (activity == null) {
            call.reject("Activity not available for biometric prompt")
            return
        }

        val title = call.getString("title") ?: "Selene Wallet"
        val reason = call.getString("reason") ?: "Authenticate to enable biometric unlock"

        try {
            val key = Base64.decode(keyBase64, Base64.NO_WRAP)
            val cipher = keyManager.getBiometricEncryptCipher()
            val executor = ContextCompat.getMainExecutor(context)

            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        val authenticatedCipher = result.cryptoObject?.cipher
                            ?: throw EncryptionException.CryptoError("No cipher from biometric result")
                        keyManager.storeBiometricKey(key, authenticatedCipher)
                        call.resolve()
                    } catch (e: Exception) {
                        call.reject(e.message ?: "Failed to store biometric key", e)
                    } finally {
                        key.fill(0)
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    key.fill(0)
                    call.reject("Biometric authentication failed: $errString")
                }

                override fun onAuthenticationFailed() {
                    // Called on individual attempt failure, not final - don't reject yet
                }
            }

            activity.runOnUiThread {
                val prompt = BiometricPrompt(activity, executor, callback)
                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(reason)
                    .setNegativeButtonText(context.getString(R.string.biometric_prompt_cancel))
                    .build()
                prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
            }
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to store biometric key", e)
        }
    }

    @PluginMethod
    fun loadBiometricKey(call: PluginCall) {
        val activity = activity as? FragmentActivity
        if (activity == null) {
            call.reject("Activity not available for biometric prompt")
            return
        }

        val title = call.getString("title") ?: "Authorize"
        val reason = call.getString("reason") ?: ""

        try {
            val cipher = keyManager.getBiometricDecryptCipher()
            val executor = ContextCompat.getMainExecutor(context)

            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    var key: ByteArray? = null
                    try {
                        val authenticatedCipher = result.cryptoObject?.cipher
                            ?: throw EncryptionException.CryptoError("No cipher from biometric result")
                        key = keyManager.decryptBiometricKey(authenticatedCipher)
                        val jsResult = JSObject()
                        jsResult.put("key", Base64.encodeToString(key, Base64.NO_WRAP))
                        call.resolve(jsResult)
                    } catch (e: Exception) {
                        call.reject(e.message ?: "Failed to decrypt biometric key", e)
                    } finally {
                        key?.fill(0)
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    call.reject("Biometric authentication failed: $errString")
                }

                override fun onAuthenticationFailed() {
                    // Called on individual attempt failure, not final - don't reject yet
                }
            }

            activity.runOnUiThread {
                val prompt = BiometricPrompt(activity, executor, callback)
                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(reason)
                    .setNegativeButtonText(context.getString(R.string.biometric_prompt_cancel))
                    .build()
                prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
            }
        } catch (e: Exception) {
            call.reject(e.message ?: "Failed to load biometric key", e)
        }
    }

    @PluginMethod
    fun hasBiometricKey(call: PluginCall) {
        val result = JSObject()
        result.put("value", keyManager.hasBiometricKey())
        call.resolve(result)
    }

    @PluginMethod
    fun removeBiometricKey(call: PluginCall) {
        keyManager.deleteBiometricKey()
        call.resolve()
    }

    // ----Biometric Availability & Verification

    @PluginMethod
    fun isBiometricAvailable(call: PluginCall) {
        val canAuthenticate = BiometricManager.from(context)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        val result = JSObject()
        result.put("value", canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS)
        call.resolve(result)
    }

    @PluginMethod
    fun verifyBiometric(call: PluginCall) {
        val activity = activity as? FragmentActivity
        if (activity == null) {
            call.reject("Activity not available for biometric prompt")
            return
        }

        val title = call.getString("title") ?: "Authorize"
        val reason = call.getString("reason") ?: ""

        val executor = ContextCompat.getMainExecutor(context)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                call.resolve()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                call.reject("Biometric authentication failed: $errString")
            }

            override fun onAuthenticationFailed() {
                // Called on individual attempt failure, not final - don't reject yet
            }
        }

        activity.runOnUiThread {
            val prompt = BiometricPrompt(activity, executor, callback)
            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(reason)
                .setNegativeButtonText(context.getString(R.string.biometric_prompt_cancel))
                .build()
            prompt.authenticate(promptInfo)
        }
    }

    // ----Key Clearing

    @PluginMethod
    fun clearKeyFromMemory(call: PluginCall) {
        keyManager.clearKey()
        call.resolve()
    }

    // ----Nuclear Reset

    @PluginMethod
    fun resetAll(call: PluginCall) {
        keyManager.resetAll()
        call.resolve()
    }

    // ----App Settings (no-op on Android — no per-app biometric permissions)

    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        call.resolve()
    }
}
