// Centralized RSK contract addresses — single source of truth
// All addresses are checksummed. Keyed by chainId (30 = mainnet, 31 = testnet).

const MAINNET = 30
const TESTNET = 31

// ── Money On Chain ──────────────────────────────────────────
export const MOC_CORE: Record<number, string> = {
  [MAINNET]: '0xf773B590aF754D597770937Fa8ea7AbDf2668370',
  [TESTNET]: '0x2820f6d4D199B8D8838A4B26F9917754B86a0c1F',
}
export const MOC_STATE: Record<number, string> = {
  [MAINNET]: '0xc0f9B54c41E3d0587Ce0F7540738d8d649b0A3F3',
  [TESTNET]: '0x0adb40132cB0ffcEf6ED81c26A1881e214100555',
}
export const DOC: Record<number, string> = {
  [MAINNET]: '0xe700691Df26E32a5a8A20E40e1075862C4A4Ed6A',
  [TESTNET]: '0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0',
}
export const BPRO: Record<number, string> = {
  [MAINNET]: '0x440Cd83C160de5C96a0A2E5438F87bAC334f282',
  [TESTNET]: '0x4dA7997A819bb46B6758b9102234c289Dd2ad3bf',
}
export const MOC_TOKEN: Record<number, string> = {
  [MAINNET]: '0x9aC7Fe28967b30e3a4E6E03286D715B42B453d10',
  [TESTNET]: '0x45A97b54021A3F99827641AFE1bFae574431E6ab',
}

// ── Sovryn (mainnet only — testnet requires per-dev deployment) ──
export const SOVRYN_PROTOCOL: Record<number, string> = {
  [MAINNET]: '0x5A0D867e0D70Fcc6Ade25C3F1B89d618b5B4Eaa7',
}
export const SWAPS_EXTERNAL: Record<number, string> = {
  [MAINNET]: '0xBba834823b3351359A89f548504a11a601a6eD42',
}
export const WRBTC: Record<number, string> = {
  [MAINNET]: '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d',
  [TESTNET]: '',
}
export const SOV: Record<number, string> = {
  [MAINNET]: '0xEfC78FC7D48B64958315949279bA181C2114abbD',
}
export const XUSD: Record<number, string> = {
  [MAINNET]: '0xb5999795BE0EbB5bAb23144AA5FD6A02D080299F',
}
export const ZUSD: Record<number, string> = {
  [MAINNET]: '0xdB107FA69E33f05180a4C2cE9C2e7CB481645C2d',
}
export const DLLR: Record<number, string> = {
  [MAINNET]: '0xc1411567d2670e24d9C4DaAa7CdA95686e1250AA',
}

// ── Sovryn Swap Network (for direct convertByPath) ──────────
export const SOVRYN_SWAP_NETWORK: Record<number, string> = {
  [MAINNET]: '0x98aCE08D2b759a265ae326F010496bcD63C15afc',
}
export const BTC_WRAPPER_PROXY: Record<number, string> = {
  [MAINNET]: '0x2BEe6167f91D10db23252e03de039Da6b9047D49',
}

// ── Sovryn iTokens (Lending Pool / LoanToken contracts) ────
export const IXUSD: Record<number, string> = {
  [MAINNET]: '0x8F77ecf69711a4b346f23109c40416BE3dC7f129',
}
export const IRBTC: Record<number, string> = {
  [MAINNET]: '0xa9DcDC63eaBb8a2b6f39D7fF9429d88340044a7A',
}
export const IDOC: Record<number, string> = {
  [MAINNET]: '0xd8D25f03EBbA94E15Df2eD4d6D38276B595593c1',
}
export const IBPRO: Record<number, string> = {
  [MAINNET]: '0x6E2fb26a60dA535732F8149b25018C9c0823a715',
}

// ── Registry ────────────────────────────────────────────────
export interface ProtocolToken {
  symbol: string
  address: `0x${string}`
  decimals: number
  protocol: 'moc' | 'sovryn'
}

const TOKEN_REGISTRY: Record<number, ProtocolToken[]> = {
  [MAINNET]: [
    { symbol: 'DOC', address: DOC[MAINNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'BPro', address: BPRO[MAINNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'MOC', address: MOC_TOKEN[MAINNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'SOV', address: SOV[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'XUSD', address: XUSD[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'ZUSD', address: ZUSD[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'DLLR', address: DLLR[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
  ],
  [TESTNET]: [
    { symbol: 'DOC', address: DOC[TESTNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'BPro', address: BPRO[TESTNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'MOC', address: MOC_TOKEN[TESTNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
  ],
}

export function getProtocolTokens(chainId: number): ProtocolToken[] {
  return TOKEN_REGISTRY[chainId] ?? []
}
