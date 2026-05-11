import Foundation
import Capacitor
import CryptoKit
import LocalAuthentication

@objc(SimpleEncryptionPlugin)
public class SimpleEncryptionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SimpleEncryptionPlugin"
    public let jsName = "SimpleEncryption"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasPinConfigured", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPin", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removePin", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verifyPin", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "encrypt", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "decrypt", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeyStorageSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportKeyBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "importKeyBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportCurrentKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "decryptWithExplicitKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "replaceKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadKeyIntoMemory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "storeBiometricKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadBiometricKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasBiometricKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeBiometricKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isBiometricAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verifyBiometric", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearKeyFromMemory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resetAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise)
    ]

    private let keyManager = KeyManager()

    // MARK: - Plugin Methods

    @objc func initialize(_ call: CAPPluginCall) {
        let pin = call.getString("pin")

        do {
            try keyManager.initialize(pin: pin)

            call.resolve([
                "isNative": true,
                "hasPinConfigured": keyManager.hasPinConfigured(),
                "isReady": keyManager.isReady
            ])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func hasPinConfigured(_ call: CAPPluginCall) {
        call.resolve(["value": keyManager.hasPinConfigured()])
    }

    @objc func setPin(_ call: CAPPluginCall) {
        guard let newPin = call.getString("newPin") else {
            call.reject("newPin is required")
            return
        }

        do {
            try keyManager.setPin(newPin: newPin)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func removePin(_ call: CAPPluginCall) {
        do {
            try keyManager.removePin()
            call.resolve()
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func verifyPin(_ call: CAPPluginCall) {
        guard let pin = call.getString("pin") else {
            call.reject("pin is required")
            return
        }

        do {
            let isValid = try keyManager.verifyPin(pin)
            call.resolve(["isValid": isValid])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func encrypt(_ call: CAPPluginCall) {
        guard let plainString = call.getString("data") else {
            call.reject("data is required")
            return
        }

        guard let data = plainString.data(using: .utf8) else {
            call.reject("Failed to encode string as UTF-8")
            return
        }

        do {
            let encrypted = try keyManager.encrypt(data: data)
            call.resolve(["data": encrypted.base64EncodedString()])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func decrypt(_ call: CAPPluginCall) {
        guard let encryptedBase64 = call.getString("data") else {
            call.reject("data is required")
            return
        }

        guard let data = Data(base64Encoded: encryptedBase64) else {
            call.reject("Invalid base64 data")
            return
        }

        do {
            let decrypted = try keyManager.decrypt(data: data)
            guard let plainString = String(data: decrypted, encoding: .utf8) else {
                call.reject("Failed to decode decrypted data as UTF-8")
                return
            }
            call.resolve(["data": plainString])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    // MARK: - Key Storage Settings

    @objc func setKeyStorageSettings(_ call: CAPPluginCall) {
        let deviceOnly = call.getBool("deviceOnly") ?? false

        do {
            try keyManager.setDeviceOnly(deviceOnly)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    // MARK: - Key Backup/Restore

    @objc func exportKeyBackup(_ call: CAPPluginCall) {
        guard let password = call.getString("password") else {
            call.reject("password is required")
            return
        }

        do {
            let backupData = try keyManager.exportKeyBackup(password: password)
            call.resolve(["data": backupData.base64EncodedString()])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func importKeyBackup(_ call: CAPPluginCall) {
        guard let dataBase64 = call.getString("data") else {
            call.reject("data is required")
            return
        }

        guard let password = call.getString("password") else {
            call.reject("password is required")
            return
        }

        guard let data = Data(base64Encoded: dataBase64) else {
            call.reject("Invalid base64 data")
            return
        }

        do {
            try keyManager.importKeyBackup(data: data, password: password)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    // MARK: - Re-encryption Support

    @objc func exportCurrentKey(_ call: CAPPluginCall) {
        do {
            let key = try keyManager.exportCurrentKey()
            call.resolve(["key": key.base64EncodedString()])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func decryptWithExplicitKey(_ call: CAPPluginCall) {
        guard let encryptedBase64 = call.getString("data") else {
            call.reject("data is required")
            return
        }

        guard let keyBase64 = call.getString("key") else {
            call.reject("key is required")
            return
        }

        guard var key = Data(base64Encoded: keyBase64) else {
            call.reject("Invalid base64 key")
            return
        }
        defer { keyManager.zeroData(&key) }

        guard let data = Data(base64Encoded: encryptedBase64) else {
            call.reject("Invalid base64 data")
            return
        }

        do {
            let decrypted = try keyManager.decryptAESGCM(data: data, key: key)
            guard let plainString = String(data: decrypted, encoding: .utf8) else {
                call.reject("Failed to decode decrypted data as UTF-8")
                return
            }
            call.resolve(["data": plainString])
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func loadKeyIntoMemory(_ call: CAPPluginCall) {
        guard let keyBase64 = call.getString("key") else {
            call.reject("key is required")
            return
        }

        guard let key = Data(base64Encoded: keyBase64) else {
            call.reject("Invalid base64 key")
            return
        }

        do {
            try keyManager.loadKeyIntoMemory(key)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    @objc func replaceKey(_ call: CAPPluginCall) {
        guard let keyBase64 = call.getString("key") else {
            call.reject("key is required")
            return
        }

        guard let key = Data(base64Encoded: keyBase64) else {
            call.reject("Invalid base64 key")
            return
        }

        do {
            try keyManager.replaceKey(key)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }

    // MARK: - Biometric Key Storage

    @objc func storeBiometricKey(_ call: CAPPluginCall) {
        guard let keyBase64 = call.getString("key") else {
            call.reject("key is required")
            return
        }

        guard var key = Data(base64Encoded: keyBase64) else {
            call.reject("Invalid base64 key")
            return
        }

        let title = call.getString("title") ?? "Selene Wallet"
        let reason = call.getString("reason") ?? "Authenticate to enable biometric unlock"

        // Verify biometric before storing — matches Android BiometricPrompt behavior
        DispatchQueue.global(qos: .userInitiated).async {
            let context = LAContext()
            context.localizedFallbackTitle = ""
            context.localizedCancelTitle = title

            var authError: NSError?
            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
                self.keyManager.zeroData(&key)
                call.reject("Biometric not available: \(authError?.localizedDescription ?? "unknown")")
                return
            }

            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                defer { self.keyManager.zeroData(&key) }

                if !success {
                    call.reject("Biometric authentication failed: \(error?.localizedDescription ?? "unknown")")
                    return
                }

                do {
                    try self.keyManager.storeBiometricKey(key)
                    call.resolve()
                } catch {
                    call.reject(error.localizedDescription, nil, error)
                }
            }
        }
    }

    @objc func loadBiometricKey(_ call: CAPPluginCall) {
        let reason = call.getString("reason")

        // Run on background thread - biometric prompt blocks
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                var key = try self.keyManager.loadBiometricKey(reason: reason)
                let encoded = key.base64EncodedString()
                self.keyManager.zeroData(&key)
                call.resolve(["key": encoded])
            } catch {
                call.reject(error.localizedDescription, nil, error)
            }
        }
    }

    @objc func hasBiometricKey(_ call: CAPPluginCall) {
        call.resolve(["value": keyManager.hasBiometricKey()])
    }

    @objc func removeBiometricKey(_ call: CAPPluginCall) {
        keyManager.deleteBiometricKey()
        call.resolve()
    }

    @objc func isBiometricAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        let isAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        call.resolve(["value": isAvailable])
    }

    @objc func verifyBiometric(_ call: CAPPluginCall) {
        var reason = call.getString("reason") ?? "Authorize"
        if reason.isEmpty { reason = "Authorize" }

        // Run on background thread - biometric prompt blocks
        DispatchQueue.global(qos: .userInitiated).async {
            let context = LAContext()
            context.localizedFallbackTitle = "" // Hide device passcode fallback

            var authError: NSError?
            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
                call.reject("Biometric authentication not available: \(authError?.localizedDescription ?? "unknown")")
                return
            }

            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if success {
                    call.resolve()
                } else {
                    call.reject("Biometric authentication failed: \(error?.localizedDescription ?? "unknown")")
                }
            }
        }
    }

    // MARK: - Key Clearing

    @objc func clearKeyFromMemory(_ call: CAPPluginCall) {
        keyManager.clearKey()
        call.resolve()
    }

    // MARK: - Nuclear Reset

    @objc func resetAll(_ call: CAPPluginCall) {
        keyManager.resetAll()
        call.resolve()
    }

    // MARK: - App Settings

    @objc func openAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Cannot open settings URL")
                return
            }
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve()
                } else {
                    call.reject("Failed to open settings")
                }
            }
        }
    }

}
