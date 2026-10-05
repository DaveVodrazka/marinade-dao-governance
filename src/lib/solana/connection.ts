import "server-only";

import { DEFAULT_SOLANA_RPC_URL } from "@/config/marinade";
import { devLog } from "@/lib/log";

/**
 * Minimal Solana JSON-RPC client built on `fetch`.
 *
 * We deliberately use `fetch` rather than web3.js `Connection` so that
 * Next.js' data cache (`next.revalidate`) applies to RPC reads. Works with any
 * standard RPC provider (Helius, Triton, QuickNode, …) via SOLANA_RPC_URL.
 */

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

export function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL?.trim() || DEFAULT_SOLANA_RPC_URL;
}

/** Hostname only — never log full URLs, which may carry API keys. */
export function getRpcHost(): string {
  try {
    return new URL(getRpcUrl()).host;
  } catch {
    return "invalid-url";
  }
}

interface RpcOptions {
  revalidate: number;
  tags?: string[];
}

let requestId = 0;

export async function rpcRequest<T>(
  method: string,
  params: unknown[],
  { revalidate, tags }: RpcOptions,
): Promise<T> {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(getRpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
      next: { revalidate, tags },
    });
  } catch (error) {
    throw new RpcError(
      `Solana RPC unreachable (${getRpcHost()}): ${(error as Error).message}`,
    );
  }

  if (!res.ok) {
    throw new RpcError(
      `Solana RPC ${method} failed with HTTP ${res.status}`,
      res.status,
    );
  }

  let body: { result?: T; error?: { code: number; message: string } };
  try {
    body = await res.json();
  } catch {
    throw new RpcError(`Solana RPC ${method} returned malformed JSON`);
  }
  if (body.error) {
    throw new RpcError(
      `Solana RPC ${method}: ${body.error.message}`,
      body.error.code,
    );
  }
  if (!("result" in body)) {
    throw new RpcError(`Solana RPC ${method} response has no result`);
  }

  devLog("rpc", `${method} ${Date.now() - started}ms`);
  return body.result as T;
}

export interface RawAccount {
  pubkey: string;
  owner: string;
  lamports: number;
  data: Buffer;
}

interface RpcAccountInfo {
  data: [string, "base64"];
  owner: string;
  lamports: number;
  executable: boolean;
}

function toRawAccount(pubkey: string, info: RpcAccountInfo): RawAccount {
  if (!Array.isArray(info?.data) || info.data[1] !== "base64") {
    throw new RpcError(`Malformed account data for ${pubkey}`);
  }
  return {
    pubkey,
    owner: info.owner,
    lamports: info.lamports,
    data: Buffer.from(info.data[0], "base64"),
  };
}

/** Fetch up to 100 accounts in one call. Missing accounts are `null`. */
export async function getMultipleAccounts(
  pubkeys: string[],
  options: RpcOptions,
): Promise<(RawAccount | null)[]> {
  if (pubkeys.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < pubkeys.length; i += 100) {
    chunks.push(pubkeys.slice(i, i + 100));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      rpcRequest<{ value: (RpcAccountInfo | null)[] }>(
        "getMultipleAccounts",
        [chunk, { encoding: "base64", commitment: "confirmed" }],
        options,
      ).then((r) =>
        r.value.map((info, i) => (info ? toRawAccount(chunk[i], info) : null)),
      ),
    ),
  );
  return results.flat();
}

export type MemcmpFilter = { memcmp: { offset: number; bytes: string } };
export type DataSizeFilter = { dataSize: number };

export async function getProgramAccounts(
  programId: string,
  filters: (MemcmpFilter | DataSizeFilter)[],
  options: RpcOptions,
): Promise<RawAccount[]> {
  const result = await rpcRequest<
    { pubkey: string; account: RpcAccountInfo }[]
  >(
    "getProgramAccounts",
    [programId, { encoding: "base64", commitment: "confirmed", filters }],
    options,
  );
  if (!Array.isArray(result)) {
    throw new RpcError("getProgramAccounts returned a non-array result");
  }
  return result.map((r) => toRawAccount(r.pubkey, r.account));
}
