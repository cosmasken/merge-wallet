import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import QRCode from "qrcode";
import { Clipboard } from "@capacitor/clipboard";

import ViewHeader from "@/layout/ViewHeader";
import Address from "@/atoms/Address";
import Card from "@/atoms/Card";
import { selectWalletAddress, selectUseSmartWallet, selectSmartWalletAddress, selectActiveAddress } from "@/redux/wallet";
import { useTranslation } from "@/translations";

export default function WalletReceive() {
  const address = useSelector(selectWalletAddress);
  const useSmartWallet = useSelector(selectUseSmartWallet);
  const smartWalletAddress = useSelector(selectSmartWalletAddress);
  const activeAddress = useSelector(selectActiveAddress);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!activeAddress || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, activeAddress, {
      width: 192,
      margin: 2,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff",
      },
    });
  }, [activeAddress]);

  async function handleCopy() {
    if (!activeAddress) return;
    try {
      await Clipboard.write({ string: activeAddress });
    } catch {
      await navigator.clipboard.writeText(activeAddress);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <ViewHeader 
        title={useSmartWallet ? t("wallet.receive.rif_title") : t("wallet.receive.title")} 
        subtitle={useSmartWallet ? t("wallet.receive.rif_subtitle") : t("wallet.receive.subtitle")} 
        showBack 
      />
      <div className="flex flex-col items-center gap-6 px-4">
        <Card className="p-8 flex flex-col items-center gap-4">
          <canvas ref={canvasRef} className="w-48 h-48 rounded-lg" />
          <div className="text-center font-mono text-sm break-all">
            <Address address={activeAddress} copyable />
          </div>
          <button
            onClick={handleCopy}
            className="text-primary text-sm font-medium"
          >
            {copied ? t("wallet.receive.copied") : t("wallet.receive.copy_address")}
          </button>
        </Card>
        <p className="text-sm text-neutral-500 text-center max-w-sm">
          {useSmartWallet 
            ? t("wallet.receive.rif_warning")
            : t("wallet.receive.warning")}
        </p>
      </div>
    </div>
  );
}
