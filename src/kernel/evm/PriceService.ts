import { setRbtcPrice, setTokenPrices } from "@/redux/preferences";
import type { AppDispatch } from "@/redux/store";

export async function syncTokenPrices(dispatch: AppDispatch, currency: string): Promise<void> {
  try {
    const currLower = currency.toLowerCase();
    // Fetch prices in both USD and local currency from coingecko
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=rootstock,rif-token,sovryn,money-on-chain&vs_currencies=usd,${currLower}`,
    );
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    
    if (data.rootstock?.[currLower] != null) {
      const rbtcPriceVal = data.rootstock[currLower];
      dispatch(setRbtcPrice({ price: rbtcPriceVal, currency }));

      // Build tokenPrices record
      const pricesPayload: Record<string, { price: number; currency: string }> = {};

      // 1. RBTC / WRBTC / iRBTC
      pricesPayload["RBTC"] = { price: rbtcPriceVal, currency };
      pricesPayload["WRBTC"] = { price: rbtcPriceVal, currency };
      pricesPayload["IRBTC"] = { price: rbtcPriceVal, currency };

      // Calculate USD-to-local conversion rate
      const rbtcUsd = data.rootstock["usd"] || 78011.0;
      const usdToLocalRate = currLower === "usd" ? 1.0 : rbtcPriceVal / rbtcUsd;

      // 2. RIF / STRIF
      if (data["rif-token"]?.[currLower] != null) {
        pricesPayload["RIF"] = { price: data["rif-token"][currLower], currency };
        pricesPayload["STRIF"] = { price: data["rif-token"][currLower], currency };
      } else {
        pricesPayload["RIF"] = { price: 0.08 * usdToLocalRate, currency };
        pricesPayload["STRIF"] = { price: 0.08 * usdToLocalRate, currency };
      }

      // 3. SOV
      if (data.sovryn?.[currLower] != null) {
        pricesPayload["SOV"] = { price: data.sovryn[currLower], currency };
      } else {
        pricesPayload["SOV"] = { price: 0.22 * usdToLocalRate, currency };
      }

      // 4. MOC
      if (data["money-on-chain"]?.[currLower] != null) {
        pricesPayload["MOC"] = { price: data["money-on-chain"][currLower], currency };
      } else {
        pricesPayload["MOC"] = { price: 0.09 * usdToLocalRate, currency };
      }

      // 5. BPRO / IBPRO
      pricesPayload["BPRO"] = { price: rbtcPriceVal * 1.15, currency };
      pricesPayload["IBPRO"] = { price: rbtcPriceVal * 1.15, currency };

      // 6. USD Stablecoins pegged to $1.00 USD
      const stablePrice = 1.0 * usdToLocalRate;
      const stables = ["DOC", "USDRIF", "XUSD", "ZUSD", "DLLR", "IXUSD", "IDOC"];
      for (const sym of stables) {
        pricesPayload[sym] = { price: stablePrice, currency };
      }

      // Save tokenPrices inside preferences redux state
      dispatch(setTokenPrices(pricesPayload));
    }
  } catch (e) {
    console.error("Failed to sync token prices", e);
  }
}
