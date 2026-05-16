import { createPublicClient, encodeFunctionData, http } from 'viem'
import { rootstock } from 'viem/chains'
import { GOVERNANCE_CONTRACTS, GOVERNANCE_GRAPH_URL, isGovernanceAvailable } from '@/util/networks'
import { GovernorAbi } from './abis/GovernorAbi'
import { StRIFTokenAbi } from './abis/StRIFTokenAbi'
import TransactionManagerService from '@/kernel/evm/TransactionManagerService'
import type { Proposal, VotingPower } from './types'
export class GovernanceService {
  private publicClient = createPublicClient({
    chain: rootstock,
    transport: http('https://public-node.rsk.co')
  })

  constructor(private chainId: number) {
    if (!isGovernanceAvailable(chainId)) {
      throw new Error('Governance only available on Rootstock mainnet')
    }
  }

  async getProposals(): Promise<Proposal[]> {
    try {
      const response = await fetch(GOVERNANCE_GRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetProposals {
              proposals(orderBy: createdAt, orderDirection: desc, first: 10) {
                id
                proposalId
                title
                description
                state
                startBlock
                endBlock
                forVotes
                againstVotes
                abstainVotes
                createdAt
              }
            }
          `
        })
      })
      
      const data = await response.json()
      return data.data?.proposals || []
    } catch (error) {
      console.error('Failed to fetch proposals:', error)
      return []
    }
  }

  async getVotingPower(address: string): Promise<VotingPower | null> {
    try {
      const [balance, votes, threshold] = await Promise.all([
        this.publicClient.readContract({
          address: GOVERNANCE_CONTRACTS.STRIF,
          abi: StRIFTokenAbi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        }),
        this.publicClient.readContract({
          address: GOVERNANCE_CONTRACTS.STRIF,
          abi: StRIFTokenAbi,
          functionName: 'getVotes',
          args: [address as `0x${string}`]
        }),
        this.publicClient.readContract({
          address: GOVERNANCE_CONTRACTS.GOVERNOR,
          abi: GovernorAbi,
          functionName: 'proposalThreshold'
        })
      ])

      return {
        balance: balance as bigint,
        votes: votes as bigint,
        canCreateProposal: (votes as bigint) >= (threshold as bigint),
        threshold: threshold as bigint
      }
    } catch (error) {
      console.error('Failed to get voting power:', error)
      return null
    }
  }

  async hasVoted(proposalId: string, address: string): Promise<boolean> {
    try {
      const hasVoted = await this.publicClient.readContract({
        address: GOVERNANCE_CONTRACTS.GOVERNOR,
        abi: GovernorAbi,
        functionName: 'hasVoted',
        args: [BigInt(proposalId), address as `0x${string}`]
      })

      return hasVoted as boolean
    } catch (error) {
      console.error('Failed to check vote status:', error)
      return false
    }
  }

  // Cast vote using wallet's transaction manager
  async castVote(proposalId: string, support: 0 | 1 | 2, reason?: string) {
    const txManager = TransactionManagerService(this.chainId)
    
    const data = reason 
      ? encodeFunctionData({
          abi: GovernorAbi,
          functionName: 'castVoteWithReason',
          args: [BigInt(proposalId), support, reason]
        })
      : encodeFunctionData({
          abi: GovernorAbi,
          functionName: 'castVote',
          args: [BigInt(proposalId), support]
        })

    return await txManager.sendContractTransaction(
      GOVERNANCE_CONTRACTS.GOVERNOR,
      0n, // No value for voting
      data
    )
  }

  // Delegate voting power using wallet's transaction manager
  async delegate(delegatee: string) {
    const txManager = TransactionManagerService(this.chainId)
    
    const data = encodeFunctionData({
      abi: StRIFTokenAbi,
      functionName: 'delegate',
      args: [delegatee as `0x${string}`]
    })

    return await txManager.sendContractTransaction(
      GOVERNANCE_CONTRACTS.STRIF,
      0n, // No value for delegation
      data
    )
  }

  // Get current delegate
  async getCurrentDelegate(address: string): Promise<string> {
    try {
      const delegate = await this.publicClient.readContract({
        address: GOVERNANCE_CONTRACTS.STRIF,
        abi: StRIFTokenAbi,
        functionName: 'delegates',
        args: [address as `0x${string}`]
      })

      return delegate as string
    } catch (error) {
      console.error('Failed to get current delegate:', error)
      return '0x0000000000000000000000000000000000000000'
    }
  }
}
