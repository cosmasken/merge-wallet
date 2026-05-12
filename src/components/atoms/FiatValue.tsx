import { formatEther } from "viem";
import { useSelector } from "react-redux";

import { selectLocalCurrency, selectRbtcPrice } from "@/redux/preferences";

interface FiatValueProps {
  value?: bigint | string;
  className?: string;
  fallbackClassName?: string;
}

export default function FiatValue({
  value = 0n,
  className,
  fallbackClassName,
}: FiatValueProps) {
  const rbtcPrice = useSelector(selectRbtcPrice);
  const currency = useSelector(selectLocalCurrency);

  if (!rbtcPrice || rbtcPrice.currency !== currency) {
    return fallbackClassName ? <span className={fallbackClassName} /> : null;
  }

  const amount = typeof value === "string" ? BigInt(value) : value;
  const rbtcAmount = parseFloat(formatEther(amount));
  const fiatValue = rbtcAmount * rbtcPrice.price;

  const formatted = fiatValue.toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return <span className={className}>{formatted}</span>;
}
