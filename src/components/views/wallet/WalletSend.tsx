import ViewHeader from "@/layout/ViewHeader";

export default function WalletSend() {
  return (
    <div>
      <ViewHeader title="Send" subtitle="Send RBTC or tokens" />
      <div className="flex flex-col gap-4 px-4">
        <div>
          <label className="text-sm text-neutral-500 mb-1 block">Recipient Address</label>
          <input
            type="text"
            placeholder="0x..."
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100 font-mono"
            disabled
          />
        </div>
        <div>
          <label className="text-sm text-neutral-500 mb-1 block">Amount (RBTC)</label>
          <input
            type="text"
            placeholder="0.00"
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100"
            disabled
          />
        </div>
        <button
          className="w-full p-3 rounded-full bg-primary text-white font-semibold opacity-50 cursor-default mt-4"
          disabled
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
}
