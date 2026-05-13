declare module 'capacitor-simple-encryption' {
    export interface SimpleEncryption {
        // Basic encryption/decryption
        encrypt(options: { data: string }): Promise<{ data: string }>;
        decrypt(options: { data: string }): Promise<{ data: string }>;
        decryptWithExplicitKey(options: { data: string; key: string }): Promise<{ data: string }>;
        
        // Initialization
        initialize(options?: { pin?: string }): Promise<{ 
            isNative: boolean; 
            hasPinConfigured: boolean; 
            isReady: boolean; 
        }>;
        hasPinConfigured(): Promise<{ value: boolean }>;

        // PIN management
        verifyPin(options: { pin: string }): Promise<{ isValid: boolean }>;
        setPin(options: { newPin: string }): Promise<void>;
        removePin(): Promise<void>;

        // Biometric authentication
        verifyBiometric(options?: { title?: string; reason?: string }): Promise<void>;
        isBiometricAvailable(): Promise<{ value: boolean }>;
        hasBiometricKey(): Promise<{ value: boolean }>;
        loadBiometricKey(options?: { title?: string; reason?: string }): Promise<{ key: string }>;
        storeBiometricKey(options: { key: string }): Promise<void>;
        removeBiometricKey(): Promise<void>;

        // Key management
        exportCurrentKey(): Promise<{ key: string }>;
        replaceKey(options: { key: string }): Promise<void>;
        loadKeyIntoMemory(options: { key: string }): Promise<void>;
        clearKeyFromMemory(): Promise<void>;
        
        // Settings
        setKeyStorageSettings(options: { deviceOnly: boolean }): Promise<void>;

        // Key Backup & Recovery
        exportKeyBackup(options: { password: string }): Promise<{ data: string }>;
        importKeyBackup(options: { data: string; password: string }): Promise<void>;

        // Reset
        resetAll(): Promise<void>;
    }

    export const SimpleEncryption: SimpleEncryption;
}