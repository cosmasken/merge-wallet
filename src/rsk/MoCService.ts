import { parseEther, getAddress, encodeFunctionData, erc20Abi } from "viem"
import { getPublicClientByChainId } from "@/kernel/evm/ClientService"
import TransactionManagerService from "@/kernel/evm/TransactionManagerService"
import KeyManagerService from "@/kernel/evm/KeyManagerService"
import { MOC_CORE, MOC_STATE, DOC, BPRO } from "./addresses"
import { mocCoreAbi, mocStateAbi } from "./abis/moc"

export default function MoCService(chainId: number) {
  const publicClient = getPublicClientByChainId(chainId)
  const txManager = TransactionManagerService(chainId)
  const keyManager = KeyManagerService()

  const mocCore = MOC_CORE[chainId] as `0x${string}`
  const mocState = MOC_STATE[chainId] as `0x${string}`
  const doc = DOC[chainId] as `0x${string}`
  const bpro = BPRO[chainId] as `0x${string}`

  function requireAvailable() {
    if (!mocCore || !doc) throw new Error(`MoC not available on chain ${chainId}`)
  }

  function getUserAddress(): `0x${string}` {
    return getAddress(keyManager.getAddress())
  }

  async function getAllowance(token: `0x${string}`, spender: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [getUserAddress(), spender],
    }) as Promise<bigint>
  }

  async function approveToken(
    token: `0x${string}`,
    spender: `0x${string}`,
    amountWei: bigint,
  ): Promise<`0x${string}`> {
    requireAvailable()
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amountWei],
    })
    const { hash } = await txManager.sendContractTransaction(token, 0n, data)
    await txManager.waitForReceipt(hash)
    return hash
  }

  async function getBtcPrice(): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: mocState,
      abi: mocStateAbi,
      functionName: "getBitcoinPrice",
    }) as Promise<bigint>
  }

  async function getBProPrice(): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: mocState,
      abi: mocStateAbi,
      functionName: "bproUsdPrice",
    }) as Promise<bigint>
  }

  async function estimateDocForBtc(rbtcAmount: string): Promise<bigint> {
    requireAvailable()
    const wei = parseEther(rbtcAmount)
    return publicClient.readContract({
      address: mocState,
      abi: mocStateAbi,
      functionName: "btcToDoc",
      args: [wei],
    }) as Promise<bigint>
  }

  async function estimateBtcForDoc(docAmount: string): Promise<bigint> {
    requireAvailable()
    const wei = parseEther(docAmount)
    return publicClient.readContract({
      address: mocState,
      abi: mocStateAbi,
      functionName: "docsToBtc",
      args: [wei],
    }) as Promise<bigint>
  }

  async function estimateBtcForBPro(bproAmount: string): Promise<bigint> {
    requireAvailable()
    const wei = parseEther(bproAmount)
    return publicClient.readContract({
      address: mocState,
      abi: mocStateAbi,
      functionName: "bproToBtc",
      args: [wei],
    }) as Promise<bigint>
  }

  async function getDocBalance(address: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: doc,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(address)],
    }) as Promise<bigint>
  }

  async function getBProBalance(address: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: bpro,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(address)],
    }) as Promise<bigint>
  }

  async function mintDoc(rbtcAmount: string): Promise<`0x${string}`> {
    requireAvailable()
    const wei = parseEther(rbtcAmount)
    const data = encodeFunctionData({
      abi: mocCoreAbi,
      functionName: "mintDoc",
      args: [wei],
    })
    const valueWithBuffer = wei * 1005n / 1000n
    const { hash } = await txManager.sendContractTransaction(mocCore, valueWithBuffer, data)
    return hash
  }

  async function redeemDoc(docAmount: string): Promise<`0x${string}`> {
    requireAvailable()
    const wei = parseEther(docAmount)
    const data = encodeFunctionData({
      abi: mocCoreAbi,
      functionName: "redeemFreeDoc",
      args: [wei],
    })
    const { hash } = await txManager.sendContractTransaction(mocCore, 0n, data)
    return hash
  }

  async function mintBPro(rbtcAmount: string): Promise<`0x${string}`> {
    requireAvailable()
    const wei = parseEther(rbtcAmount)
    const data = encodeFunctionData({
      abi: mocCoreAbi,
      functionName: "mintBPro",
      args: [wei],
    })
    const valueWithBuffer = wei * 1005n / 1000n
    const { hash } = await txManager.sendContractTransaction(mocCore, valueWithBuffer, data)
    return hash
  }

  async function redeemBPro(bproAmount: string): Promise<`0x${string}`> {
    requireAvailable()
    const wei = parseEther(bproAmount)
    const data = encodeFunctionData({
      abi: mocCoreAbi,
      functionName: "redeemBPro",
      args: [wei],
    })
    const { hash } = await txManager.sendContractTransaction(mocCore, 0n, data)
    return hash
  }

  return {
    getBtcPrice,
    getBProPrice,
    getDocBalance,
    getBProBalance,
    estimateDocForBtc,
    estimateBtcForDoc,
    estimateBtcForBPro,
    mintDoc,
    redeemDoc,
    mintBPro,
    redeemBPro,
    getAllowance,
    approveToken,
    mocCore,
    doc,
    bpro,
  }
}
