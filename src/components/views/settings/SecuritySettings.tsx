import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService";
import {
  selectAuthMode,
  selectSecuritySettings,
  setAuthMode,
  setAuthActions,
} from "@/redux/preferences";
import { useTranslation } from "@/translations";

const Security = SecurityService();

export default function SecuritySettings() {
  const dispatch = useDispatch();
  const authMode = useSelector(selectAuthMode);
  const { authActions } = useSelector(selectSecuritySettings);
  const { t } = useTranslation();
  const [isPinConfigured, setIsPinConfigured] = useState(false);

  useEffect(function syncPinState() {
    setIsPinConfigured(Security.isPinConfigured());
  }, [authMode]);

  const handleSetPin = useCallback(async () => {
    const pin = await Security.promptForNewPin();
    if (!pin) return;
    await Security.setPin(pin);
    setIsPinConfigured(true);
    dispatch(setAuthMode("pin"));
    dispatch(setAuthActions("Any;AppResume;SendTransaction;RevealBalance;RevealPrivateKeys"));
  }, [dispatch]);

  const handleRemovePin = useCallback(async () => {
    const authorized = await Security.authorize(AuthActions.Any);
    if (!authorized) return;
    await Security.removePin();
    setIsPinConfigured(false);
    dispatch(setAuthMode("none"));
    dispatch(setAuthActions("Any;SendTransaction;RevealBalance"));
  }, [dispatch]);

  const toggleAuthAction = useCallback((action: string) => {
    const current = authActions;
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    dispatch(setAuthActions(next.join(";")));
  }, [authActions, dispatch]);

  const isPinActive = authMode === "pin" || authMode === "password";

  return (
    <div>
      <ViewHeader title={t("security.settings.title")} subtitle={t("security.settings.subtitle")} showBack />
      <div className="flex flex-col px-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold text-neutral-800 dark:text-neutral-100">PIN Protection</p>
              <p className="text-xs text-neutral-500">
                {isPinConfigured ? "PIN is set" : "No PIN configured"}
              </p>
            </div>
            {isPinConfigured ? (
              <button
                onClick={handleRemovePin}
                className="rounded-full bg-error/10 px-4 py-2 text-sm font-semibold text-error"
              >
                Remove PIN
              </button>
            ) : (
              <button
                onClick={handleSetPin}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Set PIN
              </button>
            )}
          </div>
        </div>

        {isPinConfigured && (
          <>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700">
              <p className="font-bold text-neutral-800 dark:text-neutral-100 mb-3">Require PIN for</p>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">App Resume</p>
                  <p className="text-xs text-neutral-500">Lock when app goes to background</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={authActions.includes(AuthActions.AppResume)}
                    onChange={() => toggleAuthAction(AuthActions.AppResume)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full dark:bg-neutral-700" />
                </label>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-700 my-2" />

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Send Transaction</p>
                  <p className="text-xs text-neutral-500">Authorize before sending funds</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={authActions.includes(AuthActions.SendTransaction)}
                    onChange={() => toggleAuthAction(AuthActions.SendTransaction)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full dark:bg-neutral-700" />
                </label>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-700 my-2" />

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Reveal Balance</p>
                  <p className="text-xs text-neutral-500">Authorize before showing balance</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={authActions.includes(AuthActions.RevealBalance)}
                    onChange={() => toggleAuthAction(AuthActions.RevealBalance)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full dark:bg-neutral-700" />
                </label>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-warn-light/10 border border-warn-light/20">
              <p className="text-xs text-warn-dark font-medium leading-relaxed">
                {t("security.settings.warning")}
              </p>
            </div>
          </>
        )}

        {!isPinConfigured && (
          <div className="p-4 rounded-2xl bg-warn-light/10 border border-warn-light/20">
            <p className="text-xs text-warn-dark font-medium leading-relaxed">
              No PIN is set. Anyone with access to your phone can use this wallet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
