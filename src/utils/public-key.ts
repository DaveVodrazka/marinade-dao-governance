import bs58 from "bs58";

import { SOLANA_EXPLORER_URL } from "@/config/marinade";

/**
 * True for any base58 string decoding to 32 bytes. Proposal addresses are
 * PDAs (off-curve), so on-curve checks must not be applied.
 */
export function isValidPublicKey(value: string): boolean {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) {
    return false;
  }
  try {
    return bs58.decode(value).length === 32;
  } catch {
    return false;
  }
}

/** "899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo" → "899YG3…L6Mo" */
export function formatPublicKey(
  address: string,
  { head = 6, tail = 4 }: { head?: number; tail?: number } = {},
): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function explorerAddressUrl(address: string): string {
  return `${SOLANA_EXPLORER_URL}/address/${address}`;
}
