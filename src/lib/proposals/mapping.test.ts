import { describe, expect, it } from "vitest";

import { PROPOSAL_FORUM_MAPPING, resolveForumLink } from "./mapping";

describe("resolveForumLink", () => {
  it("prefers the explicit mapping", () => {
    expect(resolveForumLink({ address: "Gd5CfxVQ1UYm4wToL5SVb9QhmCtcBTHo73QDnGMAmu6S", descriptionForumTopicId: 5 })).toEqual({
      topicId: 1998,
      source: "mapping",
    });
  });
  it("falls back to the topic id in the on-chain description", () => {
    expect(resolveForumLink({ address: "unmapped", descriptionForumTopicId: 1895 })).toEqual({ topicId: 1895, source: "description" });
  });
  it("returns undefined when nothing links the proposal", () => {
    // The vetoed "MIP-23: VSR program…" proposal must not be linked to the real MIP-23 topic.
    expect(resolveForumLink({ address: "7pYWFt7aigkEU86nbxKM182t6xgVBz9ZaJ1gFzaYN1Zj" })).toBeUndefined();
  });
  it("contains only positive integer topic ids", () => {
    for (const id of Object.values(PROPOSAL_FORUM_MAPPING)) expect(Number.isSafeInteger(id) && id > 0).toBe(true);
  });
});
