# Marinade DAO Governance UI (MVP)

> Built for Marinade DAO governance as part of
> [Solana Buildstation Prague](https://buildstation.cz/).

Read-only governance interface for Marinade DAO: forum discussion, live
on-chain vote state and the exact instructions each proposal executes, in one
place.

- On-chain data is read directly from Solana mainnet (Marinade's SPL Governance
  program) — Realms is not scraped.
- Discussions come from the Marinade Discourse forum JSON API.
- No wallet, voting, database or auth in this version.

## Run

```bash
cp .env.example .env.local   # set SOLANA_RPC_URL (public RPC works for dev)
pnpm install
pnpm dev                     # http://localhost:3000
pnpm test                    # unit tests (vitest)
pnpm build && pnpm start
```

## Routes

| Route | |
| --- | --- |
| `/` | About: how Marinade DAO governance works (static, beginner friendly) |
| `/recent` | Recent: active count, latest proposals |
| `/governance` | Dashboard: stats, active proposals, filterable history |
| `/governance/proposals/[address]` | Proposal: forum post, vote, lifecycle, on-chain actions, discussion |
| `/api/forum/topics/[id]` | Normalized + sanitized forum topic JSON |
| `/debug/governance` | Raw account inspector (development only) |

## Layout

```
src/config/marinade.ts       addresses, mints, known programs, cache times
src/lib/solana/connection.ts JSON-RPC over fetch (Next data cache)
src/lib/governance/          client (RPC) → accounts (decode) → normalize → proposals (API)
                             instructions (decode), presentation (labels, lifecycle)
src/lib/forum/               client (Discourse) → normalize → sanitize
src/lib/proposals/           mapping (proposal → topic), service (combined model)
src/components/              governance/, forum/, ui/
src/utils/                   format, dates, public-key
docs/                        GOVERNANCE.md, FORUM.md
```

Components consume only domain types (`GovernanceProposal`, `ForumTopic`,
`MarinadeProposal`), never raw SDK accounts or Discourse JSON.
