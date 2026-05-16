interface TokenIconProps {
  symbol?: string;
  size?: number;
  className?: string;
}

const NATIVE_SYMBOLS = new Set(["RBTC", "ETH", "BNB", "MATIC", "POL", "AVAX", "xDAI", "FTM"]);

export default function TokenIcon({
  symbol = "",
  size = 32,
  className,
}: TokenIconProps) {
  const isNative = NATIVE_SYMBOLS.has(symbol);
  const bgColor = isNative ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600";
  const label = isNative ? symbol : symbol.slice(0, 3).toUpperCase();

  return (
    <div
      className={`${bgColor} rounded-full flex items-center justify-center text-white font-bold ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {label}
    </div>
  );
}
