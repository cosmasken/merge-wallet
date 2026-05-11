interface TokenIconProps {
  symbol?: string;
  size?: number;
  className?: string;
}

export default function TokenIcon({
  symbol = "",
  size = 32,
  className,
}: TokenIconProps) {
  const bgColor = symbol === "RBTC" ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600";

  return (
    <div
      className={`${bgColor} rounded-full flex items-center justify-center text-white font-bold ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {symbol === "RBTC" ? "RBTC" : symbol.slice(0, 3).toUpperCase()}
    </div>
  );
}
