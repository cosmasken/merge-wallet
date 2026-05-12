import { parseEther } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import type { ValidNetwork } from "@/redux/preferences"

export default function TransactionBuilderService(network?: ValidNetwork) {
  async function estimateGas(
    to: `0x${string}`,
    amount: string,
    from: `0x${string}`,
  ): Promise<bigint> {
    const publicClient = getPublicClient(network)
    const gas = await publicClient.estimateGas({
      to,
      value: parseEther(amount),
      account: from,
    })
    return gas
  }

  async function buildTransaction(
    from: `0x${string}`,
    to: `0x${string}`,
    amount: string,
  ) {
    const publicClient = getPublicClient(network)
    const [gas, gasPrice, nonce, chainId] = await Promise.all([
      estimateGas(to, amount, from),
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({ address: from }),
      publicClient.getChainId(),
    ])

    return {
      to,
      value: parseEther(amount),
      gas,
      gasPrice,
      nonce,
      chainId,
      from,
    }
  }

  return {
    estimateGas,
    buildTransaction,
  }
}
