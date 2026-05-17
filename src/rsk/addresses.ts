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

// ── Core Utility Tokens ─────────────────────────────────────
export const RIF: Record<number, string> = {
  [MAINNET]: '0x2acc95758f8b5f583470bA265E685CF8e3f4283b',
  [TESTNET]: '0x19F64674D8A5B4E652319F5e239eFd3bc969a1fE',
}
export const USDRIF: Record<number, string> = {
  [MAINNET]: '0x3A15461d8ae0f0fb5fa2629e9da7D66a794a6e37',
  [TESTNET]: '0xd1b0d1bc03491f49b9aea967ddd07b37f7327e63',
}

// ── Governance Constants ────────────────────────────────────
export const GOVERNANCE_CONTRACTS = {
  GOVERNOR: '0x71Ac6Ff904A17f50f2c07b693376Ccc1c92627F0' as const,
  MULTICALL: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
  RIF: '0x2acc95758f8b5f583470bA265E685CF8E3f4283b' as const,
  STRIF: '0x5db91E24bd32059584bBdB831a901f1199f3d459' as const,
  USDRIF: '0x3A15461d8ae0f0fb5fa2629e9da7D66a794a6e37' as const,
  GRANTS_BUCKET: '0x48229e5d82a186aa89a99212d2d59f5674aa5b6c' as const,
  GRANTS_ACTIVE_BUCKET: '0xf016fa6b237bb56e3aee7022c6947a6a103e3c47' as const,
  GROWTH_BUCKET: '0x267a6073637408b6a1d34d685ff5720a0cbcbd9d' as const,
  GENERAL_BUCKET: '0xfe3d9b7d68ae13455475f28089968336414fd358' as const,
} as const;

// ── RIF Relay Configurations ────────────────────────────────
export interface RifRelayConfig {
  relayHub: `0x${string}`;
  smartWalletFactory: `0x${string}`;
  deployVerifier: `0x${string}`;
  relayVerifier: `0x${string}`;
  relayUrl: string;
  allowedToken: `0x${string}`;
}

export const RIF_RELAY_CONFIGS: Record<number, RifRelayConfig> = {
  [TESTNET]: {
    relayHub: "0xAd525463961399793f8716b0D85133ff7503a7C2",
    smartWalletFactory: "0xBaDb31cAf5B95edd785446B76219b60fB1f07233",
    deployVerifier: "0xAe59e767768c6c25d64619Ee1c498Fd7D83e3c24",
    relayVerifier: "0x5897E84216220663F306676458Afc7bf2A6A3C52",
    relayUrl: "https://v2.relay.rif-wallet-services.testnet.rifcomputing.net",
    allowedToken: "0x19cbdcca78956ae53d5a4209995147be15e1bc83",
  },
  33: {
    relayHub: "0xDA7Ce79725418F4F6E13Bf5F520C89Cec5f6A974",
    smartWalletFactory: "0xE0825f57Dd05Ef62FF731c27222A86E104CC4Cad",
    deployVerifier: "0x73ec81da0C72DD112e06c09A6ec03B5544d26F05",
    relayVerifier: "0x03F23ae1917722d5A27a2Ea0Bcc98725a2a2a49a",
    relayUrl: "http://localhost:8090",
    allowedToken: "0x1Af2844A588759D0DE58abD568ADD96BB8B3B6D8",
  },
  [MAINNET]: {
    relayHub: "0xDA7Ce79725418F4F6E13Bf5F520C89Cec5f6A974",
    smartWalletFactory: "0x9eebec6c5157bee13b451b1dfe1ee2cb40846323",
    deployVerifier: "0x2fd633e358bc50ccf6bf926d621e8612b55264c9",
    relayVerifier: "0x5C9c7d96E6C59E55dA4dCf7F791AE58dAF8DBc86",
    relayUrl: "https://relay.rif-wallet-services.mainnet.rifcomputing.net",
    allowedToken: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5",
  },
};

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
