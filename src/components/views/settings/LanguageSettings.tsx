import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import { selectLanguageCode, setLanguage } from "@/redux/preferences";
import { useTranslation } from "@/translations";

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
];

export default function LanguageSettings() {
  const dispatch = useDispatch();
  const currentLanguage = useSelector(selectLanguageCode);
  const { t } = useTranslation();

  return (
    <div>
      <ViewHeader title={t("common.settings")} subtitle="Choose your language" showBack />
      <div className="flex flex-col px-4 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => dispatch(setLanguage(lang.code))}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
              currentLanguage === lang.code
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            }`}
          >
            <div className="flex flex-col items-start">
              <span className={`font-bold ${currentLanguage === lang.code ? "text-primary" : "text-neutral-800 dark:text-neutral-100"}`}>
                {lang.nativeName}
              </span>
              <span className="text-xs text-neutral-500">{lang.name}</span>
            </div>
            {currentLanguage === lang.code && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
