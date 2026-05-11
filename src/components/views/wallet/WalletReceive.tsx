import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import QRCode from "qrcode";
import { Clipboard } from "@capacitor/clipboard";

import ViewHeader from "@/layout/ViewHeader";
import Address from "@/atoms/Address";
import Card from "@/atoms/Card";
import { selectWalletAddress } from "@/redux/wallet";

export default function WalletReceive() {
  const address = useSelector(selectWalletAddress);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, address, {
      width: 192,
      margin: 2,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff",
      },
    });
  }, [address]);

  async function handleCopy() {
    try {
      await Clipboard.write({ string: address });
    } catch {
      await navigator.clipboard.writeText(address);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <ViewHeader title="Receive" subtitle="Share your address to receive RBTC" />
      <div className="flex flex-col items-center gap-6 px-4">
        <Card className="p-8 flex flex-col items-center gap-4">
          <canvas ref={canvasRef} className="w-48 h-48 rounded-lg" />
          <div className="text-center font-mono text-sm break-all">
            <Address address={address} />
          </div>
          <button
            onClick={handleCopy}
            className="text-primary text-sm font-medium"
          >
            {copied ? "Copied!" : "Copy Address"}
          </button>
        </Card>
        <p className="text-sm text-neutral-500 text-center max-w-sm">
          Send only RSK (RBTC) and RSK-based tokens to this address. Sending other assets may result in permanent loss.
        </p>
      </div>
    </div>
  );
}
