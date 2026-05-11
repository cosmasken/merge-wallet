import ViewHeader from "@/layout/ViewHeader";

export default function WalletHistory() {
  return (
    <div>
      <ViewHeader title="History" subtitle="Your transaction history" />
      <div className="flex flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="text-neutral-500">No transactions yet</p>
      </div>
    </div>
  );
}
