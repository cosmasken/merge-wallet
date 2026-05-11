import { getPublicClient } from "@/kernel/evm/ClientService"
import type { ValidNetwork } from "@/redux/preferences"

let refreshInterval: ReturnType<typeof setInterval> | null = null

export default function BalanceService(network?: ValidNetwork) {
  async function getBalance(address: `0x${string}`): Promise<bigint> {
    const publicClient = getPublicClient(network)
    const balance = await publicClient.getBalance({ address })
    return balance
  }

  function startAutoRefresh(
    address: `0x${string}`,
    callback: (balance: bigint) => void,
    intervalMs = 15000,
  ) {
    stopAutoRefresh()

    const fetch = async () => {
      try {
        const balance = await getBalance(address)
        callback(balance)
      } catch {
        // silent fail on auto-refresh
      }
    }

    fetch()
    refreshInterval = setInterval(fetch, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  return {
    getBalance,
    startAutoRefresh,
    stopAutoRefresh,
  }
}
