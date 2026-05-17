import { getPublicClientByChainId } from "./ClientService";
import KeyManagerService from "./KeyManagerService";
import { type Hex, hexToBytes, toHex } from "viem";

export interface RifRelayConfig {
  relayHub: `0x${string}`;
  smartWalletFactory: `0x${string}`;
  deployVerifier: `0x${string}`;
  relayVerifier: `0x${string}`;
  relayUrl: string;
  allowedToken: `0x${string}`;
}

const CONFIGS: Record<number, RifRelayConfig> = {
  // Testnet
  31: {
    relayHub: "0xAd525463961399793f8716b0D85133ff7503a7C2",
    smartWalletFactory: "0xBaDb31cAf5B95edd785446B76219b60fB1f07233",
    deployVerifier: "0xAe59e767768c6c25d64619Ee1c498Fd7D83e3c24",
    relayVerifier: "0x5897E84216220663F306676458Afc7bf2A6A3C52",
    relayUrl: "https://v2.relay.rif-wallet-services.testnet.rifcomputing.net",
    allowedToken: "0x19cbdcca78956ae53d5a4209995147be15e1bc83", // standard testnet token
  },
  // Regtest
  33: {
    relayHub: "0xDA7Ce79725418F4F6E13Bf5F520C89Cec5f6A974",
    smartWalletFactory: "0xE0825f57Dd05Ef62FF731c27222A86E104CC4Cad",
    deployVerifier: "0x73ec81da0C72DD112e06c09A6ec03B5544d26F05",
    relayVerifier: "0x03F23ae1917722d5A27a2Ea0Bcc98725a2a2a49a",
    relayUrl: "http://localhost:8090",
    allowedToken: "0x1Af2844A588759D0DE58abD568ADD96BB8B3B6D8", // UtilToken from deployment
  },
  // Mainnet
  30: {
    relayHub: "0xDA7Ce79725418F4F6E13Bf5F520C89Cec5f6A974",
    smartWalletFactory: "0x9eebec6c5157bee13b451b1dfe1ee2cb40846323",
    deployVerifier: "0x2fd633e358bc50ccf6bf926d621e8612b55264c9",
    relayVerifier: "0x5C9c7d96E6C59E55dA4dCf7F791AE58dAF8DBc86",
    relayUrl: "https://relay.rif-wallet-services.mainnet.rifcomputing.net",
    allowedToken: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5", // RIF Token
  },
};

export function getRifRelayConfig(chainId: number): RifRelayConfig {
  return CONFIGS[chainId] || CONFIGS[31];
}

export default function RifRelayService(chainId: number) {
  const config = getRifRelayConfig(chainId);
  const publicClient = getPublicClientByChainId(chainId);

  /**
   * Deterministically derive the counterfactual Smart Wallet address.
   */
  async function getSmartWalletAddress(eoaAddress: `0x${string}`): Promise<`0x${string}`> {
    try {
      const address = await publicClient.readContract({
        address: config.smartWalletFactory,
        abi: [
          {
            inputs: [
              { name: "from", type: "address" },
              { name: "recoverer", type: "address" },
              { name: "index", type: "uint256" }
            ],
            name: "getSmartWalletAddress",
            outputs: [{ name: "", type: "address" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "getSmartWalletAddress",
        args: [eoaAddress, "0x0000000000000000000000000000000000000000" as `0x${string}`, 0n],
      });
      return address as `0x${string}`;
    } catch (err) {
      console.error("[RIF Smart Wallet] Failed to derive address for", eoaAddress, "on chain", chainId, err);
      return eoaAddress;
    }
  }

  /**
   * Check if the Smart Wallet contract has been deployed on-chain.
   */
  async function isSmartWalletDeployed(smartWalletAddress: `0x${string}`): Promise<boolean> {
    try {
      const code = await publicClient.getBytecode({ address: smartWalletAddress });
      return !!code && code !== "0x";
    } catch {
      return false;
    }
  }

  /**
   * Fetch current Smart Wallet transaction nonce.
   */
  async function getSmartWalletNonce(smartWalletAddress: `0x${string}`): Promise<bigint> {
    try {
      const nonce = await publicClient.readContract({
        address: smartWalletAddress,
        abi: [
          {
            inputs: [],
            name: "nonce",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function"
          }
        ],
        functionName: "nonce",
      });
      return nonce as bigint;
    } catch {
      return 0n;
    }
  }

  /**
   * Query off-chain RIF Relay Server details.
   */
  async function getRelayServerInfo(): Promise<any> {
    try {
      const res = await fetch(`${config.relayUrl}/chain-info`);
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Sign and broadcast a sponsored transaction using the RIF Smart Wallet.
   */
  async function relayTransaction(
    to: `0x${string}`,
    data: Hex,
    value: bigint = 0n,
    tokenAmount: bigint = 0n // 0 for sponsored transactions
  ): Promise<{ txHash: string; success: boolean; error?: string }> {
    try {
      const account = KeyManagerService().getAccount();
      const smartWalletAddress = await getSmartWalletAddress(account.address);
      const isDeployed = await isSmartWalletDeployed(smartWalletAddress);
      
      const serverInfo = await getRelayServerInfo();
      if (!serverInfo) {
        return { txHash: "", success: false, error: "Relay server offline or unreachable" };
      }

      const nonce = await getSmartWalletNonce(smartWalletAddress);
      const gasPrice = BigInt(serverInfo.minGasPrice || "6000000000");
      const feesReceiver = (serverInfo.feesReceiver || "0x0000000000000000000000000000000000000000") as `0x${string}`;

      // Domain separator
      const domain = {
        name: "RSK Enveloping Smart Wallet",
        version: "2",
        chainId,
        verifyingContract: isDeployed ? smartWalletAddress : config.smartWalletFactory,
      };

      const relayData = {
        gasPrice,
        feesReceiver,
        callForwarder: isDeployed ? smartWalletAddress : config.smartWalletFactory,
        callVerifier: isDeployed ? config.relayVerifier : config.deployVerifier,
      };

      // Set validity window to 1 hour (3600 seconds)
      const validUntilTime = BigInt(Math.floor(Date.now() / 1000) + 3600);

      let signature: string;
      let payload: any;

      if (!isDeployed) {
        // Prepare DeployRequest (First transaction)
        const message = {
          relayHub: config.relayHub,
          from: account.address,
          to,
          tokenContract: config.allowedToken,
          recoverer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          value,
          nonce,
          tokenAmount,
          tokenGas: 0n,
          validUntilTime,
          index: 0n,
          data,
          relayData,
        };

        signature = await account.signTypedData({
          domain,
          types: {
            RelayData: [
              { name: "gasPrice", type: "uint256" },
              { name: "feesReceiver", type: "address" },
              { name: "callForwarder", type: "address" },
              { name: "callVerifier", type: "address" },
            ],
            RelayRequest: [
              { name: "relayHub", type: "address" },
              { name: "from", type: "address" },
              { name: "to", type: "address" },
              { name: "tokenContract", type: "address" },
              { name: "recoverer", type: "address" },
              { name: "value", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "tokenAmount", type: "uint256" },
              { name: "tokenGas", type: "uint256" },
              { name: "validUntilTime", type: "uint256" },
              { name: "index", type: "uint256" },
              { name: "data", type: "bytes" },
              { name: "relayData", type: "RelayData" },
            ],
          },
          primaryType: "RelayRequest",
          message,
        });

        payload = {
          relayRequest: {
            request: {
              ...message,
              value: message.value.toString(),
              nonce: message.nonce.toString(),
              tokenAmount: message.tokenAmount.toString(),
              tokenGas: message.tokenGas.toString(),
              validUntilTime: message.validUntilTime.toString(),
              index: message.index.toString(),
            },
            relayData: {
              ...relayData,
              gasPrice: relayData.gasPrice.toString(),
            },
          },
          metadata: {
            signature,
          },
        };
      } else {
        // Prepare RelayRequest (Subsequent transactions)
        const message = {
          relayHub: config.relayHub,
          from: account.address,
          to,
          tokenContract: config.allowedToken,
          value,
          gas: 100000n, // standard relay execution gas limit
          nonce,
          tokenAmount,
          tokenGas: 0n,
          validUntilTime,
          data,
          relayData,
        };

        signature = await account.signTypedData({
          domain,
          types: {
            RelayData: [
              { name: "gasPrice", type: "uint256" },
              { name: "feesReceiver", type: "address" },
              { name: "callForwarder", type: "address" },
              { name: "callVerifier", type: "address" },
            ],
            RelayRequest: [
              { name: "relayHub", type: "address" },
              { name: "from", type: "address" },
              { name: "to", type: "address" },
              { name: "tokenContract", type: "address" },
              { name: "value", type: "uint256" },
              { name: "gas", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "tokenAmount", type: "uint256" },
              { name: "tokenGas", type: "uint256" },
              { name: "validUntilTime", type: "uint256" },
              { name: "data", type: "bytes" },
              { name: "relayData", type: "RelayData" },
            ],
          },
          primaryType: "RelayRequest",
          message,
        });

        payload = {
          relayRequest: {
            request: {
              ...message,
              value: message.value.toString(),
              gas: message.gas.toString(),
              nonce: message.nonce.toString(),
              tokenAmount: message.tokenAmount.toString(),
              tokenGas: message.tokenGas.toString(),
              validUntilTime: message.validUntilTime.toString(),
            },
            relayData: {
              ...relayData,
              gasPrice: relayData.gasPrice.toString(),
            },
          },
          metadata: {
            signature,
          },
        };
      }

      // Broadcast to Relay Server via HTTP POST
      const res = await fetch(`${config.relayUrl}/relay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (responseData.error) {
        return { txHash: "", success: false, error: responseData.error };
      }

      return { txHash: responseData.txHash || "", success: true };
    } catch (e: any) {
      return { txHash: "", success: false, error: e.message || "Failed to relay transaction" };
    }
  }

  return {
    getSmartWalletAddress,
    isSmartWalletDeployed,
    getSmartWalletNonce,
    getRelayServerInfo,
    relayTransaction,
  };
}
