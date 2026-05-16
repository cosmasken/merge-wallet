import { erc721Abi } from "viem";
import { getPublicClient } from "@/kernel/evm/ClientService";

export interface NftInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  balance: bigint;
}

export interface NftToken {
  contractAddress: `0x${string}`;
  tokenId: bigint;
  tokenURI: string | null;
}

const KNOWN_NFTS: Record<string, { tokenIds: bigint[] }> = {
  "0x7b21bb17211c1b55ddcab1fbfb44a0b2b1a23077": { tokenIds: [12n] },
};

export default function NftService(chainId?: number) {
  const publicClient = getPublicClient(chainId);

  async function getNftBalance(
    contractAddress: `0x${string}`,
    walletAddress: `0x${string}`,
  ): Promise<NftInfo | null> {
    try {
      const [balance, name, symbol] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: erc721Abi,
          functionName: "balanceOf",
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: erc721Abi,
          functionName: "name",
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: erc721Abi,
          functionName: "symbol",
        }),
      ]);

      return {
        address: contractAddress,
        name: name as string,
        symbol: symbol as string,
        balance: balance as bigint,
      };
    } catch {
      return null;
    }
  }

  async function getKnownTokens(
    contractAddress: `0x${string}`,
    walletAddress: `0x${string}`,
  ): Promise<NftToken[]> {
    const known = KNOWN_NFTS[contractAddress.toLowerCase()];
    if (!known) return [];

    const results = await Promise.all(
      known.tokenIds.map(async (tokenId) => {
        try {
          const owner = await publicClient.readContract({
            address: contractAddress,
            abi: erc721Abi,
            functionName: "ownerOf",
            args: [tokenId],
          });

          if ((owner as string).toLowerCase() !== walletAddress.toLowerCase()) {
            return null;
          }

          let tokenURI: string | null = null;
          try {
            tokenURI = await publicClient.readContract({
              address: contractAddress,
              abi: erc721Abi,
              functionName: "tokenURI",
              args: [tokenId],
            }) as string;
          } catch {
          }

          return { contractAddress, tokenId, tokenURI };
        } catch {
          return null;
        }
      }),
    );

    return results.filter((r): r is NftToken => r !== null);
  }

  async function getNftBalances(
    walletAddress: `0x${string}`,
    contractAddresses: `0x${string}`[],
  ): Promise<NftInfo[]> {
    const results = await Promise.all(
      contractAddresses.map((addr) => getNftBalance(addr, walletAddress)),
    );
    return results.filter((r): r is NftInfo => r !== null && r.balance > 0n);
  }

  return {
    getNftBalance,
    getNftBalances,
    getKnownTokens,
  };
}
