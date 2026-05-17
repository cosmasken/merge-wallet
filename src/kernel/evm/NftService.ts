import { erc721Abi } from "viem";
import { getPublicClient } from "@/kernel/evm/ClientService";

export interface NftInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  balance: bigint;
  image: string | null;
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

  function resolveIpfs(uri: string): string {
    if (!uri) return "";
    if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
    }
    return uri;
  }

  async function getNftImage(
    contractAddress: `0x${string}`,
    walletAddress: `0x${string}`,
  ): Promise<string | null> {
    try {
      let tokenId = 0n;
      try {
        tokenId = await publicClient.readContract({
          address: contractAddress,
          abi: [
            {
              inputs: [
                { name: "owner", type: "address" },
                { name: "index", type: "uint256" }
              ],
              name: "tokenOfOwnerByIndex",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function"
            }
          ],
          functionName: "tokenOfOwnerByIndex",
          args: [walletAddress, 0n],
        }) as bigint;
      } catch {
        const known = KNOWN_NFTS[contractAddress.toLowerCase()];
        if (known && known.tokenIds.length > 0) {
          tokenId = known.tokenIds[0];
        } else {
          tokenId = 1n;
        }
      }

      const tokenURI = await publicClient.readContract({
        address: contractAddress,
        abi: erc721Abi,
        functionName: "tokenURI",
        args: [tokenId],
      }) as string;

      if (!tokenURI) return null;

      const resolvedUri = resolveIpfs(tokenURI);
      if (!resolvedUri) return null;

      const res = await fetch(resolvedUri);
      const metadata = await res.json();
      if (metadata.image) {
        return resolveIpfs(metadata.image);
      }
      return null;
    } catch {
      return null;
    }
  }

  async function getNftBalance(
    contractAddress: `0x${string}`,
    walletAddress: `0x${string}`,
  ): Promise<NftInfo | null> {
    try {
      const [balance, name, symbol, image] = await Promise.all([
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
        getNftImage(contractAddress, walletAddress).catch(() => null),
      ]);

      return {
        address: contractAddress,
        name: name as string,
        symbol: symbol as string,
        balance: balance as bigint,
        image: image || null,
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
