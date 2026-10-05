import "server-only";

import type {
  Governance,
  Proposal,
  ProposalTransaction,
  ProgramAccount,
  Realm,
  TokenOwnerRecord,
} from "@solana/spl-governance";

import {
  MARINADE_GOVERNANCE_PROGRAM_ID,
  MARINADE_REALM,
  REVALIDATE,
} from "@/config/marinade";
import { devWarn } from "@/lib/log";
import {
  getMultipleAccounts,
  getProgramAccounts,
  type RawAccount,
} from "@/lib/solana/connection";
import {
  accountType,
  accountTypeFilter,
  decodeGovernance,
  decodeProposal,
  decodeProposalTransaction,
  decodeRealm,
  decodeTokenOwnerRecord,
  GOVERNANCE_ACCOUNT_TYPES,
  PROPOSAL_ACCOUNT_TYPES,
  PROPOSAL_TRANSACTION_ACCOUNT_TYPES,
  pubkeyFilter,
} from "./accounts";

/**
 * Raw on-chain reads. Returns decoded SDK accounts; normalization happens in
 * proposals.ts. Uses as few RPC calls as possible because public RPC endpoints
 * rate-limit getProgramAccounts aggressively.
 */

const PROGRAM = MARINADE_GOVERNANCE_PROGRAM_ID;

function decodeSafely<T>(
  raws: RawAccount[],
  decoder: (raw: RawAccount) => ProgramAccount<T>,
): ProgramAccount<T>[] {
  const out: ProgramAccount<T>[] = [];
  for (const raw of raws) {
    try {
      out.push(decoder(raw));
    } catch (error) {
      devWarn("governance", `skipping undecodable account ${raw.pubkey}`, error);
    }
  }
  return out;
}

/**
 * All proposal accounts owned by the governance program.
 *
 * Proposal layout: [accountType u8][governance 32][governingTokenMint 32]…
 * Proposals do not store the realm directly, so callers filter by governance
 * (see fetchRealmProposals). The ProposalV1 query returns nothing for Marinade
 * today but is kept for correctness.
 */
async function fetchAllProgramProposals(): Promise<ProgramAccount<Proposal>[]> {
  const results = await Promise.all(
    PROPOSAL_ACCOUNT_TYPES.map((type) =>
      getProgramAccounts(PROGRAM, [accountTypeFilter(type)], {
        revalidate: REVALIDATE.proposalList,
        tags: ["proposals"],
      }),
    ),
  );
  return decodeSafely(results.flat(), decodeProposal);
}

/** Load governance accounts by address and keep only Marinade realm ones. */
export async function fetchGovernances(
  addresses: string[],
  revalidate: number = REVALIDATE.proposalList,
): Promise<Map<string, Governance>> {
  const unique = [...new Set(addresses)];
  const raws = await getMultipleAccounts(unique, {
    revalidate,
    tags: ["governances"],
  });
  const map = new Map<string, Governance>();
  for (const raw of raws) {
    if (!raw || raw.owner !== PROGRAM) continue;
    if (!GOVERNANCE_ACCOUNT_TYPES.includes(accountType(raw))) continue;
    try {
      const gov = decodeGovernance(raw);
      if (gov.account.realm.toBase58() === MARINADE_REALM) {
        map.set(raw.pubkey, gov.account);
      }
    } catch (error) {
      devWarn("governance", `undecodable governance ${raw.pubkey}`, error);
    }
  }
  return map;
}

export interface RealmProposalsResult {
  proposals: ProgramAccount<Proposal>[];
  governances: Map<string, Governance>;
}

/**
 * Proposals belonging to the Marinade realm. Two RPC round-trips:
 * getProgramAccounts(proposals) + getMultipleAccounts(governances).
 */
export async function fetchRealmProposals(): Promise<RealmProposalsResult> {
  const all = await fetchAllProgramProposals();
  const governances = await fetchGovernances(
    all.map((p) => p.account.governance.toBase58()),
  );
  const proposals = all.filter((p) =>
    governances.has(p.account.governance.toBase58()),
  );
  return { proposals, governances };
}

export interface ProposalAccountsResult {
  proposal: ProgramAccount<Proposal>;
  governance?: Governance;
  tokenOwnerRecord?: TokenOwnerRecord;
}

/** Load one proposal plus its governance and token owner record. */
export async function fetchProposalAccounts(
  address: string,
): Promise<ProposalAccountsResult | null> {
  const opts = { revalidate: REVALIDATE.proposalDetail, tags: ["proposal"] };
  const [raw] = await getMultipleAccounts([address], opts);
  if (!raw || raw.owner !== PROGRAM) return null;
  if (!PROPOSAL_ACCOUNT_TYPES.includes(accountType(raw))) return null;

  const proposal = decodeProposal(raw);
  const governanceAddress = proposal.account.governance.toBase58();
  const torAddress = proposal.account.tokenOwnerRecord.toBase58();
  const [govRaw, torRaw] = await getMultipleAccounts(
    [governanceAddress, torAddress],
    opts,
  );

  let governance: Governance | undefined;
  if (govRaw && govRaw.owner === PROGRAM) {
    governance = decodeGovernance(govRaw).account;
  }
  // Not a Marinade proposal (same program could host other realms).
  if (!governance || governance.realm.toBase58() !== MARINADE_REALM) {
    return null;
  }

  let tokenOwnerRecord: TokenOwnerRecord | undefined;
  if (torRaw && torRaw.owner === PROGRAM) {
    try {
      tokenOwnerRecord = decodeTokenOwnerRecord(torRaw).account;
    } catch (error) {
      devWarn("governance", `undecodable token owner record ${torAddress}`, error);
    }
  }

  return { proposal, governance, tokenOwnerRecord };
}

/**
 * ProposalTransaction layout: [accountType u8][proposal 32]…
 * One getProgramAccounts per account type, filtered by proposal.
 */
export async function fetchProposalTransactions(
  proposalAddress: string,
): Promise<ProgramAccount<ProposalTransaction>[]> {
  const results = await Promise.all(
    PROPOSAL_TRANSACTION_ACCOUNT_TYPES.map((type) =>
      getProgramAccounts(
        PROGRAM,
        [accountTypeFilter(type), pubkeyFilter(1, proposalAddress)],
        { revalidate: REVALIDATE.proposalDetail, tags: ["proposal"] },
      ),
    ),
  );
  return decodeSafely(results.flat(), decodeProposalTransaction);
}

export async function fetchRealm(): Promise<ProgramAccount<Realm> | null> {
  const [raw] = await getMultipleAccounts([MARINADE_REALM], {
    revalidate: 3600,
  });
  return raw ? decodeRealm(raw) : null;
}
