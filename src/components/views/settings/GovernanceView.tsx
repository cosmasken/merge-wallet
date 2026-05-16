import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import ViewHeader from "@/layout/ViewHeader";
import { selectChainId } from "@/redux/preferences";
import { isGovernanceAvailable } from "@/util/networks";
import { useGovernance } from "@/hooks/useGovernance";
import ProposalCard from "@/components/composite/ProposalCard";

export default function GovernanceView() {
  const navigate = useNavigate();
  const chainId = useSelector(selectChainId);
  const [votedProposals, setVotedProposals] = useState<Set<string>>(new Set());

  const {
    proposals,
    votingPower,
    loading,
    error,
    castVote,
    checkHasVoted,
    isAvailable,
    formattedVotingPower
  } = useGovernance();

  // Redirect if governance not available
  if (!isGovernanceAvailable(chainId)) {
    navigate("/settings");
    return null;
  }

  // Check voting status for all proposals
  useEffect(() => {
    const checkVotingStatus = async () => {
      if (!proposals.length || !isAvailable) return;
      
      const votingStatus = await Promise.all(
        proposals.map(async (proposal) => ({
          id: proposal.proposalId,
          hasVoted: await checkHasVoted(proposal.proposalId)
        }))
      );

      const voted = new Set(
        votingStatus.filter(status => status.hasVoted).map(status => status.id)
      );
      setVotedProposals(voted);
    };

    checkVotingStatus();
  }, [proposals, checkHasVoted, isAvailable]);

  const handleVote = async (proposalId: string, support: 0 | 1 | 2, reason?: string) => {
    try {
      await castVote(proposalId, support, reason);
      // Add to voted set immediately for UI feedback
      setVotedProposals(prev => new Set([...prev, proposalId]));
    } catch (error) {
      console.error("Failed to cast vote:", error);
      // Handle error (show toast, etc.)
    }
  };

  if (loading) {
    return (
      <div>
        <ViewHeader title="Governance" />
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <ViewHeader title="Governance" />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <h3 className="font-medium text-neutral-800 dark:text-neutral-100 mb-2">
            Failed to Load Governance Data
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div>
        <ViewHeader title="Governance" />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-yellow-500 mb-2">⚠️</div>
          <h3 className="font-medium text-neutral-800 dark:text-neutral-100 mb-2">
            Governance Not Available
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Switch to mainnet to participate in governance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ViewHeader title="Governance" />
      <div className="flex flex-col px-4 gap-4">
        
        {/* Voting Power Card */}
        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Your Voting Power</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">stRIF tokens delegated to you</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                {formattedVotingPower}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">stRIF</div>
            </div>
          </div>
          
          {votingPower?.canCreateProposal && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✓ You can create proposals
              </p>
            </div>
          )}
        </div>

        {/* Proposals Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-neutral-800 dark:text-neutral-100">
              Active Proposals
            </h3>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {proposals.length} proposals
            </span>
          </div>

          {proposals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-neutral-400 mb-2">📋</div>
              <p className="text-neutral-500 dark:text-neutral-400">
                No proposals available
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  hasVoted={votedProposals.has(proposal.proposalId)}
                  votingPower={formattedVotingPower}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}
        </div>

        {/* Learn More */}
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-4 mt-4">
          <h3 className="font-medium text-neutral-800 dark:text-neutral-100 mb-2">
            About Rootstock Collective
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Participate in decentralized governance of the Rootstock ecosystem through community proposals and voting.
          </p>
          <button 
            onClick={() => window.open('https://rootstockcollective.xyz', '_blank')}
            className="text-sm text-primary font-medium"
          >
            Learn More →
          </button>
        </div>

      </div>
    </div>
  );
}
