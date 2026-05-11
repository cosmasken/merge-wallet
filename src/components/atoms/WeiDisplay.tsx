import { formatEther } from "viem";

interface WeiDisplayProps {
  value?: bigint | string;
  hideBalance?: boolean;
  className?: string;
}

export default function WeiDisplay({
  value = 0n,
  hideBalance = false,
  className,
}: WeiDisplayProps) {
  if (hideBalance) {
    return <span className={className}>XXXXXXXXXX RBTC</span>;
  }

  const amount = typeof value === "string" ? BigInt(value) : value;
  const formatted = formatEther(amount);

  const [whole, fraction] = formatted.split(".");
  const displayFraction = fraction ? fraction.slice(0, 6) : "0";

  return (
    <span className={className}>
      {whole}<span className="text-neutral-400">.{displayFraction}</span> RBTC
    </span>
  );
}
