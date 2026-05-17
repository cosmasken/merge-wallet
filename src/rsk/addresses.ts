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
  [MAINNET]: '0x440cd83c160de5c96ddb20246815ea44c7abbca8',
  [TESTNET]: '0x4dA7997A819bb46B6758b9102234c289Dd2ad3bf',
}
export const MOC_TOKEN: Record<number, string> = {
  [MAINNET]: '0x9aC7Fe28967b30e3a4E6E03286D715B42B453d10',
  [TESTNET]: '0x45A97b54021A3F99827641AFE1bFae574431E6ab',
}

// ── Sovryn ──────────────────────────────────────────────────
export const SOVRYN_PROTOCOL: Record<number, string> = {
  [MAINNET]: '0x5A0D867e0D70Fcc6Ade25C3F1B89d618b5B4Eaa7',
  [TESTNET]: '0x25380305f223B32FDB844152abD2E82BC5Ad99c3',
}
export const SWAPS_EXTERNAL: Record<number, string> = {
  [MAINNET]: '0xBba834823b3351359A89f548504a11a601a6eD42',
  [TESTNET]: '0xE4fD0AAe96eA6C06d74CfDaf57C74Fc796a4accC',
}
export const WRBTC: Record<number, string> = {
  [MAINNET]: '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d',
  [TESTNET]: '0x69FE5cEC81D5eF92600c1A0dB1F11986AB3758Ab',
}
export const SOV: Record<number, string> = {
  [MAINNET]: '0xEfC78FC7D48B64958315949279bA181C2114abbD',
  [TESTNET]: '0x6a9A07972D07e58F0daf5122d11E069288A375fb',
}
export const XUSD: Record<number, string> = {
  [MAINNET]: '0xb5999795BE0EbB5bAb23144AA5FD6A02D080299F',
  [TESTNET]: '0xa9262CC3fB54Ea55B1B0af00EfCa9416B8d59570',
}
export const ZUSD: Record<number, string> = {
  // ZUSD not deployed on testnet — mainnet only
  [MAINNET]: '0xdB107FA69E33f05180a4C2cE9C2e7CB481645C2d',
}
export const DLLR: Record<number, string> = {
  [MAINNET]: '0xc1411567d2670e24d9C4DaAa7CdA95686e1250AA',
  [TESTNET]: '0x007b3AA69A846cB1f76b60b3088230A52D2A83AC',
}

// ── Sovryn Swap Network (for direct convertByPath) ──────────
export const SOVRYN_SWAP_NETWORK: Record<number, string> = {
  [MAINNET]: '0x98aCE08D2b759a265ae326F010496bcD63C15afc',
  [TESTNET]: '0x6390df6de9f24902b29740371525c2ceaA8F5a4f',
}
export const BTC_WRAPPER_PROXY: Record<number, string> = {
  [MAINNET]: '0x2BEe6167f91D10db23252e03de039Da6b9047D49',
  [TESTNET]: '0xA3a46b149360a0B1e005CA8cB7522938A2da7532',
}

// ── Sovryn iTokens (Lending Pool / LoanToken contracts) ────
export const IXUSD: Record<number, string> = {
  [MAINNET]: '0x8F77ecf69711a4b346f23109c40416BE3dC7f129',
  [TESTNET]: '0xE27428101550f8104A6d06D830e2E0a097e1d006',
}
export const IRBTC: Record<number, string> = {
  [MAINNET]: '0xa9DcDC63eaBb8a2b6f39D7fF9429d88340044a7A',
  [TESTNET]: '0xe67Fe227e0504e8e96A34C3594795756dC26e14B',
}
export const IDOC: Record<number, string> = {
  [MAINNET]: '0xd8D25f03EBbA94E15Df2eD4d6D38276B595593c1',
  [TESTNET]: '0x74e00A8CeDdC752074aad367785bFae7034ed89f',
}
export const IBPRO: Record<number, string> = {
  [MAINNET]: '0x6E2fb26a60dA535732F8149b25018C9c0823a715',
  [TESTNET]: '0x6226b4B3F29Ecb5f9EEC3eC3391488173418dD5d',
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
    { symbol: 'iXUSD', address: IXUSD[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'iRBTC', address: IRBTC[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'iDOC', address: IDOC[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'iBPro', address: IBPRO[MAINNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
  ],
  [TESTNET]: [
    { symbol: 'DOC', address: DOC[TESTNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'BPro', address: BPRO[TESTNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'MOC', address: MOC_TOKEN[TESTNET] as `0x${string}`, decimals: 18, protocol: 'moc' },
    { symbol: 'SOV', address: SOV[TESTNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'XUSD', address: XUSD[TESTNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'DLLR', address: DLLR[TESTNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'iXUSD', address: IXUSD[TESTNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'iRBTC', address: IRBTC[TESTNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'iDOC', address: IDOC[TESTNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
    { symbol: 'iBPro', address: IBPRO[TESTNET] as `0x${string}`, decimals: 18, protocol: 'sovryn' },
  ],
}

export function getProtocolTokens(chainId: number): ProtocolToken[] {
  return TOKEN_REGISTRY[chainId] ?? []
}
