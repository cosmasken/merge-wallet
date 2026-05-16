import { formatUnits } from "viem";

interface WeiDisplayProps {
  wei?: bigint | string;
  value?: bigint | string; // legacy alias
  decimals?: number;
  symbol?: string;
  hideBalance?: boolean;
  className?: string;
}

export default function WeiDisplay({
  wei,
  value,
  decimals = 18,
  symbol = "",
  hideBalance = false,
  className,
}: WeiDisplayProps) {
  const amount = wei ?? value ?? 0n;
  
  if (hideBalance) {
    return <span className={className}>XXXXX{symbol && ` ${symbol}`}</span>;
  }

  const bigAmount = typeof amount === "string" ? BigInt(amount) : amount;
  const formatted = formatUnits(bigAmount, decimals);

  const [whole, fraction] = formatted.split(".");
  const displayFraction = fraction ? fraction.slice(0, 6) : "0";

  return (
    <span className={className}>
      {whole}
      {displayFraction !== "0" && <span className="text-neutral-400">.{displayFraction}</span>}
      {symbol && <span className="ml-1">{symbol}</span>}
    </span>
  );
}

