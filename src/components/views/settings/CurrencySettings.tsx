import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import { selectLocalCurrency, setCurrency } from "@/redux/preferences";

const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "KRW", label: "South Korean Won", symbol: "₩" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
];

export default function CurrencySettings() {
  const dispatch = useDispatch();
  const currentCurrency = useSelector(selectLocalCurrency);
  const [price, setPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const fetchPrice = useCallback(async (currency: string) => {
    setPriceLoading(true);
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=rootstock&vs_currencies=${currency.toLowerCase()}`,
      );
      const data = await res.json();
      if (data.rootstock?.[currency.toLowerCase()] != null) {
        setPrice(data.rootstock[currency.toLowerCase()]);
      } else {
        setPrice(null);
      }
    } catch {
      setPrice(null);
    }
    setPriceLoading(false);
  }, []);

  useEffect(() => {
    fetchPrice(currentCurrency);
  }, [currentCurrency, fetchPrice]);

  const handleSelect = (code: string) => {
    dispatch(setCurrency(code));
  };

  return (
    <div>
      <ViewHeader title="Currency" subtitle="Display and fiat currency" showBack />
      <div className="flex flex-col gap-4 px-4">
        {priceLoading ? (
          <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-500 text-center">
            Loading price...
          </div>
        ) : price !== null ? (
          <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm text-center font-medium">
            1 RBTC = {price.toLocaleString(undefined, {
              style: "currency",
              currency: currentCurrency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        ) : null}

        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {CURRENCIES.map(({ code, label, symbol }, i) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                currentCurrency === code
                  ? "bg-primary/10"
                  : "active:bg-neutral-100 dark:active:bg-neutral-700"
              } ${i < CURRENCIES.length - 1 ? "border-b border-neutral-200 dark:border-neutral-700" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-600 dark:text-neutral-300">
                  {symbol}
                </span>
                <div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100 text-sm">
                    {label}
                  </div>
                  <div className="text-xs text-neutral-500">{code}</div>
                </div>
              </div>
              {currentCurrency === code && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
