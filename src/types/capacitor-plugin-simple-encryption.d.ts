declare module 'capacitor-plugin-simple-encryption' {
    export interface SimpleEncryption {
        // Basic encryption/decryption
        encrypt(options: { data: string; key: string }): Promise<{ value: string }>;
        decrypt(options: { data: string; key: string }): Promise<{ value: string }>;
        generateKey(): Promise<{ value: string }>;
        clear(): Promise<void>;

        // PIN management
        initialize(options?: { pin?: string }): Promise<{ hasPinConfigured: boolean }>;
        verifyPin(options: { pin: string }): Promise<{ isValid: boolean }>;
        setPin(options: { newPin: string }): Promise<void>;
        removePin(): Promise<void>;

        // Biometric authentication
        verifyBiometric(options: { title: string; reason: string }): Promise<void>;
        isBiometricAvailable(): Promise<{ value: boolean }>;
        hasBiometricKey(): Promise<{ value: boolean }>;
        loadBiometricKey(): Promise<{ key: string }>;
        storeBiometricKey(options: { key: string }): Promise<void>;
        removeBiometricKey(): Promise<void>;

        // Key management
        loadKeyIntoMemory(options: { key: string }): Promise<void>;
        exportCurrentKey(): Promise<{ key: string }>;
        clearKeyFromMemory(): Promise<void>;

        // Reset
        resetAll(): Promise<void>;
    }

    export const SimpleEncryption: SimpleEncryption;
}