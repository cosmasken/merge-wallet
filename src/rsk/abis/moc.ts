// Minimal ABI fragments for MoC Core contract interactions

export const mocCoreAbi = [
  {
    type: 'function',
    name: 'getBtcPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mintDoc',
    inputs: [
      { name: 'btcAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'docAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'redeemDoc',
    inputs: [
      { name: 'docAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'btcAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mintBPro',
    inputs: [
      { name: 'btcAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'bproAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'redeemBPro',
    inputs: [
      { name: 'bproAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'btcAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export const mocStateAbi = [
  {
    type: 'function',
    name: 'getBitProPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const
