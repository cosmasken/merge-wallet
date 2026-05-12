import ViewHeader from "@/layout/ViewHeader";
import MergeLogo from "@/atoms/MergeLogo";

export default function AboutView() {
  return (
    <div>
      <ViewHeader title="About" showBack />
      <div className="flex flex-col items-center gap-4 px-4 pt-8 text-center">
        <MergeLogo className="w-16 h-16" />
        <div>
          <h2 className="text-lg font-bold">Merge Wallet</h2>
          <p className="text-sm text-neutral-500">v0.1.0</p>
        </div>
        <p className="text-sm text-neutral-500 max-w-xs">
          A self-custodial Rootstock (RSK) RBTC mobile wallet.
        </p>
        <a
          href="https://rsk.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm"
        >
          rootstock.io
        </a>
      </div>
    </div>
  );
}
