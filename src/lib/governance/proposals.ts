import "server-only";

import { cache } from "react";

import { devLog, devWarn } from "@/lib/log";
import { isValidPublicKey } from "@/utils/public-key";
import {
  fetchProposalAccounts,
  fetchProposalTransactions,
  fetchRealmProposals,
} from "./client";
import { normalizeProposalTransactions } from "./instructions";
import { normalizeProposal, sortProposals } from "./normalize";
import type { GovernanceInstruction, GovernanceProposal } from "./types";

/**
 * Public governance data API used by pages and services.
 */

/** All Marinade realm proposals, active first, then newest first. */
export async function getMarinadeProposals(): Promise<GovernanceProposal[]> {
  const { proposals, governances } = await fetchRealmProposals();
  const now = new Date();
  const normalized = proposals.map((p) =>
    normalizeProposal(p, {
      governance: governances.get(p.account.governance.toBase58()),
      now,
    }),
  );
  devLog(
    "governance",
    `loaded ${normalized.length} proposals across ${governances.size} governances`,
  );
  return sortProposals(normalized);
}

/**
 * One proposal with its instructions and creator. Returns null if the address
 * is invalid or is not a Marinade realm proposal.
 */
export const getMarinadeProposal = cache(async function getMarinadeProposal(
  proposalAddress: string,
): Promise<GovernanceProposal | null> {
  if (!isValidPublicKey(proposalAddress)) return null;

  const [accounts, instructions] = await Promise.all([
    fetchProposalAccounts(proposalAddress),
    loadInstructions(proposalAddress),
  ]);
  if (!accounts) return null;

  const proposal = normalizeProposal(accounts.proposal, {
    governance: accounts.governance,
  });
  proposal.creatorWallet =
    accounts.tokenOwnerRecord?.governingTokenOwner.toBase58();
  proposal.instructions = instructions;

  devLog("governance", `proposal ${proposal.address}`, {
    name: proposal.name,
    status: proposal.status,
    governance: proposal.governanceAddress,
    votes: {
      kind: proposal.votes.kind,
      yes: proposal.votes.yes.toString(),
      no: proposal.votes.no.toString(),
      options: proposal.votes.options.map((o) => [o.label, o.votes.toString()]),
    },
    transactions: instructions?.map((i) => ({
      tx: i.transactionAddress,
      program: i.programId,
      decoded: i.decoded?.type ?? null,
    })),
  });
  return proposal;
});

/**
 * Instructions failing to load must not break the proposal page; `undefined`
 * signals "could not load" (distinct from an empty array).
 */
async function loadInstructions(
  proposalAddress: string,
): Promise<GovernanceInstruction[] | undefined> {
  try {
    return normalizeProposalTransactions(
      await fetchProposalTransactions(proposalAddress),
    );
  } catch (error) {
    devWarn("governance", `failed to load transactions for ${proposalAddress}`, error);
    return undefined;
  }
}
