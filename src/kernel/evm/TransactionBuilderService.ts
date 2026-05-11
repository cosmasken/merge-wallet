import { parseEther } from "viem"
import { getPublicClient, getWalletClient } from "@/kernel/evm/ClientService"
import type { ValidNetwork } from "@/redux/preferences"

export default function TransactionBuilderService(network?: ValidNetwork) {
  async function estimateGas(to: `0x${string}`, amount: string): Promise<bigint> {
    const publicClient = getPublicClient(network)
    const gas = await publicClient.estimateGas({
      to,
      value: parseEther(amount),
    })
    return gas
  }

  async function buildTransaction(
    from: `0x${string}`,
    to: `0x${string}`,
    amount: string,
  ) {
    const publicClient = getPublicClient(network)
    const [gas, gasPrice, nonce] = await Promise.all([
      estimateGas(to, amount),
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({ address: from }),
    ])

    return {
      to,
      value: parseEther(amount),
      gas,
      gasPrice,
      nonce,
      chainId: (await publicClient.getChainId()) as 30 | 31,
    }
  }

  return {
    estimateGas,
    buildTransaction,
  }
}
