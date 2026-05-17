// ABI fragments for Sovryn Protocol and SovrynSwapNetwork interactions
// Generated from ISovryn.sol, ISovrynSwapNetwork.sol, and deployment artifacts.

// ── SovrynSwapNetwork: convertByPath (6-param version) ──────────────
export const sovrynSwapNetworkAbi = [
  {
    type: 'function',
    name: 'convertByPath',
    inputs: [
      { name: 'path', type: 'address[]', internalType: 'address[]' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'minReturn', type: 'uint256', internalType: 'uint256' },
      { name: 'beneficiary', type: 'address', internalType: 'address' },
      { name: 'affiliateAccount', type: 'address', internalType: 'address' },
      { name: 'affiliateFee', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'rateByPath',
    inputs: [
      { name: 'path', type: 'address[]', internalType: 'address[]' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'conversionPath',
    inputs: [
      { name: 'sourceToken', type: 'address', internalType: 'address' },
      { name: 'targetToken', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'address[]', internalType: 'address[]' }],
    stateMutability: 'view',
  },
] as const

// ── ISovryn (SovrynProtocol): swapExternal, getDefaultPathConversion, etc. ──
export const sovrynProtocolAbi = [
  {
    type: 'function',
    name: 'swapExternal',
    inputs: [
      { name: 'sourceToken', type: 'address', internalType: 'address' },
      { name: 'destToken', type: 'address', internalType: 'address' },
      { name: 'receiver', type: 'address', internalType: 'address' },
      { name: 'returnToSender', type: 'address', internalType: 'address' },
      { name: 'sourceTokenAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'requiredDestTokenAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'minReturn', type: 'uint256', internalType: 'uint256' },
      { name: 'swapData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [
      { name: 'destTokenAmountReceived', type: 'uint256', internalType: 'uint256' },
      { name: 'sourceTokenAmountUsed', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getSwapExpectedReturn',
    inputs: [
      { name: 'sourceToken', type: 'address', internalType: 'address' },
      { name: 'destToken', type: 'address', internalType: 'address' },
      { name: 'sourceTokenAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDefaultPathConversion',
    inputs: [
      { name: 'sourceTokenAddress', type: 'address', internalType: 'address' },
      { name: 'destTokenAddress', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'address[]', internalType: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sovrynSwapContractRegistryAddress',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSovrynSwapNetworkContract',
    inputs: [
      { name: 'sovrynSwapRegistryAddress', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supportedTokens',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
] as const

// ── LoanToken (iToken): mint, burn, tokenPrice ──────────────────────
export const loanTokenAbi = [
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'receiver', type: 'address', internalType: 'address' },
      { name: 'depositAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'mintAmount', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burn',
    inputs: [
      { name: 'receiver', type: 'address', internalType: 'address' },
      { name: 'burnAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'redeemed', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'tokenPrice',
    inputs: [],
    outputs: [{ name: 'price', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'assetBalanceOf',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// ── iRBTC-specific: payable mint / burn-to-BTC ─────────────────────
export const wrbtcLoanTokenAbi = [
  ...loanTokenAbi,
  {
    type: 'function',
    name: 'mintWithBTC',
    inputs: [
      { name: 'receiver', type: 'address', internalType: 'address' },
      { name: 'useLM', type: 'bool', internalType: 'bool' },
    ],
    outputs: [{ name: 'mintAmount', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'burnToBTC',
    inputs: [
      { name: 'receiver', type: 'address', internalType: 'address' },
      { name: 'burnAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'useLM', type: 'bool', internalType: 'bool' },
    ],
    outputs: [{ name: 'loanAmountPaid', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const
