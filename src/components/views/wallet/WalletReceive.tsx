import ViewHeader from "@/layout/ViewHeader";
import Address from "@/atoms/Address";
import Card from "@/atoms/Card";

const DEMO_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";

export default function WalletReceive() {
  return (
    <div>
      <ViewHeader title="Receive" subtitle="Share your address to receive RBTC" />
      <div className="flex flex-col items-center gap-6 px-4">
        <Card className="p-8 flex flex-col items-center gap-4">
          <div className="w-48 h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center text-neutral-400">
            QR Code Placeholder
          </div>
          <div className="text-center font-mono text-sm break-all">
            <Address address={DEMO_ADDRESS} />
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
