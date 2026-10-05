import { describe, expect, it } from "vitest";

import { formatDate, formatDuration, formatRelativeTime } from "./dates";
import { formatPercentage, formatTokenAmount } from "./format";
import { formatPublicKey, isValidPublicKey } from "./public-key";

describe("formatTokenAmount", () => {
  it("formats compact amounts", () => {
    expect(formatTokenAmount(12_483_920n)).toBe("12.48M");
    expect(formatTokenAmount(1_500n)).toBe("1.5K");
    expect(formatTokenAmount(3n)).toBe("3");
    expect(formatTokenAmount(0n)).toBe("0");
  });
  it("applies decimals using bigint (no precision loss)", () => {
    expect(formatTokenAmount(32_814_415_448_258_244n, 9)).toBe("32.81M");
    expect(formatTokenAmount(699_997_370_753_205_028n, 9)).toBe("700M");
    expect(formatTokenAmount(314_638_352_051n, 9)).toBe("314.64");
    expect(formatTokenAmount(123_456_789_012_345_678_901n, 0)).toBe("123,456,789.01T");
  });
  it("supports non-compact output", () => {
    expect(formatTokenAmount(1_234_567_000_000_000n, 9, { compact: false })).toBe("1,234,567");
  });
});

describe("formatPercentage", () => {
  it("formats ratios", () => {
    expect(formatPercentage(0.68492)).toBe("68.5%");
    expect(formatPercentage(1)).toBe("100%");
    expect(formatPercentage(0)).toBe("0%");
  });
  it("never rounds a non-unanimous vote to 100% / 0%", () => {
    expect(formatPercentage(0.99999)).toBe(">99.9%");
    expect(formatPercentage(0.00001)).toBe("<0.1%");
  });
});

describe("public keys", () => {
  it("abbreviates", () => {
    expect(formatPublicKey("899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo")).toBe("899YG3…L6Mo");
    expect(formatPublicKey("short")).toBe("short");
  });
  it("validates base58 32-byte keys, including PDAs", () => {
    expect(isValidPublicKey("Gd5CfxVQ1UYm4wToL5SVb9QhmCtcBTHo73QDnGMAmu6S")).toBe(true);
    expect(isValidPublicKey("notakey")).toBe(false);
    expect(isValidPublicKey("0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl")).toBe(false);
  });
});

describe("dates", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  it("formats UTC dates", () => {
    expect(formatDate(new Date("2026-10-07T18:00:00Z"))).toBe("Oct 7, 2026, 18:00 UTC");
    expect(formatDate(undefined)).toBe("–");
  });
  it("formats relative time", () => {
    expect(formatRelativeTime(new Date("2026-10-08T02:00:00Z"), now)).toBe("in 2d 14h");
    expect(formatRelativeTime(new Date("2026-10-02T12:00:00Z"), now)).toBe("3d ago");
    expect(formatRelativeTime(new Date("2026-06-01T12:00:00Z"), now)).toBe("4 months ago");
    expect(formatDuration(30_000)).toBe("<1m");
  });
});
