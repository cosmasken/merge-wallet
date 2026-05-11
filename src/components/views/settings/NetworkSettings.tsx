import ViewHeader from "@/layout/ViewHeader";

export default function NetworkSettings() {
  return (
    <div>
      <ViewHeader title="Network" subtitle="Rootstock network configuration" />
      <div className="px-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <div>
            <div className="font-medium text-neutral-800 dark:text-neutral-100">Network</div>
            <div className="text-xs text-neutral-500">Testnet (Chain ID: 31)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
