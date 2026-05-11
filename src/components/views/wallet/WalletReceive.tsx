import { useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import Address from "@/atoms/Address";
import Card from "@/atoms/Card";
import { selectWalletAddress } from "@/redux/wallet";

export default function WalletReceive() {
  const address = useSelector(selectWalletAddress);

  return (
    <div>
      <ViewHeader title="Receive" subtitle="Share your address to receive RBTC" />
      <div className="flex flex-col items-center gap-6 px-4">
        <Card className="p-8 flex flex-col items-center gap-4">
          <div className="w-48 h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center text-neutral-400">
            QR Code Placeholder
          </div>
          <div className="text-center font-mono text-sm break-all">
            <Address address={address} />
          </div>
          <button className="text-primary text-sm font-medium">
            Copy Address
          </button>
        </Card>
        <p className="text-sm text-neutral-500 text-center max-w-sm">
          Send only RSK (RBTC) and RSK-based tokens to this address. Sending other assets may result in permanent loss.
        </p>
      </div>
    </div>
  );
}
