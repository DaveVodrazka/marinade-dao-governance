# Marinade Governance Architecture

How this UI reads Marinade governance state. Everything below was verified
against live mainnet in October 2026 and against
[marinade-finance/governance-ui](https://github.com/marinade-finance/governance-ui)
(the Realms fork Marinade uses).

## Realm

Address: `899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo` — "Marinade DAO", a `RealmV2`
account (type 16). Authority: governance `FsrqQfLGdFVtySSSsyZJUzVBA9bvGZSKyhp7nsJCqgJe`.

In governance-ui it is registered in `public/realms/mainnet-beta.json` (symbol
`MNDE`) and loaded like any other realm (`getRealm`), no Marinade-specific code
path.

## Governance program

Address: `GovMaiHfpVPw8BAM1mbdzgmSZYDw2tdP32J2fapoQoYs`

Marinade runs **its own deployment** of SPL Governance (program metadata
reports v3.1.1), not the shared Realms program `GovER5…PCVZw`. All accounts
below are owned by this program.

## Community mint

`MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey` (MNDE, 9 decimals).

Council mint: `6MGwpuJ5YE1c8jJaF8FKurQdDJeYRf1adX76dovkXxRs` (0 decimals,
supply 5). Of 277 proposals, 229 are council votes (operational changes,
upgrades, parameter changes) and 48 are community votes (MIPs).

## Voter weight plugin

The realm's `RealmConfig` account (`CFsN3hcLSK4sQyeEm9kYg7uNBsygR8xm445r8Kk7CvFK`)
sets the community voter-weight addin to the **Marinade Voter Stake Registry**
`VoteMBhDCqGLRgYpp9o7DGyq81KNmwjXQRAHStjtJsS` (listed in governance-ui's
`VSR_PLUGIN_PKS`). No max-voter-weight addin is configured.

Note: `@solana/spl-governance@0.3.28`'s `getRealmConfig` fails to decode this
account (`Expected buffer length 32 … voterWeightAddin`); the addin was read
manually from the raw bytes. We do not need RealmConfig for read-only views.

Voting power from the VSR is what ends up in proposal vote weights; we never
need to read VSR accounts to display results. Reading a user's VSR voter
record is a Task 2 (wallet + voting) concern.

## How proposals are discovered

SPL Governance proposals do not store their realm, only their governance:

```
Proposal: [accountType u8][governance Pubkey][governingTokenMint Pubkey]…
Governance: [accountType u8][realm Pubkey]…
```

governance-ui does `getGovernanceAccounts(Governance, realm filter)` and then
`getProposalsByGovernance` per governance (or `getAllProposals`). With 17
governances that is ~25 `getProgramAccounts` calls, which the public RPC
rate-limits (we hit HTTP 429 doing it).

We instead use **two RPC calls** (`src/lib/governance/client.ts`):

1. `getProgramAccounts(program, memcmp offset 0 = ProposalV2 (14))` (plus
   ProposalV1 (5), currently empty) → every proposal of the program.
2. `getMultipleAccounts(unique governance addresses)` → keep proposals whose
   governance's `realm` is the Marinade realm.

Accounts are decoded with the SDK's `GovernanceAccountParser` (Borsh schemas),
then normalized in `src/lib/governance/normalize.ts`.

RPC is called through plain `fetch` (`src/lib/solana/connection.ts`) so Next's
data cache applies (`next.revalidate`): list 60s, detail 30s. `SOLANA_RPC_URL`
selects the endpoint.

A single proposal (`/governance/proposals/[address]`) is loaded with
`getMultipleAccounts([proposal])` then `getMultipleAccounts([governance,
tokenOwnerRecord])`. The proposal is rejected (404) unless its governance
belongs to the Marinade realm.

## How proposal state is interpreted

`ProposalState` → domain status (`normalizeStatus`): draft, signing_off,
voting, succeeded, executing, completed, cancelled, defeated,
executing_with_errors, **vetoed** (council veto, observed on mainnet).

Voting window (v3): proposals have no `maxVotingTime`; it comes from the
governance config:

- yes/no voting until `votingAt + baseVotingTime` (Marinade: 3 days)
- then `votingCoolOffTime` (0 or 1 day depending on governance) where only
  deny / veto votes are accepted
- after that the proposal stays `Voting` on-chain until someone calls
  `FinalizeVote` → shown as "Finalizing".

"Active" means state `Voting` and the cool-off has not ended.

## Governance rules (October 2026)

Read from the Governance accounts' configs and the VSR registrar
(`5zgEgPbWKsAAnLPjSM56ZsbLPfVM6nUzh3u45tCnm97D`). Mirrored in
`MARINADE_GOVERNANCE_RULES` (`src/config/marinade.ts`) for the About page.

| Rule | Value |
| --- | --- |
| Base voting time | 3 days (all governances) |
| Cool-off | 1 day on community-vote governances (`8z6A4q`, `2w6ny7`, `6egAu2`, `23xVZX`, `2UB1cm`), 0 elsewhere |
| Community approval | Yes ≥ 2% of max vote weight (= 100% of MNDE supply), tipping disabled |
| Community proposal creation | 200,000 voting power (main MIP governance `8z6A4q`; 1,000,000 on some) |
| Council approval | 50% of 5 council tokens (3 of 5), early tipping |
| Council veto of community proposals | 50% (3 of 5) on community governances |
| Community veto | Disabled |
| Instruction hold-up time | 0 |
| VSR voting power | baseline factor 0 (unlocked MNDE = 0 votes); +1× at lockup saturation of 31 days remaining (linear below) |

The VSR values assume Marinade's VSR fork keeps the standard Mango VSR
`VotingMintConfig` layout. The decoded values (MNDE mint, 1e9 scale, 31 days)
are consistent with that assumption.

## How votes are represented

- Single-option proposals (`Approve`): For = `options[0].voteWeight`,
  Against = `denyVoteWeight`. This is the normal Marinade shape.
- Some community proposals (e.g. MIP-22) are "multiple choice" with options
  `Yes` / `No` and no deny weight; we detect this and map Yes/No.
- Anything else is shown per option.
- `vetoVoteWeight` is council weight against community proposals.
- Weights are `u64` in governing-mint base units → kept as `bigint`, formatted
  with mint decimals (MNDE 9, council 0), same as Realms.
- Percentages are For / (For + Against) only. We do not show quorum
  percentages: `maxVoteWeight` is only snapshotted at finalization and the
  threshold semantics depend on governance config + VSR.

## How proposal instructions are retrieved

`ProposalTransactionV2` accounts (type 13; V1 `ProposalInstructionV1` type 8
also queried) with `[accountType][proposal Pubkey]…` layout:

`getProgramAccounts(program, type filter + memcmp offset 1 = proposal)`

Each holds `optionIndex`, `instructionIndex`, `holdUpTime`,
`executionStatus`, `executedAt` and one or more instructions (program id,
account metas, data). `src/lib/governance/instructions.ts` flattens them in
option/transaction order.

Decoding (best effort, never guessed):

- SPL Token (Transfer, TransferChecked, MintTo, Burn, SetAuthority, …)
- System Transfer, BPF Upgradeable Loader (Upgrade, SetAuthority, …)
- SPL Governance instructions (enum index) for both governance programs
- Anchor programs (Marinade Liquid Staking, Validator Bonds, VSR, Directed
  Stake): the 8-byte discriminator `sha256("global:<name>")[..8]` is matched
  against known instruction names; Anchor IDL management instructions are
  recognized by their fixed tag. A missing name simply doesn't decode.

Everything else shows "Unknown instruction" with the raw program id.

Known program names live in `src/config/marinade.ts` (`KNOWN_PROGRAMS`),
sourced from Marinade's developer docs "contract addresses" page and the
validator-bonds repository. Program IDs actually used by Marinade proposals
(all 333 transactions, Oct 2026): SPL Token, Marinade VSR, Marinade
Governance, Marinade Liquid Staking, BPF Loader, SPL Governance (Realms),
Validator Bonds, Escrow Relocker, Directed Stake, Liquidity Gauges, plus a few
external programs (Kamino vault, Mango, …) which render unlabelled.

## Debugging

- `next dev` logs every RPC call, proposal state, vote weights, governance and
  transaction program ids (`src/lib/log.ts`); set `GOVERNANCE_DEBUG=1` to
  enable in production.
- `/debug/governance` (dev only) dumps realm, governances, proposals and, with
  `?proposal=<address>`, the normalized proposal with instructions.

## Relevant source repositories

- https://github.com/marinade-finance/governance-ui — Realms fork used by Marinade
  (`hooks/queries/proposal.ts`, `hooks/queries/proposalTransaction.ts`,
  `constants/plugins.ts`, `components/instructions/programs/names.ts`)
- https://github.com/solana-labs/solana-program-library/tree/master/governance — SPL Governance program
- https://www.npmjs.com/package/@solana/spl-governance — SDK (v0.3.28, same as governance-ui)
- https://github.com/marinade-finance/validator-bonds — Validator Bonds program
- https://github.com/marinade-finance/liquid-staking-program — Liquid staking program
