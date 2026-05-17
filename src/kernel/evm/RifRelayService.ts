import { getPublicClientByChainId } from "./ClientService";
import KeyManagerService from "./KeyManagerService";
import { type Hex, hexToBytes, toHex } from "viem";
import { type RifRelayConfig, RIF_RELAY_CONFIGS } from "@/rsk/addresses";

const CONFIGS: Record<number, RifRelayConfig> = RIF_RELAY_CONFIGS;

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
