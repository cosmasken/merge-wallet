import { useState } from "react";

import ViewHeader from "@/layout/ViewHeader";

type Tab = "tokens" | "nfts";

export default function AssetsView() {
  const [activeTab, setActiveTab] = useState<Tab>("tokens");

  return (
    <div>
      <ViewHeader title="Assets" />
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-4">
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "tokens"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500"
          }`}
          onClick={() => setActiveTab("tokens")}
        >
          Tokens
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "nfts"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500"
          }`}
          onClick={() => setActiveTab("nfts")}
        >
          NFTs
        </button>
      </div>
      <div className="px-4 pt-8 text-center text-neutral-500">
        {activeTab === "tokens" ? "No tokens yet" : "No NFTs yet"}
      </div>
    </div>
  );
}
