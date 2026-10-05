import { ProposalState, type Governance, type Proposal, type ProgramAccount } from "@solana/spl-governance";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import { MARINADE_COUNCIL_MINT, MNDE_MINT } from "@/config/marinade";

const pk = (s: string) => new PublicKey(s);

export function makeProposal(overrides: Record<string, unknown> = {}): ProgramAccount<Proposal> {
  const account = {
    accountType: 14,
    governance: pk("8z6A4qSfL9FFvwX12zqt6HrbzaWthGUqBe4czCn9iXtq"),
    governingTokenMint: pk(MNDE_MINT),
    state: ProposalState.Voting,
    tokenOwnerRecord: pk("E7zQfyJiZ1sGkNxw8pPGkkVYxUoxGcKqnQjZeBjFHNFo"),
    name: "MIP-23: Full validator coverage of PSR downtime",
    descriptionLink: "",
    options: [
      { label: "Approve", voteWeight: new BN(0), voteResult: 0, instructionsExecutedCount: 0, instructionsCount: 0, instructionsNextIndex: 0 },
    ],
    denyVoteWeight: new BN(0),
    vetoVoteWeight: new BN(0),
    abstainVoteWeight: undefined,
    maxVoteWeight: undefined,
    draftAt: new BN(1_789_000_000),
    signingOffAt: null,
    votingAt: new BN(1_789_000_000),
    votingAtSlot: null,
    votingCompletedAt: null,
    executingAt: null,
    closedAt: null,
    maxVotingTime: undefined,
    ...overrides,
  } as unknown as Proposal;
  return { pubkey: pk("Gd5CfxVQ1UYm4wToL5SVb9QhmCtcBTHo73QDnGMAmu6S"), account, owner: pk("GovMaiHfpVPw8BAM1mbdzgmSZYDw2tdP32J2fapoQoYs") };
}

export function makeGovernance(baseVotingTime = 259_200, votingCoolOffTime = 86_400): Governance {
  return { config: { baseVotingTime, votingCoolOffTime } } as unknown as Governance;
}

export const COUNCIL_MINT = pk(MARINADE_COUNCIL_MINT);
export { BN };
