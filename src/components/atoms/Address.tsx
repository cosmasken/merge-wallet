import { useState } from "react";

interface AddressProps {
  address?: string;
  short?: boolean;
  className?: string;
  copyable?: boolean;
}

export default function Address({
  address = "-",
  short = false,
  className,
  copyable = false,
}: AddressProps) {
  const [copied, setCopied] = useState(false);

  const prefix = address.slice(0, 6);
  const suffix = address.slice(-4);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address === "-") return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={`inline-flex items-center gap-1 font-mono ${className ?? ""}`}>
      {short ? (
        <>{prefix}&hellip;{suffix}</>
      ) : (
        <>{prefix}{address.slice(6, -4)}{suffix}</>
      )}
      {copyable && address !== "-" && (
        <button
          onClick={handleCopy}
          className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          title="Copy address"
        >
          {copied ? (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      )}
    </span>
  );
}
