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
    
    // Get fresh nonce each time to avoid stale nonce issues
    const [gas, gasPrice, chainId] = await Promise.all([
      estimateGas(to, amount, from),
      publicClient.getGasPrice(),
      publicClient.getChainId(),
    ])
    
    // Get nonce separately to ensure it's fresh
    const nonce = await publicClient.getTransactionCount({ 
      address: from,
      blockTag: 'pending' // Include pending transactions
    })

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
