import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import ViewHeader from "@/layout/ViewHeader";
import { selectThemeMode, selectShouldHideBalance, setTheme, toggleHideBalance, ThemeMode, selectChainId } from "@/redux/preferences";
import { useTranslation } from "@/translations";
import { isGovernanceAvailable } from "@/util/networks";

export default function SettingsView() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectThemeMode);
  const hideBalance = useSelector(selectShouldHideBalance);
  const chainId = useSelector(selectChainId);
  const { t } = useTranslation();

  const sections = [
    { title: t("settings.section_security"), path: "/settings/security", desc: t("settings.section_security_desc") },
    { title: t("settings.section_language"), path: "/settings/language", desc: t("settings.section_language_desc") },
    { title: t("settings.section_contacts"), path: "/wallet/contacts", desc: t("settings.section_contacts_desc") },
    { title: t("settings.section_network"), path: "/settings/network", desc: t("settings.section_network_desc") },
    { title: t("settings.section_currency"), path: "/settings/currency", desc: t("settings.section_currency_desc") },
    // Only show governance on mainnet
    ...(isGovernanceAvailable(chainId) ? [
      { title: t("settings.section_governance"), path: "/settings/governance", desc: t("settings.section_governance_desc") }
    ] : []),
    { title: t("settings.section_import"), path: "/wallet/import", desc: t("settings.section_import_desc") },
    { title: t("settings.section_about"), path: "/settings/about", desc: t("settings.section_about_desc") },
  ];

  const themes = [
    { value: ThemeMode.System, label: t("settings.theme_system") },
    { value: ThemeMode.Light, label: t("settings.theme_light") },
    { value: ThemeMode.Dark, label: t("settings.theme_dark") },
  ] as const;

  return (
    <div>
      <ViewHeader title={t("settings.title")} />
      <div className="flex flex-col px-4 gap-1">
        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="font-medium text-neutral-800 dark:text-neutral-100">{t("settings.appearance")}</div>
            <div className="text-xs text-neutral-500">{t("settings.appearance_desc")}</div>
          </div>
          <div className="flex">
            {themes.map(({ value, label }, i) => (
              <button
                key={value}
                onClick={() => dispatch(setTheme(value))}
                className={`flex-1 p-3 text-sm font-medium transition-colors ${
                  currentTheme === value
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-500"
                } ${i < themes.length - 1 ? "border-r border-neutral-200 dark:border-neutral-700" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden mt-4">
          <button
            onClick={() => dispatch(toggleHideBalance())}
            className="flex items-center justify-between w-full p-4 text-left"
          >
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-100">{t("settings.hide_balance")}</div>
              <div className="text-xs text-neutral-500">{t("settings.hide_balance_desc")}</div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${hideBalance ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600"} relative`}>
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${hideBalance ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </div>
          </button>
        </div>

        {sections.map(({ title, path, desc }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-left mt-1"
          >
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-100">{title}</div>
              <div className="text-xs text-neutral-500">{desc}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
