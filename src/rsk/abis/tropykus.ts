// Minimal ABI for Tropykus cToken and Comptroller interactions

export const cTokenAbi = [
  {
    type: 'function',
    name: 'mint',
    inputs: [{ name: 'mintAmount', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'redeem',
    inputs: [{ name: 'redeemTokens', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'borrow',
    inputs: [{ name: 'borrowAmount', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'repayBorrow',
    inputs: [{ name: 'repayAmount', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'exchangeRateStored',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supplyRatePerBlock',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'borrowRatePerBlock',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export const comptrollerAbi = [
  {
    type: 'function',
    name: 'enterMarkets',
    inputs: [{ name: 'cTokens', type: 'address[]', internalType: 'address[]' }],
    outputs: [{ name: '', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAccountLiquidity',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'error', type: 'uint256', internalType: 'uint256' },
      { name: 'liquidity', type: 'uint256', internalType: 'uint256' },
      { name: 'shortfall', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const
