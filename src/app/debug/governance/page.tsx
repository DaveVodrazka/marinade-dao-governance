import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MARINADE_GOVERNANCE_PROGRAM_ID, MARINADE_REALM } from "@/config/marinade";
import { fetchRealm, fetchRealmProposals } from "@/lib/governance/client";
import { getMarinadeProposal } from "@/lib/governance/proposals";
import { getRpcHost } from "@/lib/solana/connection";

/**
 * Development-only raw governance inspector. Unstyled on purpose.
 * /debug/governance?proposal=<address> to inspect one proposal's transactions.
 */

function json(value: unknown) {
  return JSON.stringify(
    value,
    (_, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v && typeof v === "object" && typeof v.toBase58 === "function") return v.toBase58();
      if (v && typeof v === "object" && v.constructor?.name === "BN") return v.toString();
      return v;
    },
    2,
  );
}

export default async function DebugGovernance({ searchParams }: PageProps<"/debug/governance">) {
  if (process.env.NODE_ENV !== "development") notFound();
  await connection();
  const { proposal: proposalParam } = await searchParams;

  const [realm, { proposals, governances }] = await Promise.all([fetchRealm(), fetchRealmProposals()]);
  const selected = typeof proposalParam === "string" ? await getMarinadeProposal(proposalParam) : null;

  return (
    <div className="space-y-6 font-mono text-xs">
      <h1 className="text-base font-bold">Governance debug</h1>
      <p>
        RPC host: {getRpcHost()} · program {MARINADE_GOVERNANCE_PROGRAM_ID} · realm {MARINADE_REALM}
      </p>
      <h2 className="font-bold">Realm</h2>
      <pre className="overflow-auto">{json(realm?.account)}</pre>
      <h2 className="font-bold">Governances ({governances.size})</h2>
      <pre className="overflow-auto">
        {json([...governances.entries()].map(([address, g]) => ({ address, type: g.accountType, config: g.config })))}
      </pre>
      {selected && (
        <>
          <h2 className="font-bold">Selected proposal (normalized)</h2>
          <pre className="overflow-auto">{json(selected)}</pre>
        </>
      )}
      <h2 className="font-bold">Proposals ({proposals.length})</h2>
      <table>
        <tbody>
          {proposals.map((p) => (
            <tr key={p.pubkey.toBase58()}>
              <td className="pr-3">
                <a className="underline" href={`?proposal=${p.pubkey.toBase58()}`}>
                  {p.pubkey.toBase58()}
                </a>
              </td>
              <td className="pr-3">state={p.account.state}</td>
              <td className="pr-3">gov={p.account.governance.toBase58().slice(0, 6)}</td>
              <td>{p.account.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
