import { getPublicClient } from "@/kernel/evm/ClientService"
import type { ValidNetwork } from "@/redux/preferences"

class NonceManager {
  private nonces = new Map<string, number>()
  
  async getNonce(address: `0x${string}`, network?: ValidNetwork): Promise<number> {
    const key = `${address}-${network || 'default'}`
    
    if (!this.nonces.has(key)) {
      const publicClient = getPublicClient(network)
      const nonce = await publicClient.getTransactionCount({
        address,
        blockTag: 'pending'
      })
      console.log(`[NonceManager] Initial nonce for ${address}:`, nonce)
      this.nonces.set(key, nonce)
    }
    
    const currentNonce = this.nonces.get(key)!
    this.nonces.set(key, currentNonce + 1)
    console.log(`[NonceManager] Using nonce ${currentNonce}, next will be ${currentNonce + 1}`)
    return currentNonce
  }
  
  async resetNonce(address: `0x${string}`, network?: ValidNetwork): Promise<void> {
    const key = `${address}-${network || 'default'}`
    const publicClient = getPublicClient(network)
    const nonce = await publicClient.getTransactionCount({
      address,
      blockTag: 'pending'
    })
    this.nonces.set(key, nonce)
  }
}

export default new NonceManager()
