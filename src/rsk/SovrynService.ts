import { parseEther, getAddress, zeroAddress, encodeFunctionData, erc20Abi, parseUnits, formatUnits } from "viem"
import { getPublicClientByChainId } from "@/kernel/evm/ClientService"
import TransactionManagerService from "@/kernel/evm/TransactionManagerService"
import KeyManagerService from "@/kernel/evm/KeyManagerService"
import {
  SOVRYN_PROTOCOL,
  SWAPS_EXTERNAL,
  WRBTC,
  SOV,
  XUSD,
  IXUSD,
  IRBTC,
} from "./addresses"
import {
  sovrynSwapNetworkAbi,
  sovrynProtocolAbi,
  loanTokenAbi,
} from "./abis/sovryn"

export default function SovrynService(chainId: number) {
  const publicClient = getPublicClientByChainId(chainId)
  const txManager = TransactionManagerService(chainId)
  const keyManager = KeyManagerService()

  const protocol = SOVRYN_PROTOCOL[chainId] as `0x${string}` | undefined
  const swapsExternal = SWAPS_EXTERNAL[chainId] as `0x${string}` | undefined
  const wrbtc = WRBTC[chainId] as `0x${string}` | undefined
  const sov = SOV[chainId] as `0x${string}` | undefined
  const xusd = XUSD[chainId] as `0x${string}` | undefined

  function requireAvailable() {
    if (!protocol || !wrbtc) throw new Error(`Sovryn not available on chain ${chainId}`)
  }

  function getUserAddress(): `0x${string}` {
    return getAddress(keyManager.getAddress())
  }

  // ── Token balances ─────────────────────────────────────────

  async function getSovBalance(address: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: sov!,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(address)],
    }) as Promise<bigint>
  }

  async function getXusdBalance(address: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: xusd!,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(address)],
    }) as Promise<bigint>
  }

  // ── Token allowance / approve ─────────────────────────────

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
    return hash
  }

  // ── Swap path resolution ───────────────────────────────────

  /**
   * Resolve the SovrynSwapNetwork address from the protocol's registry.
   */
  async function getSwapNetworkAddress(): Promise<`0x${string}`> {
    const registryAddr = await publicClient.readContract({
      address: protocol!,
      abi: sovrynProtocolAbi,
      functionName: "sovrynSwapContractRegistryAddress",
    }) as `0x${string}`

    return publicClient.readContract({
      address: protocol!,
      abi: sovrynProtocolAbi,
      functionName: "getSovrynSwapNetworkContract",
      args: [registryAddr],
    }) as Promise<`0x${string}`>
  }

  /**
   * Find the optimal swap path from sourceToken to destToken.
   * 1. Check protocol's stored default path (getDefaultPathConversion)
   * 2. Fallback to SovrynSwapNetwork.conversionPath
   */
  async function resolveSwapPath(
    sourceToken: `0x${string}`,
    destToken: `0x${string}`,
  ): Promise<readonly `0x${string}`[]> {
    // First try the protocol's stored default path
    const defaultPath = await publicClient.readContract({
      address: protocol!,
      abi: sovrynProtocolAbi,
      functionName: "getDefaultPathConversion",
      args: [sourceToken, destToken],
    }) as `0x${string}`[]

    if (defaultPath.length >= 3) {
      return defaultPath
    }

    // Fallback: query the SovrynSwapNetwork for optimal path
    const swapNetwork = await getSwapNetworkAddress()
    return publicClient.readContract({
      address: swapNetwork,
      abi: sovrynSwapNetworkAbi,
      functionName: "conversionPath",
      args: [sourceToken, destToken],
    }) as Promise<readonly `0x${string}`[]>
  }

  // ── Quote (expected return) ────────────────────────────────

  /**
   * Get expected XUSD return for a given RBTC amount.
   */
  async function getExpectedXusdReturn(rbtcAmountWei: bigint): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: protocol!,
      abi: sovrynProtocolAbi,
      functionName: "getSwapExpectedReturn",
      args: [wrbtc!, xusd!, rbtcAmountWei],
    }) as Promise<bigint>
  }

  // ── Swaps ──────────────────────────────────────────────────

  /**
   * Swap RBTC (native) to XUSD via the protocol's swapExternal.
   *
   * The protocol wraps the sent RBTC into WRBTC, resolves the optimal path,
   * executes the swap via the SovrynSwapNetwork, and returns XUSD to the user.
   *
   * @param rbtcAmount  RBTC amount as a decimal string (e.g. "0.01")
   * @param minReturn   Minimum acceptable XUSD return (wei). Use 0n for no slippage.
   * @returns           Transaction hash
   */
  async function swapRbtcToXusd(
    rbtcAmount: string,
    minReturn: bigint = 0n,
  ): Promise<`0x${string}`> {
    requireAvailable()
    const wei = parseEther(rbtcAmount)
    const user = getUserAddress()

    const data = encodeFunctionData({
      abi: sovrynProtocolAbi,
      functionName: "swapExternal",
      args: [
        wrbtc!,   // sourceToken — tells protocol to wrap msg.value RBTC
        xusd!,    // destToken
        user,     // receiver
        user,     // returnToSender (unused tokens go back)
        wei,      // sourceTokenAmount
        0n,       // requiredDestTokenAmount (0 = flexible swap)
        minReturn,// minReturn (slippage protection)
        "0x" as `0x${string}`, // swapData (empty = protocol resolves path)
      ],
    })
    const { hash } = await txManager.sendContractTransaction(protocol!, wei, data)
    return hash
  }

  /**
   * Swap SOV to XUSD via the protocol's swapExternal.
   * Requires prior approval: SOV allowance must be set for SwapsExternal contract.
   *
   * @param sovAmount   SOV amount as a decimal string (e.g. "10")
   * @param minReturn   Minimum acceptable XUSD return (wei). Use 0n for no slippage.
   * @returns           Transaction hash
   */
  async function swapSovToXusd(
    sovAmount: string,
    minReturn: bigint = 0n,
  ): Promise<`0x${string}`> {
    requireAvailable()
    const wei = parseEther(sovAmount)
    const user = getUserAddress()

    const data = encodeFunctionData({
      abi: sovrynProtocolAbi,
      functionName: "swapExternal",
      args: [
        sov!,      // sourceToken
        xusd!,     // destToken
        user,      // receiver
        user,      // returnToSender
        wei,       // sourceTokenAmount
        0n,
        minReturn,
        "0x" as `0x${string}`,
      ],
    })
    const { hash } = await txManager.sendContractTransaction(swapsExternal!, 0n, data)
    return hash
  }

  // ── Low-level: direct convertByPath on SovrynSwapNetwork ──

  /**
   * Execute a swap via the SovrynSwapNetwork's convertByPath directly.
   * For RBTC-based swaps, the path must start with WRBTC.
   *
   * @param path        Token addresses forming the swap path (source → ... → dest)
   * @param amount      Amount of source tokens (in wei / smallest unit)
   * @param minReturn   Minimum acceptable return (slippage protection)
   * @param sendValue   msg.value to send (0 for ERC20, amount for RBTC-as-WRBTC)
   * @returns           Transaction hash
   */
  async function convertByPath(
    path: readonly `0x${string}`[],
    amount: bigint,
    minReturn: bigint,
    sendValue: bigint = 0n,
  ): Promise<`0x${string}`> {
    const swapNetwork = await getSwapNetworkAddress()

    const data = encodeFunctionData({
      abi: sovrynSwapNetworkAbi,
      functionName: "convertByPath",
      args: [
        path,
        amount,
        minReturn,
        getUserAddress(),  // beneficiary
        zeroAddress,       // affiliateAccount
        0n,                // affiliateFee
      ],
    })
    const { hash } = await txManager.sendContractTransaction(swapNetwork, sendValue, data)
    return hash
  }

  // ── Lending (iToken mint/burn) ────────────────────────────

  async function getTokenPrice(loanTokenAddress: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: loanTokenAddress,
      abi: loanTokenAbi,
      functionName: "tokenPrice",
    }) as Promise<bigint>
  }

  async function getAssetBalance(loanTokenAddress: `0x${string}`, owner: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: loanTokenAddress,
      abi: loanTokenAbi,
      functionName: "assetBalanceOf",
      args: [getAddress(owner)],
    }) as Promise<bigint>
  }

  async function getITokenBalance(loanTokenAddress: `0x${string}`, owner: `0x${string}`): Promise<bigint> {
    requireAvailable()
    return publicClient.readContract({
      address: loanTokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(owner)],
    }) as Promise<bigint>
  }

  /**
   * Supply underlying tokens to earn interest (mint iTokens).
   * Requires prior approval of the underlying token to the iToken contract.
   */
  async function lend(
    loanTokenAddress: `0x${string}`,
    underlyingAmountWei: bigint,
  ): Promise<`0x${string}`> {
    requireAvailable()
    const user = getUserAddress()

    const data = encodeFunctionData({
      abi: loanTokenAbi,
      functionName: "mint",
      args: [user, underlyingAmountWei],
    })
    const { hash } = await txManager.sendContractTransaction(loanTokenAddress, 0n, data)
    return hash
  }

  /**
   * Withdraw underlying tokens by burning iTokens.
   */
  async function withdraw(
    loanTokenAddress: `0x${string}`,
    iTokenAmountWei: bigint,
  ): Promise<`0x${string}`> {
    requireAvailable()
    const user = getUserAddress()

    const data = encodeFunctionData({
      abi: loanTokenAbi,
      functionName: "burn",
      args: [user, iTokenAmountWei],
    })
    const { hash } = await txManager.sendContractTransaction(loanTokenAddress, 0n, data)
    return hash
  }

  async function getIXusdAddress(): Promise<`0x${string}`> {
    return (IXUSD[chainId] ?? zeroAddress) as `0x${string}`
  }

  async function getIRbtcAddress(): Promise<`0x${string}`> {
    return (IRBTC[chainId] ?? zeroAddress) as `0x${string}`
  }

  return {
    getSovBalance,
    getXusdBalance,
    getSwapNetworkAddress,
    resolveSwapPath,
    getExpectedXusdReturn,
    swapRbtcToXusd,
    swapSovToXusd,
    convertByPath,
    getAllowance,
    approveToken,
    getTokenPrice,
    getAssetBalance,
    getITokenBalance,
    lend,
    withdraw,
    getIXusdAddress,
    getIRbtcAddress,
  }
}
