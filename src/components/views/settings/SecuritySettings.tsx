import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService";
import { selectAuthMode, selectSecuritySettings, setAuthMode, setAuthActions } from "@/redux/preferences";

type View = "main" | "setPin" | "confirmPin" | "currentPin" | "phrase";

export default function SecuritySettings() {
  const dispatch = useDispatch();
  const authMode = useSelector(selectAuthMode);
  const { authActions: securityActions } = useSelector(selectSecuritySettings);
  const [view, setView] = useState<View>("main");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pinConfigured, setPinConfigured] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phrase, setPhrase] = useState("");
  const [revealPhrase, setRevealPhrase] = useState(false);

  const Security = SecurityService();

  useEffect(() => {
    (async () => {
      const configured = Security.isPinConfigured();
      setPinConfigured(configured);

      try {
        const avail = await Security.isBiometricAvailable();
        setBioAvailable(avail);
        if (avail) {
          const hasBio = await Security.hasBiometricKey();
          setBioEnabled(hasBio);
        }
      } catch {
        // biometric not supported
      }

      const mnemonic = KeyManagerService().getMnemonic();
      if (mnemonic) setPhrase(mnemonic);

      setLoading(false);
    })();

    return () => KeyManagerService().clearMnemonic();
  }, []);

  const resetFlow = useCallback(() => {
    setView("main");
    setPin("");
    setError("");
    setSuccess("");
    setRevealPhrase(false);
  }, []);

  const startSetPin = useCallback(() => {
    setSuccess("");
    if (pinConfigured) {
      setView("currentPin");
    } else {
      setView("setPin");
    }
    setPin("");
    setError("");
  }, [pinConfigured]);

  const handleCurrentPin = useCallback(async () => {
    try {
      const isValid = await Security.verifyPin(pin);
      if (isValid) {
        await Security.initEncryption(pin);
        setPin("");
        setError("");
        setView("setPin");
      } else {
        setError("Incorrect PIN");
        setPin("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "PIN verification failed");
      setPin("");
    }
  }, [pin, Security]);

  const handleSetPin = useCallback(() => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    setView("confirmPin");
    setError("");
  }, [pin]);

  const handleConfirmPin = useCallback(async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    try {
      if (pinConfigured) {
        await Security.setPin(pin);
      } else {
        await Security.setPin(pin);
      }
      setPinConfigured(true);
      dispatch(setAuthMode("pin"));
      setSuccess("PIN updated successfully");
      resetFlow();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set PIN");
    }
  }, [pin, pinConfigured, Security, dispatch, resetFlow]);

  const handleRemovePin = useCallback(async () => {
    try {
      await Security.removePin();
      setPinConfigured(false);
      dispatch(setAuthMode("none"));
      setSuccess("PIN removed");
      resetFlow();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove PIN");
    }
  }, [Security, dispatch, resetFlow]);

  const toggleBiometric = useCallback(async () => {
    try {
      if (bioEnabled) {
        await Security.removeBiometricKey();
        setBioEnabled(false);
      } else {
        await Security.storeBiometricKeyFromCurrent();
        setBioEnabled(true);
      }
    } catch {
      setError("Biometric operation failed");
    }
  }, [bioEnabled, Security]);

  const handleReset = useCallback(async () => {
    await Security.resetEncryption();
    setPinConfigured(false);
    setBioEnabled(false);
    dispatch(setAuthMode("none"));
    KeyManagerService().generateWallet();
    setSuccess("Wallet reset. New wallet generated.");
    resetFlow();
  }, [Security, dispatch, resetFlow]);

  if (loading) {
    return (
      <div>
        <ViewHeader title="Security" subtitle="PIN, biometric, and recovery" showBack />

  
        <div className="px-4 text-sm text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (view === "setPin" || view === "currentPin") {
    const isCurrent = view === "currentPin";
    return (
      <div>
        <ViewHeader
          title={isCurrent ? "Current PIN" : "New PIN"}
          subtitle={isCurrent ? "Enter your current PIN" : "Enter a new PIN (4+ digits)"}
        />
        <div className="flex flex-col items-center gap-6 px-4 pt-8">
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 border-primary ${
                  pin.length > i ? "bg-primary" : ""
                }`}
              />
            ))}
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="grid grid-cols-3 gap-4 max-w-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => { setPin((p) => p + String(d)); setError(""); }}
                className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl font-bold active:bg-neutral-700"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl active:bg-neutral-700"
            >
              ⌫
            </button>
            <button
              onClick={() => { setPin((p) => p + "0"); setError(""); }}
              className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl font-bold active:bg-neutral-700"
            >
              0
            </button>
            <button
              onClick={isCurrent ? handleCurrentPin : handleSetPin}
              disabled={pin.length < 4}
              className="w-16 h-16 rounded-full bg-primary text-white text-xl font-bold disabled:opacity-40"
            >
              ✓
            </button>
          </div>
          <button onClick={resetFlow} className="text-neutral-400 text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  if (view === "confirmPin") {
    return (
      <div>
        <ViewHeader title="Confirm PIN" subtitle="Re-enter your new PIN" />
        <div className="flex flex-col items-center gap-6 px-4 pt-8">
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 border-primary ${
                  pin.length > i ? "bg-primary" : ""
                }`}
              />
            ))}
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="grid grid-cols-3 gap-4 max-w-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => { setPin((p) => p + String(d)); setError(""); }}
                className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl font-bold active:bg-neutral-700"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl active:bg-neutral-700"
            >
              ⌫
            </button>
            <button
              onClick={() => { setPin((p) => p + "0"); setError(""); }}
              className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl font-bold active:bg-neutral-700"
            >
              0
            </button>
            <button
              onClick={handleConfirmPin}
              disabled={pin.length < 4}
              className="w-16 h-16 rounded-full bg-primary text-white text-xl font-bold disabled:opacity-40"
            >
              ✓
            </button>
          </div>
          <button onClick={resetFlow} className="text-neutral-400 text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ViewHeader title="Security" subtitle="PIN, biometric, and recovery" />

      <div className="flex flex-col gap-4 px-4">
        {success && (
          <div className="p-3 rounded-lg bg-success-light/20 text-success text-sm text-center">
            {success}
          </div>
        )}

        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="font-medium text-neutral-800 dark:text-neutral-100">
              {pinConfigured ? "Change PIN" : "Set PIN"}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {pinConfigured
                ? "Change or remove your lock screen PIN"
                : "Protect your wallet with a lock screen PIN"}
            </div>
          </div>
          <div className="flex">
            <button
              onClick={startSetPin}
              className="flex-1 p-3 text-sm font-medium text-primary border-r border-neutral-200 dark:border-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-700"
            >
              {pinConfigured ? "Change" : "Set PIN"}
            </button>
            {pinConfigured && (
              <button
                onClick={handleRemovePin}
                className="flex-1 p-3 text-sm font-medium text-error active:bg-neutral-100 dark:active:bg-neutral-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {bioAvailable && (
          <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium text-neutral-800 dark:text-neutral-100">
                  Biometric Unlock
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Use fingerprint or face to unlock
                </div>
              </div>
              <button
                onClick={toggleBiometric}
                className={`w-12 h-7 rounded-full transition-colors ${
                  bioEnabled ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    bioEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {pinConfigured && (
          <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="font-medium text-neutral-800 dark:text-neutral-100">
                Require Authorization For
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Actions that need PIN or biometric confirmation
              </div>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {(Object.values(AuthActions) as AuthActions[]).map((action) => {
                const isEnabled = securityActions.includes(action);
                return (
                  <div key={action} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-neutral-800 dark:text-neutral-100">
                      {action === AuthActions.Any ? "App Lock" :
                       action === AuthActions.AppResume ? "App Resume" :
                       action === AuthActions.SendTransaction ? "Send Transaction" :
                       action === AuthActions.RevealBalance ? "Reveal Balance" :
                       action === AuthActions.RevealPrivateKeys ? "Reveal Private Keys" : action}
                    </span>
                    <button
                      onClick={() => {
                        const current = new Set(securityActions);
                        if (action === AuthActions.Any) {
                          // Toggle all
                          const all = Object.values(AuthActions) as string[];
                          const allOn = current.size === all.length;
                          dispatch(setAuthActions(allOn ? "" : all.join(";")));
                        } else {
                          if (isEnabled) current.delete(action);
                          else current.add(action);
                          // Always include Any
                          current.add(AuthActions.Any);
                          dispatch(setAuthActions(Array.from(current).join(";")));
                        }
                      }}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        isEnabled ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        isEnabled ? "translate-x-5" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="p-4">
            <div className="font-medium text-neutral-800 dark:text-neutral-100">
              Recovery Phrase
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              Your 12-word recovery phrase keeps access to your wallet
            </div>
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-700">
            {revealPhrase && phrase ? (
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {phrase.split(" ").map((word, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-neutral-100 dark:bg-neutral-700 text-xs font-mono text-neutral-800 dark:text-neutral-100"
                    >
                      {i + 1}. {word}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setRevealPhrase(false)}
                  className="w-full p-2 text-xs text-primary border border-primary rounded-full"
                >
                  Hide
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRevealPhrase(true)}
                className="w-full p-3 text-sm font-medium text-primary active:bg-neutral-100 dark:active:bg-neutral-700"
              >
                Show Recovery Phrase
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-error/30 overflow-hidden">
          <div className="p-4">
            <div className="font-medium text-error">Reset Wallet</div>
            <div className="text-xs text-neutral-500 mt-1">
              Reset encryption and generate a new wallet
            </div>
          </div>
          <div className="border-t border-error/30">
            <button
              onClick={handleReset}
              className="w-full p-3 text-sm font-medium text-error active:bg-error-light/10"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
