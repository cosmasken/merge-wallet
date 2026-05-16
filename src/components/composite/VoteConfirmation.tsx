import React from 'react';
import Card from '../atoms/Card';
import Button from '../atoms/Button';
import Address from '../atoms/Address';
import type { Proposal } from '@/kernel/governance/types';

export interface VoteConfirmationProps {
  proposal: Proposal;
  support: 0 | 1 | 2; // Against, For, Abstain
  reason?: string;
  votingPower: string;
  onConfirm: () => Promise<void>;
  onEdit: () => void;
  onCancel: () => void;
}

const VoteConfirmation: React.FC<VoteConfirmationProps> = ({
  proposal,
  support,
  reason,
  votingPower,
  onConfirm,
  onEdit,
  onCancel,
}) => {
  const getSupportText = (support: number) => {
    switch (support) {
      case 0: return { text: 'Against', color: 'text-red-400', bg: 'bg-red-900/20 border-red-900/50' };
      case 1: return { text: 'For', color: 'text-green-400', bg: 'bg-green-900/20 border-green-900/50' };
      case 2: return { text: 'Abstain', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-900/50' };
      default: return { text: 'Unknown', color: 'text-gray-400', bg: 'bg-gray-900/20 border-gray-900/50' };
    }
  };

  const supportInfo = getSupportText(support);

  return (
    <div className="flex flex-col gap-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">Confirm Vote</h2>
        <p className="text-neutral-500 dark:text-gray-400">Review your vote on this proposal</p>
      </div>

      <Card className="bg-white dark:bg-gray-900/50 border-neutral-200 dark:border-gray-800">
        <div className="space-y-4">
          {/* Proposal Info */}
          <div>
            <span className="text-neutral-500 dark:text-gray-400 text-sm">Proposal</span>
            <h3 className="font-medium text-neutral-800 dark:text-white mt-1 line-clamp-2">
              {proposal.title}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mt-2 line-clamp-3">
              {proposal.description}
            </p>
          </div>

          <div className="border-t border-neutral-200 dark:border-gray-800 pt-4">
            {/* Vote Choice */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-neutral-500 dark:text-gray-400">Your Vote</span>
              <div className={`px-3 py-1 rounded-full border ${supportInfo.bg}`}>
                <span className={`font-medium ${supportInfo.color}`}>
                  {supportInfo.text}
                </span>
              </div>
            </div>

            {/* Voting Power */}
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 dark:text-gray-400">Voting Power</span>
              <span className="font-medium text-neutral-800 dark:text-white">
                {votingPower} stRIF
              </span>
            </div>

            {/* Reason (if provided) */}
            {reason && (
              <div className="mt-4">
                <span className="text-neutral-500 dark:text-gray-400 text-sm">Reason</span>
                <p className="text-sm text-neutral-700 dark:text-gray-300 mt-1 p-3 bg-neutral-50 dark:bg-gray-800/50 rounded-lg">
                  {reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Governance Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl flex gap-3">
        <div className="text-blue-600 dark:text-blue-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-blue-800 dark:text-blue-200 font-medium text-sm">Governance Vote</h4>
          <p className="text-blue-700 dark:text-blue-300 text-xs">
            Your vote will be recorded on-chain and cannot be changed. Gas fees apply.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth 
          onClick={onConfirm}
          className="bg-primary-600 hover:bg-primary-700 shadow-lg"
        >
          Cast Vote
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" fullWidth onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoteConfirmation;
