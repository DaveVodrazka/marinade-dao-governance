import {
  Governance,
  GovernanceAccountParser,
  GovernanceAccountType,
  Proposal,
  ProposalTransaction,
  Realm,
  TokenOwnerRecord,
  type ProgramAccount,
} from "@solana/spl-governance";
import { PublicKey, type AccountInfo } from "@solana/web3.js";
import bs58 from "bs58";

import type { RawAccount } from "@/lib/solana/connection";

/**
 * Raw account decoding. This is the only module that knows how SPL Governance
 * accounts are laid out; it delegates the Borsh schemas to @solana/spl-governance.
 */

export class AccountDecodeError extends Error {
  constructor(address: string, cause: unknown) {
    super(`Failed to decode governance account ${address}: ${String(cause)}`);
    this.name = "AccountDecodeError";
  }
}

type AccountClass =
  | typeof Proposal
  | typeof Governance
  | typeof ProposalTransaction
  | typeof TokenOwnerRecord
  | typeof Realm;

function decode<T>(cls: AccountClass, raw: RawAccount): ProgramAccount<T> {
  const info: AccountInfo<Buffer> = {
    data: raw.data,
    owner: new PublicKey(raw.owner),
    lamports: raw.lamports,
    executable: false,
  };
  try {
    return GovernanceAccountParser(cls)(new PublicKey(raw.pubkey), info);
  } catch (error) {
    throw new AccountDecodeError(raw.pubkey, error);
  }
}

export const decodeProposal = (raw: RawAccount) =>
  decode<Proposal>(Proposal, raw);
export const decodeGovernance = (raw: RawAccount) =>
  decode<Governance>(Governance, raw);
export const decodeProposalTransaction = (raw: RawAccount) =>
  decode<ProposalTransaction>(ProposalTransaction, raw);
export const decodeTokenOwnerRecord = (raw: RawAccount) =>
  decode<TokenOwnerRecord>(TokenOwnerRecord, raw);
export const decodeRealm = (raw: RawAccount) => decode<Realm>(Realm, raw);

export function accountType(raw: RawAccount): number {
  return raw.data[0] ?? GovernanceAccountType.Uninitialized;
}

export const PROPOSAL_ACCOUNT_TYPES = [
  GovernanceAccountType.ProposalV1,
  GovernanceAccountType.ProposalV2,
];

export const GOVERNANCE_ACCOUNT_TYPES = [
  GovernanceAccountType.GovernanceV1,
  GovernanceAccountType.ProgramGovernanceV1,
  GovernanceAccountType.MintGovernanceV1,
  GovernanceAccountType.TokenGovernanceV1,
  GovernanceAccountType.GovernanceV2,
  GovernanceAccountType.ProgramGovernanceV2,
  GovernanceAccountType.MintGovernanceV2,
  GovernanceAccountType.TokenGovernanceV2,
];

export const PROPOSAL_TRANSACTION_ACCOUNT_TYPES = [
  GovernanceAccountType.ProposalInstructionV1,
  GovernanceAccountType.ProposalTransactionV2,
];

/** memcmp filter on the leading account-type byte. */
export function accountTypeFilter(type: GovernanceAccountType) {
  return { memcmp: { offset: 0, bytes: bs58.encode([type]) } };
}

/** memcmp filter for a pubkey at the given offset. */
export function pubkeyFilter(offset: number, pubkey: string) {
  return { memcmp: { offset, bytes: pubkey } };
}
