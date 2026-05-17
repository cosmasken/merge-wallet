# Release Notes - Merge Wallet

All notable updates and tracking logs for the Merge Wallet Android application.

---

## [0.1.4-beta.1] - 2026-05-17
- **Version Code**: `4`
- **Minimum SDK**: `21` (Android 5.0)
- **Target SDK**: `34` (Android 14)

### 📲 Google Play Console Release Notes (Concise Summary)
> **Copy & Paste into the Play Console (405 characters)**:
> 
> * Added complete recovery phrase backup & verification flow to secure your wallet creation.
> * Sanitized wallet import interface to ensure copy-pasting mnemonics works flawlessly.
> * Interactive combined portfolio value & dynamic local fiat currency calculations (CoinGecko).
> * Premium interactive asset balance dropdown filters on the home dashboard.
> * Full support for RIF Smart Wallet (gasless tx) and Sovryn DeFi testnet.

---

### 🛠️ Complete Developer Change Logs (Tracking)

#### New Features & UI/UX Enhancements
- **Premium Asset Portfolio Value**: Implemented combined combined portfolio value display in the native local currency with live dynamic exchange rate scaling via CoinGecko.
- **Dynamic Asset Filter**: Integrated an interactive asset dropdown filter in the `WalletHome` dashboard.
- **Interactive Address Copy**: Added interactive one-tap address copying to dashboard elements.
- **Smart Wallet & Governance**: Integrated full RIF Smart Wallet (gasless transactions, sponsored fee delegation) and governance voting modules for the Rootstock Collective.
- **DeFi Protocol Integrations**: Added support for the Money on Chain (MoC) and Sovryn protocols, enabling swaps (RBTC/XUSD) and tokenized leverage (BPro) directly on Rootstock testnet/mainnet.
- **Token & Address Directory**: Centralized network addresses and tokens.

#### Security & Bug Fixes
- **Wallet Onboarding & Backup Loop**: Resolved the black screen route bug on wallet creation by adding the missing `/wallet/backup` screen and its verification flow.
- **Sanitized Recovery Phrase Imports**: Normalized trailing and consecutive whitespaces, tabs, and newlines in recovery phrase inputs during import to prevent derivation failures on mobile keyboards and clipboards.
- **Telegram Notification CI/CD Workflow**: Secured the pipeline against command injection by mapping GitHub expressions to environment variables and prevented message truncation using URL parameter encoding.
- **Testnet Card Gating**: Unlocked and unified Sovryn testnet card balances using `TokenManagerService`.
