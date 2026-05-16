import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { formatUnits } from "viem";

import { selectWalletAddress } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import { GovernanceService } from "@/kernel/governance/GovernanceService";
import type { Proposal, VotingPower } from "@/kernel/governance/types";

export function useGovernance() {
  const address = useSelector(selectWalletAddress);
  const chainId = useSelector(selectChainId);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chainId !== 30 || !address) {
      setLoading(false);
      return;
    }

    const loadGovernanceData = async () => {
      try {
        setLoading(true);
        setError(null);

        const governanceService = new GovernanceService(chainId);

        const [proposalsData, votingPowerData] = await Promise.all([
          governanceService.getProposals(),
          governanceService.getVotingPower(address)
        ]);

        setProposals(proposalsData);
        setVotingPower(votingPowerData);
      } catch (err) {
        console.error("Failed to load governance data:", err);
        setError(err instanceof Error ? err.message : "Failed to load governance data");
      } finally {
        setLoading(false);
      }
    };

    loadGovernanceData();
  }, [address, chainId]);

  const castVote = async (proposalId: string, support: 0 | 1 | 2, reason?: string) => {
    if (!address || chainId !== 30) {
      throw new Error("Voting only available on mainnet with connected wallet");
    }

    const governanceService = new GovernanceService(chainId);
    return await governanceService.castVote(proposalId, support, reason);
  };

  const delegate = async (delegatee: string) => {
    if (!address || chainId !== 30) {
      throw new Error("Delegation only available on mainnet with connected wallet");
    }

    const governanceService = new GovernanceService(chainId);
    return await governanceService.delegate(delegatee);
  };

  const checkHasVoted = async (proposalId: string) => {
    if (!address || chainId !== 30) return false;

    const governanceService = new GovernanceService(chainId);
    return await governanceService.hasVoted(proposalId, address);
  };

  return {
    proposals,
    votingPower,
    loading,
    error,
    castVote,
    delegate,
    checkHasVoted,
    isAvailable: chainId === 30 && !!address,
    formattedVotingPower: votingPower ? formatUnits(votingPower.votes, 18) : "0"
  };
}
