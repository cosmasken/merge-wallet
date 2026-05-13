import ViewHeader from "@/layout/ViewHeader";
import MergeLogo from "@/atoms/MergeLogo";
import { useTranslation } from "@/translations";

export default function AboutView() {
  const { t } = useTranslation();
  
  return (
    <div>
      <ViewHeader title={t("settings.about.title")} showBack />
      <div className="flex flex-col items-center gap-4 px-4 pt-8 text-center">
        <MergeLogo className="w-16 h-16" />
        <div>
          <h2 className="text-lg font-bold">Merge Wallet</h2>
          <p className="text-sm text-neutral-500">{t("settings.about.version")} v0.1.0</p>
        </div>
        <p className="text-sm text-neutral-500 max-w-xs">
          {t("settings.about.description")}
        </p>
        <a
          href="https://rsk.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm"
        >
          rootstock.io
        </a>
        <a
          href="http://privacypolicy.septemlabs.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 text-xs mt-8"
        >
          {t("settings.about.privacy_policy")}
        </a>
      </div>
    </div>
  );
}
