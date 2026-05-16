import React, { useState } from 'react';
import { formatUnits } from 'viem';
import Card from '../atoms/Card';
import Button from '../atoms/Button';
import type { Proposal } from '@/kernel/governance/types';

interface ProposalCardProps {
  proposal: Proposal;
  hasVoted: boolean;
  votingPower: string;
  onVote: (proposalId: string, support: 0 | 1 | 2, reason?: string) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  hasVoted,
  votingPower,
  onVote,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [reason, setReason] = useState('');

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'succeeded': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'executed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'defeated': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatVotes = (votes: string) => {
    const num = parseFloat(formatUnits(BigInt(votes), 18));
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const totalVotes = BigInt(proposal.forVotes) + BigInt(proposal.againstVotes) + BigInt(proposal.abstainVotes);
  const forPercentage = totalVotes > 0n ? Number(BigInt(proposal.forVotes) * 100n / totalVotes) : 0;
  const againstPercentage = totalVotes > 0n ? Number(BigInt(proposal.againstVotes) * 100n / totalVotes) : 0;

  const handleVote = (support: 0 | 1 | 2) => {
    onVote(proposal.proposalId, support, reason.trim() || undefined);
    setShowVoteModal(false);
    setReason('');
  };

  return (
    <>
      <Card className="p-4 mb-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-neutral-800 dark:text-neutral-100 line-clamp-2 mb-2">
              {proposal.title}
            </h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStateColor(proposal.state)}`}>
              {proposal.state}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-3">
          {proposal.description}
        </p>

        {/* Vote Results */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-green-600 dark:text-green-400">For: {formatVotes(proposal.forVotes)}</span>
            <span className="text-red-600 dark:text-red-400">Against: {formatVotes(proposal.againstVotes)}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
            <div className="h-full flex">
              <div 
                className="bg-green-500 transition-all duration-300" 
                style={{ width: `${forPercentage}%` }}
              />
              <div 
                className="bg-red-500 transition-all duration-300" 
                style={{ width: `${againstPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {proposal.state === 'Active' && !hasVoted && parseFloat(votingPower) > 0 ? (
            <Button 
              size="sm" 
              variant="primary" 
              fullWidth
              onClick={() => setShowVoteModal(true)}
            >
              Vote
            </Button>
          ) : hasVoted ? (
            <div className="flex-1 text-center py-2 text-sm text-neutral-500 dark:text-neutral-400">
              ✓ Voted
            </div>
          ) : parseFloat(votingPower) === 0 ? (
            <div className="flex-1 text-center py-2 text-sm text-neutral-500 dark:text-neutral-400">
              No voting power
            </div>
          ) : (
            <div className="flex-1 text-center py-2 text-sm text-neutral-500 dark:text-neutral-400">
              Voting closed
            </div>
          )}
          
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Less' : 'Details'}
          </Button>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Proposal ID:</span>
              <span className="text-neutral-700 dark:text-neutral-300">#{proposal.proposalId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Abstain:</span>
              <span className="text-neutral-700 dark:text-neutral-300">{formatVotes(proposal.abstainVotes)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Vote Modal */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-t-xl w-full p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-100 mb-4">
              Cast Your Vote
            </h3>
            
            <div className="space-y-3 mb-4">
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => handleVote(1)}
                className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
              >
                Vote For
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => handleVote(0)}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                Vote Against
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => handleVote(2)}
                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900/20"
              >
                Abstain
              </Button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you voting this way?"
                className="w-full p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 text-sm resize-none"
                rows={3}
              />
            </div>

            <Button 
              variant="ghost" 
              fullWidth 
              onClick={() => setShowVoteModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProposalCard;
