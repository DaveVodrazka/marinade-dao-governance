import { explorerAddressUrl, formatPublicKey } from "@/utils/public-key";
import { CopyButton } from "./copy-button";

/**
 * Public key with abbreviated display, copy button and Solana Explorer link.
 * The full address is always available (title, copy, link).
 */
export function Address({
  address,
  label,
  full = false,
  className = "",
}: {
  address: string;
  /** Optional readable name shown above the address. */
  label?: string;
  /** Show the full address (wrapping) instead of the abbreviation. */
  full?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-w-0 flex-col gap-0.5 ${className}`}>
      {label && <span className="text-sm font-medium text-fg">{label}</span>}
      <span className="inline-flex min-w-0 items-center gap-2">
        <a
          href={explorerAddressUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          title={address}
          className={`font-mono text-[13px] text-muted hover:text-accent ${full ? "break-all" : "truncate"}`}
        >
          {full ? address : formatPublicKey(address)}
        </a>
        <CopyButton value={address} label="Copy address" />
      </span>
    </span>
  );
}
