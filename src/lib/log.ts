/**
 * Development diagnostics. Enabled in `next dev` or when GOVERNANCE_DEBUG=1.
 * Silent in production builds.
 */
const enabled =
  process.env.NODE_ENV === "development" ||
  process.env.GOVERNANCE_DEBUG === "1";

export function devLog(scope: string, message: string, data?: unknown) {
  if (!enabled) return;
  if (data === undefined) {
    console.log(`[${scope}] ${message}`);
  } else {
    console.log(`[${scope}] ${message}`, data);
  }
}

export function devWarn(scope: string, message: string, error?: unknown) {
  if (!enabled) return;
  console.warn(`[${scope}] ${message}`, error ?? "");
}
