import { ProposalState } from "@solana/spl-governance";
import { describe, expect, it } from "vitest";

import { BN, COUNCIL_MINT, makeGovernance, makeProposal } from "@/test/fixtures";
import {
  calculateVoteShare,
  classifyDescription,
  computeStats,
  extractForumTopicId,
  normalizeProposal,
  normalizeStatus,
  parseMipIdentifier,
} from "./normalize";
import { getDisplayTitle, getLifecycle, getStatusDisplay } from "./presentation";

const T0 = 1_789_000_000 * 1000;

describe("normalizeStatus", () => {
  it("maps every on-chain state", () => {
    expect(normalizeStatus(ProposalState.Draft)).toBe("draft");
    expect(normalizeStatus(ProposalState.SigningOff)).toBe("signing_off");
    expect(normalizeStatus(ProposalState.Voting)).toBe("voting");
    expect(normalizeStatus(ProposalState.Succeeded)).toBe("succeeded");
    expect(normalizeStatus(ProposalState.Executing)).toBe("executing");
    expect(normalizeStatus(ProposalState.Completed)).toBe("completed");
    expect(normalizeStatus(ProposalState.Cancelled)).toBe("cancelled");
    expect(normalizeStatus(ProposalState.Defeated)).toBe("defeated");
    expect(normalizeStatus(ProposalState.ExecutingWithErrors)).toBe("executing_with_errors");
    expect(normalizeStatus(ProposalState.Vetoed)).toBe("vetoed");
  });
  it("returns unknown for unrecognized values", () => {
    expect(normalizeStatus(42)).toBe("unknown");
  });
});

describe("calculateVoteShare", () => {
  it("computes For/Against shares", () => {
    const share = calculateVoteShare(68n, 32n)!;
    expect(share.yes).toBeCloseTo(0.68);
    expect(share.no).toBeCloseTo(0.32);
  });
  it("returns null for zero votes", () => {
    expect(calculateVoteShare(0n, 0n)).toBeNull();
  });
  it("keeps precision beyond Number.MAX_SAFE_INTEGER", () => {
    const share = calculateVoteShare(32_814_415_448_258_244n, 314_638_352_051n)!;
    expect(share.yes + share.no).toBeCloseTo(1);
    expect(share.yes).toBeGreaterThan(0.9999);
  });
});

describe("normalizeProposal", () => {
  it("computes voting end from governance config (base + cool-off)", () => {
    const p = normalizeProposal(makeProposal(), { governance: makeGovernance(), now: new Date(T0 + 1000) });
    expect(p.votingBaseEndsAt?.getTime()).toBe(T0 + 259_200_000);
    expect(p.votingEndsAt?.getTime()).toBe(T0 + 345_600_000);
    expect(p.isActive).toBe(true);
    expect(p.inCoolOff).toBe(false);
    expect(p.mip).toBe("MIP-23");
    expect(p.governingBody).toBe("community");
  });

  it("detects cool-off and awaiting finalization", () => {
    const cool = normalizeProposal(makeProposal(), { governance: makeGovernance(), now: new Date(T0 + 300_000_000) });
    expect(cool.inCoolOff).toBe(true);
    expect(getStatusDisplay(cool).label).toBe("Cool-off");

    const late = normalizeProposal(makeProposal(), { governance: makeGovernance(), now: new Date(T0 + 400_000_000) });
    expect(late.isActive).toBe(false);
    expect(late.awaitingFinalization).toBe(true);
    expect(getStatusDisplay(late).label).toBe("Finalizing");
  });

  it("handles a zero-vote proposal", () => {
    const p = normalizeProposal(makeProposal(), { governance: makeGovernance() });
    expect(p.votes.kind).toBe("yes_no");
    expect(p.votes.yes).toBe(0n);
    expect(p.votes.no).toBe(0n);
    expect(calculateVoteShare(p.votes.yes, p.votes.no)).toBeNull();
  });

  it("uses option + deny weight for yes/no votes, as bigint", () => {
    const p = normalizeProposal(
      makeProposal({
        options: [{ label: "Approve", voteWeight: new BN("32814415448258244"), voteResult: 1, instructionsExecutedCount: 0, instructionsCount: 0, instructionsNextIndex: 0 }] as never,
        denyVoteWeight: new BN("314638352051"),
      }),
    );
    expect(p.votes.yes).toBe(32_814_415_448_258_244n);
    expect(p.votes.no).toBe(314_638_352_051n);
    expect(p.votes.decimals).toBe(9);
  });

  it("recognizes Yes/No option proposals without deny", () => {
    const p = normalizeProposal(
      makeProposal({
        options: [
          { label: "Yes", voteWeight: new BN(10), voteResult: 1, instructionsExecutedCount: 0, instructionsCount: 0, instructionsNextIndex: 0 },
          { label: "No", voteWeight: new BN(5), voteResult: 2, instructionsExecutedCount: 0, instructionsCount: 0, instructionsNextIndex: 0 },
        ] as never,
        denyVoteWeight: undefined,
      }),
    );
    expect(p.votes.kind).toBe("binary_options");
    expect([p.votes.yes, p.votes.no]).toEqual([10n, 5n]);
  });

  it("uses council decimals for council proposals", () => {
    const p = normalizeProposal(makeProposal({ governingTokenMint: COUNCIL_MINT }));
    expect(p.governingBody).toBe("council");
    expect(p.votes.decimals).toBe(0);
  });

  it("extracts forum topic from on-chain description", () => {
    const p = normalizeProposal(
      makeProposal({ descriptionLink: "https://forum.marinade.finance/t/mip-13-introduction-of-active-staking-rewards-program/1895" }),
    );
    expect(p.descriptionForumTopicId).toBe(1895);
    expect(p.description.kind).toBe("link");
  });
});

describe("lifecycle", () => {
  it("does not imply execution when a vote succeeded", () => {
    const p = normalizeProposal(
      makeProposal({
        state: ProposalState.Succeeded,
        options: [{ label: "Approve", voteWeight: new BN(3), voteResult: 1, instructionsExecutedCount: 0, instructionsCount: 2, instructionsNextIndex: 2 }] as never,
        votingCompletedAt: new BN(1_789_300_000),
      }),
    );
    const steps = getLifecycle(p);
    expect(steps.map((s) => s.key)).toEqual(["created", "voting", "succeeded", "executed"]);
    expect(steps.at(-1)?.state).toBe("upcoming");
  });
  it("ends at Defeated / Vetoed / Cancelled", () => {
    for (const [state, key] of [
      [ProposalState.Defeated, "defeated"],
      [ProposalState.Vetoed, "vetoed"],
      [ProposalState.Cancelled, "cancelled"],
    ] as const) {
      const steps = getLifecycle(normalizeProposal(makeProposal({ state })));
      expect(steps.at(-1)?.key).toBe(key);
      expect(steps.at(-1)?.state).toBe("failed");
    }
  });
});

describe("helpers", () => {
  it("parses MIP identifiers in various formats", () => {
    expect(parseMipIdentifier("MIP-23: Foo")).toBe("MIP-23");
    expect(parseMipIdentifier("MIP.8.1: Sunset")).toBe("MIP-8.1");
    expect(parseMipIdentifier("MIP15: Activate")).toBe("MIP-15");
    expect(parseMipIdentifier("MIP 3: Enhancing")).toBe("MIP-3");
    expect(parseMipIdentifier("VSR config update")).toBeUndefined();
  });
  it("strips the MIP prefix for display", () => {
    expect(getDisplayTitle({ name: "MIP-21 (bis) - Exchange mSOL", mip: "MIP-21" })).toBe("Exchange mSOL");
    expect(getDisplayTitle({ name: "MIP.10 - Simplification", mip: "MIP-10" })).toBe("Simplification");
  });
  it("ignores slug-only forum URLs", () => {
    expect(extractForumTopicId("https://forum.marinade.finance/t/mip-7-marinade-earn-season-4/")).toBeUndefined();
    expect(extractForumTopicId("see https://forum.marinade.finance/t/foo/1713/1")).toBe(1713);
    expect(extractForumTopicId("https://evil.example/t/foo/1713")).toBeUndefined();
  });
  it("sanitizes on-chain HTML descriptions", () => {
    const d = classifyDescription('<p onclick="x()">Hi<script>alert(1)</script></p>');
    expect(d).toEqual({ kind: "html", html: "<p>Hi</p>" });
  });
  it("computes stats", () => {
    const stats = computeStats([
      normalizeProposal(makeProposal({ state: ProposalState.Completed })),
      normalizeProposal(makeProposal({ state: ProposalState.Vetoed })),
    ]);
    expect(stats).toMatchObject({ total: 2, completed: 1, passed: 1, defeated: 1, active: 0 });
  });
});
