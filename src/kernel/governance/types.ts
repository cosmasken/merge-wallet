export interface Proposal {
  id: string
  proposalId: string
  title: string
  description: string
  state: 'Pending' | 'Active' | 'Canceled' | 'Defeated' | 'Succeeded' | 'Queued' | 'Expired' | 'Executed'
  startBlock: string
  endBlock: string
  forVotes: string
  againstVotes: string
  abstainVotes: string
  createdAt: string
}

export interface VotingPower {
  balance: bigint
  votes: bigint
  canCreateProposal: boolean
  threshold: bigint
}

export interface Vote {
  proposalId: string
  support: 0 | 1 | 2 // Against, For, Abstain
  reason?: string
  weight: string
}
