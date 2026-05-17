import { parseEther } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"

export default function TransactionBuilderService(chainId?: number) {
  async function estimateGas(
    to: `0x${string}`,
    amount: string,
    from: `0x${string}`,
  ): Promise<bigint> {
    const publicClient = getPublicClient(chainId)
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
    const publicClient = getPublicClient(chainId)
    const chainIdResolved = await publicClient.getChainId()

    const gas = await estimateGas(to, amount, from)

    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({ address: from, blockTag: "pending" }),
    ])

    return {
      to,
      value: parseEther(amount),
      gas,
      gasPrice,
      nonce,
      chainId: chainIdResolved,
      from,
    }
  }

  return {
    estimateGas,
    buildTransaction,
  }
}
