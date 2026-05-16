import { getPublicClient } from "@/kernel/evm/ClientService"

let refreshInterval: ReturnType<typeof setInterval> | null = null

export default function BalanceService(chainId?: number) {
  async function getBalance(address: `0x${string}`): Promise<bigint> {
    const publicClient = getPublicClient(chainId)
    const balance = await publicClient.getBalance({ address })
    return balance
  }

  function startAutoRefresh(
    address: `0x${string}`,
    callback: (balance: bigint) => void,
    errorCallback?: (error: Error) => void,
    intervalMs = 15000,
  ) {
    stopAutoRefresh()

    const fetch = async () => {
      try {
        const balance = await getBalance(address)
        callback(balance)
      } catch (e) {
        errorCallback?.(e instanceof Error ? e : new Error(String(e)))
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
