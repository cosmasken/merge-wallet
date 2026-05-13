import { formatEther } from "viem";
import { useSelector } from "react-redux";

import { selectLocalCurrency, selectRbtcPrice } from "@/redux/preferences";

interface FiatValueProps {
  wei?: bigint | string;
  value?: bigint | string;
  className?: string;
  fallbackClassName?: string;
}

export default function FiatValue({
  wei,
  value,
  className,
  fallbackClassName,
}: FiatValueProps) {
  const rbtcPrice = useSelector(selectRbtcPrice);
  const currency = useSelector(selectLocalCurrency);

  const amount = wei ?? value ?? 0n;

  if (!rbtcPrice || rbtcPrice.currency !== currency) {
    return fallbackClassName ? <span className={fallbackClassName} /> : null;
  }

  const bigAmount = typeof amount === "string" ? BigInt(amount) : amount;
  const rbtcAmount = parseFloat(formatEther(bigAmount));

  const fiatValue = rbtcAmount * rbtcPrice.price;

  const formatted = fiatValue.toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return <span className={className}>{formatted}</span>;
}
