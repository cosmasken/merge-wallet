# Merge Wallet — CLAUDE.md

## Project Overview

Merge Wallet is a self-custodial Rootstock (RSK) RBTC mobile wallet built with React 19, Vite 6, and Tailwind CSS 3. It uses viem for EVM interaction, Redux Toolkit for state management, and targets mobile via Capacitor 8.

## RSK Network Configuration

| Network | Chain ID | Public RPC | Explorer |
|---------|----------|------------|----------|
| Mainnet | 30 | `https://public-node.rsk.co` | `https://explorer.rsk.co` |
| Testnet | 31 | `https://public-node.testnet.rsk.co` | `https://explorer.testnet.rsk.co` |

Fallback priority for RPC: RSK RPC (`rpc.rootstock.io/{key}`) > Alchemy > Public node.

## Key Architecture

### EVM Integration (viem)

- `src/kernel/evm/ClientService.ts` — `createPublicClient` / `createWalletClient`
- `src/kernel/evm/KeyManagerService.ts` — BIP39 mnemonic + BIP44 path `m/44'/60'/0'/0/0`
- `src/kernel/evm/BalanceService.ts` — `eth_getBalance`, auto-refresh
- `src/kernel/evm/TransactionHistoryService.ts` — via Alchemy or explorer API
- `src/kernel/evm/TransactionBuilderService.ts` — build + estimate gas
- `src/kernel/evm/TransactionManagerService.ts` — sign + broadcast
- `src/kernel/evm/TokenManagerService.ts` — ERC-20 balance via `eth_call`

### Boot Lifecycle (AppProvider)

Phases: `PREFLIGHT` → `LOCKED` or `MIGRATING` → `RUNNING` ↔ `PAUSED` → `STARTUP_ERROR`

### State Management

Redux slices: `wallet`, `preferences`, `device`

### Code Organization

```
src/
├── Main.tsx              # Entry point with router
├── index.css             # Tailwind directives + fonts
├── components/
│   ├── layout/           # MainLayout, BottomNavigation, ViewHeader
│   ├── atoms/            # Button, Card, Address, WeiDisplay, icons
│   ├── composite/        # TokenCard
│   └── views/            # wallet/, assets/, security/, settings/
├── kernel/evm/           # EVM services
├── redux/                # Redux store + slices
├── util/                 # Utilities
├── hooks/                # Custom hooks
└── translations/         # i18n
```

## RSK-Specific Constants

- **Coin type (BIP44):** 60 (Ethereum) or 137 (RSK) — using 60 for broader tooling compat
- **RBTC decimals:** 18 (wei)
- **Bridge contract:** `0x0000000000000000000000000000000001000006`
- **Tokens:** RIF (`0x2acc95758f8b5f583470bA265E685CF8e3f4283b` mainnet), USDRIF (testnet)

## Security

- Keys derived via BIP39 mnemonic
- Encrypted keystore on device
- PIN with PBKDF2 + biometric fallback
- Private keys never exposed to JS runtime unnecessarily

## Conventions

PascalCase files, camelCase functions, boolean prefixes (`is`, `has`, `should`), strict import ordering. Tailwind utility classes only — no separate CSS files for components. TypeScript strict mode.

## Build Commands

```bash
pnpm dev       # Dev server at localhost:5173
pnpm build     # TypeScript check + Vite build
pnpm test      # Vitest
pnpm lint      # tsc --noEmit
```

