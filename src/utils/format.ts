/**
 * Formatting at the UI boundary. Token amounts stay bigint until here.
 */

export { formatPublicKey } from "./public-key";

const COMPACT_UNITS: { suffix: string; exponent: bigint }[] = [
  { suffix: "T", exponent: 12n },
  { suffix: "B", exponent: 9n },
  { suffix: "M", exponent: 6n },
  { suffix: "K", exponent: 3n },
];

function divRound(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function groupThousands(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function withFraction(hundredths: bigint, fractionDigits: number): string {
  const whole = hundredths / 100n;
  const fraction = (hundredths % 100n).toString().padStart(2, "0");
  const trimmed =
    fractionDigits === 0 ? "" : fraction.slice(0, fractionDigits).replace(/0+$/, "");
  return trimmed ? `${groupThousands(whole)}.${trimmed}` : groupThousands(whole);
}

/**
 * Format a base-unit token amount.
 *
 *   formatTokenAmount(12483920n)            → "12.48M"
 *   formatTokenAmount(32814415448258244n, 9) → "32.81M"
 *   formatTokenAmount(3n)                   → "3"
 *   formatTokenAmount(1500n, 0, { compact: false }) → "1,500"
 */
export function formatTokenAmount(
  amount: bigint,
  decimals = 0,
  { compact = true }: { compact?: boolean } = {},
): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const scale = 10n ** BigInt(decimals);
  const sign = negative ? "-" : "";

  if (compact) {
    const wholeUnits = abs / scale;
    for (const unit of COMPACT_UNITS) {
      const divisor = 10n ** unit.exponent;
      if (wholeUnits >= divisor) {
        const hundredths = divRound(abs * 100n, scale * divisor);
        // Rounding may carry into the next unit (999.995K → 1000K); acceptable.
        return `${sign}${withFraction(hundredths, 2)}${unit.suffix}`;
      }
    }
  }
  const hundredths = divRound(abs * 100n, scale);
  return `${sign}${withFraction(hundredths, 2)}`;
}

/** 0.68492 → "68.5%". Expects a ratio in [0, 1]. */
export function formatPercentage(ratio: number, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return "–";
  const pct = ratio * 100;
  // Avoid showing 100.0% / 0.0% for values that are not exactly 1 / 0.
  if (ratio > 0 && pct < 10 ** -fractionDigits) return `<${10 ** -fractionDigits}%`;
  if (ratio < 1 && pct > 100 - 10 ** -fractionDigits) {
    return `>${(100 - 10 ** -fractionDigits).toFixed(fractionDigits)}%`;
  }
  return `${pct.toFixed(fractionDigits).replace(/\.0+$/, "")}%`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return `${formatCount(n)} ${n === 1 ? singular : plural}`;
}
