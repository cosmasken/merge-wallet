# Merge Wallet: Your key to Rootstock

Self-custodial Rootstock (RSK) RBTC mobile wallet built with React 19, Vite 6, and Capacitor 8.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite 6** — Build tooling
- **Capacitor 8** — Cross-platform native bridge (iOS, Android, Web)
- **Redux Toolkit** — State management
- **Tailwind CSS 3** — Styling
- **viem** — EVM interaction (accounts, balances, transactions, tokens, NFTs)
- **BIP39 / BIP44** — Key derivation (m/44'/60'/0'/0/0)
- **capacitor-plugin-simple-encryption** — PIN/biometric auth with AES-256-GCM

## Developer Quick Start

1. `git clone <repo-url>`
2. `cd mobile`
3. `pnpm install`
4. `pnpm dev`
5. http://localhost:5173

## Building for Android

1. Install [Android Studio](https://developer.android.com/studio)
2. `pnpm build && npx cap sync`
3. `npx cap run android`
4. (optional) `npx cap open android`

## Building for iOS

1. Install [Xcode](https://developer.apple.com/xcode/)
2. `pnpm build && npx cap sync`
3. `npx cap run ios`
4. (optional) `npx cap open ios`

## RSK Network Config

| Network | Chain ID | Public RPC | Explorer |
|---------|----------|------------|----------|
| Mainnet | 30 | `https://public-node.rsk.co` | `https://explorer.rsk.co` |
| Testnet | 31 | `https://public-node.testnet.rsk.co` | `https://explorer.testnet.rsk.co` |

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server |
| `pnpm build` | TypeScript check + Vite build |
| `pnpm lint` | `tsc --noEmit` |
| `pnpm test` | Vitest |

## Architecture

```
src/
├── Main.tsx               # Entry point with router
├── kernel/evm/            # EVM services (Client, KeyManager, Balance, Transaction*, Token*, Nft)
├── kernel/app/            # App services (SecurityService)
├── redux/                 # Redux store + slices (wallet, preferences, device)
├── components/
│   ├── layout/            # MainLayout, BottomNavigation, ViewHeader
│   ├── atoms/             # Button, Card, Address, WeiDisplay, FiatValue, icons
│   ├── composite/         # TokenCard
│   └── views/             # wallet/, assets/, security/, settings/
├── util/                  # Utilities
└── translations/          # i18n (unused — placeholder)
```

## License

MIT
