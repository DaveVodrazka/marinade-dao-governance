# Marinade DAO Governance UI — MVP

## Goal

Build a new read-only governance interface for Marinade DAO.

The first version should focus exclusively on retrieving, normalizing, and presenting existing governance data from:

1. Marinade's on-chain Solana governance
2. Marinade's Discourse forum

Do **not** implement voting, wallet signing, MNDE locking, proposal creation, or any other write transaction in this version.

The primary goal is to prove that we can present Marinade governance much more clearly than a generic governance UI while relying on the same underlying data.

The resulting application should make it easy for a user to answer:

- What proposals currently exist?
- Which proposals are active?
- What is each proposal about?
- What is its current voting state?
- How many votes are For / Against?
- When does voting end?
- What on-chain instructions would the proposal execute?
- Is there a related Marinade forum discussion?
- What did the original forum proposal say?
- Who created the proposal?
- What stage of the governance lifecycle is it currently in?

---

# Tech stack

Use:

- Next.js 16+
- App Router
- TypeScript
- React
- Tailwind CSS 4.3
- pnpm
- Solana web3 libraries
- SPL Governance / Realms libraries where appropriate

Prefer React Server Components where possible.

Use client components only where browser-side behavior is required.

Do not introduce a database in the initial version.

Do not introduce authentication.

Do not introduce wallet connection yet.

---

# Important principle

Realms is not the source of truth.

The source of truth is the Solana blockchain and the SPL Governance accounts used by Marinade.

The application should read the same governance state that Realms reads.

Do not scrape the Realms website.

Use official Solana RPC calls and appropriate SPL Governance libraries.

Marinade's existing governance UI can be used as a reference implementation:

https://github.com/marinade-finance/governance-ui

Do not fork the entire application.

Use it to understand:

- Marinade Realm configuration
- governance account fetching
- proposal fetching
- proposal state interpretation
- Voter Stake Registry integration
- instruction parsing
- relevant program addresses

Implement a clean, small application specifically for Marinade.

---

# External systems

## Marinade governance

Marinade uses SPL Governance / Realms.

Relevant Realm:

```text
899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo
```

The application must query actual live Solana mainnet data.

Create a configuration module such as:

```text
src/config/marinade.ts
```

Store known public Marinade program addresses and configuration there.

Do not scatter addresses through components.

Example:

```ts
export const MARINADE_REALM = new PublicKey(
  "899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo",
);
```

---

# Solana RPC configuration

The RPC endpoint must be configurable.

Use:

```text
SOLANA_RPC_URL
```

through an environment variable.

Provide:

```text
.env.example
```

Example:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

Do not commit private RPC credentials.

The public Solana RPC can be used as a fallback for development, but the code must support providers such as Helius, Triton, QuickNode, etc.

---

# Marinade forum

Marinade's forum is a Discourse installation:

```text
https://forum.marinade.finance
```

Discourse exposes JSON endpoints.

Do not scrape rendered HTML pages.

Use structured Discourse responses.

For example, a topic can generally be accessed using:

```text
https://forum.marinade.finance/t/{topic-id}.json
```

Discourse topic responses contain data such as:

- title
- slug
- posts
- usernames
- creation timestamps
- rendered post HTML (`cooked`)
- reply counts
- views
- post numbers

Implement the forum integration through our own server-side code.

Do not fetch Discourse directly from React client components.

Suggested structure:

```text
src/lib/forum/
  client.ts
  types.ts
  normalize.ts
```

---

# Architecture

Use a clear separation between:

```text
external representation
        ↓
fetching/parsing
        ↓
domain model
        ↓
UI
```

React components should not directly understand raw SPL Governance account structures or raw Discourse JSON.

For example:

```text
Solana RPC
   ↓
governance client
   ↓
normalizeProposal()
   ↓
GovernanceProposal
   ↓
React components
```

and:

```text
Discourse API
   ↓
forum client
   ↓
normalizeForumTopic()
   ↓
ForumTopic
   ↓
React components
```

---

# Suggested source structure

Use approximately:

```text
src/
  app/
    page.tsx

    governance/
      page.tsx

      proposals/
        [proposal]/
          page.tsx

    api/
      forum/
        topics/
          [id]/
            route.ts

  components/
    governance/
      proposal-card.tsx
      proposal-list.tsx
      proposal-status.tsx
      voting-progress.tsx
      proposal-instructions.tsx
      governance-stats.tsx

    forum/
      forum-topic.tsx
      forum-post.tsx
      forum-summary.tsx

    ui/

  config/
    marinade.ts

  lib/
    solana/
      connection.ts

    governance/
      client.ts
      proposals.ts
      instructions.ts
      types.ts
      normalize.ts

    forum/
      client.ts
      types.ts
      normalize.ts

    proposals/
      mapping.ts

  utils/
    format.ts
    dates.ts
    public-key.ts
```

This structure may be adjusted if a better architecture becomes obvious during implementation.

Keep domain logic out of React components.

---

# Domain model

Create a normalized representation of an on-chain governance proposal.

Something approximately like:

```ts
export type GovernanceProposalStatus =
  | "draft"
  | "signing_off"
  | "voting"
  | "succeeded"
  | "defeated"
  | "executing"
  | "completed"
  | "cancelled"
  | "unknown";

export interface GovernanceProposal {
  address: string;

  name: string;

  description?: string;

  governanceAddress: string;

  governingTokenMint?: string;

  status: GovernanceProposalStatus;

  createdAt?: Date;

  votingStartedAt?: Date;

  votingEndsAt?: Date;

  votingCompletedAt?: Date;

  executionCompletedAt?: Date;

  yesVotes: bigint;

  noVotes: bigint;

  abstainVotes?: bigint;

  maxVoteWeight?: bigint;

  instructions: GovernanceInstruction[];

  raw?: unknown;
}
```

Do not force this exact shape if the underlying governance version requires something different.

The important thing is that components consume a stable Marinade-oriented domain type rather than raw SDK objects.

---

# Governance instructions

Create a normalized representation of instructions attached to proposals.

Example:

```ts
export interface GovernanceInstruction {
  index: number;

  programId: string;

  accounts: {
    address: string;
    writable: boolean;
    signer: boolean;
  }[];

  data: string;

  decoded?: {
    type: string;
    programName?: string;
    summary?: string;
    fields?: Record<string, unknown>;
  };
}
```

For the first implementation:

1. Always show the raw program ID.
2. Show involved account addresses.
3. Show whether accounts are writable/signers.
4. Show raw instruction data in an expandable advanced section.
5. Decode known instructions where reasonably possible.

Do not attempt to decode every Solana program.

If an instruction cannot be decoded, display:

```text
Unknown instruction
Program: <program address>
```

rather than guessing.

---

# Known program names

Create a small registry mapping known addresses to readable names.

Example:

```ts
const PROGRAM_NAMES = {
  "...": "SPL Governance",
  "...": "Marinade",
  "...": "Marinade Validator Bonds",
  "...": "SPL Token",
};
```

The UI should prefer:

```text
Marinade Validator Bonds
```

and show the address underneath.

Do not hide the actual address.

---

# Proposal discovery

Implement a function equivalent to:

```ts
getMarinadeProposals(): Promise<GovernanceProposal[]>
```

It must retrieve proposals belonging to the Marinade Realm.

Do not hardcode individual proposal addresses.

Sort proposals by relevant date descending.

Active voting proposals should be easy to identify.

Determine proposal state from on-chain data rather than from forum data.

---

# Proposal details

Implement:

```ts
getMarinadeProposal(
  proposalAddress: string
): Promise<GovernanceProposal | null>
```

The proposal page should load directly from the proposal's public key.

Example route:

```text
/governance/proposals/ABC123...
```

Invalid proposal addresses should result in an appropriate 404/error state.

---

# Forum proposal discovery

We need to identify Marinade Improvement Proposals such as:

```text
MIP-23
MIP-22
MIP-21
```

Investigate the Marinade forum structure and determine the most reliable way to retrieve MIP topics.

Possible approaches include:

- forum category
- tag
- Discourse search
- title prefix matching

Prefer a structured category/tag if Marinade uses one consistently.

Do not rely on scraping the homepage.

Implement:

```ts
getMarinadeForumProposals(): Promise<ForumTopic[]>
```

Normalized type:

```ts
export interface ForumTopic {
  id: number;

  slug: string;

  title: string;

  url: string;

  createdAt: Date;

  lastPostedAt?: Date;

  author?: {
    username: string;
    name?: string;
    avatarUrl?: string;
  };

  replyCount: number;

  views?: number;

  posts: ForumPost[];
}
```

and:

```ts
export interface ForumPost {
  id: number;

  number: number;

  author: {
    username: string;
    name?: string;
    avatarUrl?: string;
  };

  createdAt: Date;

  html: string;
}
```

---

# Forum HTML security

Discourse returns rendered HTML in the `cooked` field.

Treat this as untrusted HTML.

Before rendering it:

- sanitize it server-side or with a well-established HTML sanitization library
- remove scripts
- remove dangerous attributes
- prevent arbitrary executable HTML

Never directly pass raw remote HTML into:

```tsx
dangerouslySetInnerHTML;
```

without sanitization.

Preserve normal formatting such as:

- paragraphs
- headings
- lists
- links
- blockquotes
- tables
- code blocks

External links should open safely.

---

# Mapping forum topics to on-chain proposals

Forum proposals and on-chain proposals are separate objects.

Do not assume that a reliable machine-readable relationship exists.

Implement a mapping layer.

For the MVP it is acceptable to maintain a small explicit mapping file:

```text
src/lib/proposals/mapping.ts
```

Example:

```ts
export const PROPOSAL_FORUM_MAPPING: Record<string, number> = {
  "<proposal-public-key>": 1998,
};
```

The key is:

```text
on-chain proposal address
```

The value is:

```text
Discourse topic ID
```

Add comments explaining that this is temporary.

Architect the code so this mapping can later be replaced by automatic matching or metadata.

Do not embed this mapping in React components.

---

# Combined proposal model

Create a service that combines the two sources.

Example:

```ts
export interface MarinadeProposal {
  governance: GovernanceProposal;
  forum?: ForumTopic;
}
```

Implement:

```ts
getMarinadeProposalDetails(
  proposalAddress: string
): Promise<MarinadeProposal | null>
```

UI components should primarily consume this combined representation.

---

# Pages

## `/`

Create a simple landing/dashboard page.

It should immediately communicate:

```text
Marinade Governance
Understand what the DAO is deciding.
```

Show:

- number of active proposals
- recent proposals
- link to all proposals

Do not spend excessive time building a marketing landing page.

The application itself is the product.

---

# `/governance`

This is the main governance dashboard.

Show:

## Header

```text
Marinade Governance
```

Subtitle:

```text
Explore proposals, discussions and on-chain actions governing Marinade.
```

---

## Summary statistics

Display useful data where it can be derived reliably.

For example:

```text
Active proposals
Total proposals
Completed proposals
```

Do not invent treasury values, voter counts, or other metrics unless they can be retrieved accurately.

---

## Active proposals

Active voting proposals should appear first.

Proposal card example:

```text
MIP-23

Full Validator Coverage of PSR Downtime

VOTING

68% For
32% Against

Voting ends in 2d 14h

18 forum replies

[View proposal]
```

If no MIP mapping is known:

```text
Proposal <short-address>
```

or use the on-chain proposal name.

---

## Previous proposals

Show completed/rejected/cancelled proposals underneath.

Allow simple status filtering:

```text
All
Active
Passed
Defeated
```

Do not implement complex search unless trivial.

---

# Proposal page

Route:

```text
/governance/proposals/[proposal]
```

This is the most important page in the MVP.

---

## Header

Display:

- MIP identifier where known
- proposal name
- proposal state
- proposal public key
- creation date
- voting end date where applicable

Example:

```text
MIP-23

Full Validator Coverage of PSR Downtime

Voting

Proposal:
3fH7...Q92d

Voting ends:
Oct 7, 2026, 18:00 UTC
```

Public keys should have:

- abbreviated display
- copy button
- link to Solana Explorer

---

# Human description

If a mapped forum post exists, use its first post as the primary long-form description.

Clearly label the source:

```text
Proposal discussion
Source: Marinade Forum
```

Show:

- author
- date
- content
- reply count
- link to original forum thread

Do not rewrite the content with AI in this version.

Show the actual forum content.

---

# Vote state

Show a clear vote visualization.

For example:

```text
Current vote

FOR
12.4M veMNDE
68%

AGAINST
5.8M veMNDE
32%
```

Use a horizontal progress bar.

Below it display relevant governance details such as:

```text
Voting started
Voting ends
Proposal state
```

Be careful with denominator semantics.

Do not show percentages against quorum or total supply unless the relevant values are correctly understood.

If only Yes vs No percentages can reliably be calculated, use only those.

Handle zero-vote proposals gracefully.

---

# Voting timeline

Represent the proposal lifecycle visually.

For example:

```text
Created
   ↓
Voting
   ↓
Succeeded
   ↓
Executed
```

Highlight the current state.

Only show lifecycle steps supported by actual governance semantics.

Do not imply execution has happened merely because voting succeeded.

---

# On-chain actions

Create a section titled:

```text
On-chain actions
```

This is a major part of the product.

Each proposal instruction should appear as a card.

Example:

```text
Action 1

Program
Marinade Validator Bonds

Program address
ABC...XYZ

Accounts
6

Status
Not executed
```

Expandable details:

```text
Accounts

1. 83jd...a91
   writable

2. 4KL...931
   writable
   signer

Raw instruction data
<hex/base64>
```

Where decoding is available:

```text
Decoded action

Change validator bond configuration
```

For the MVP, correct raw presentation is more important than broad decoding coverage.

Never fabricate a human-readable explanation.

---

# Discussion section

Below the initial forum proposal, show a preview of recent replies.

For example:

```text
Discussion

18 replies · 7 participants
```

Render up to approximately 5 replies initially.

Provide:

```text
View full discussion on Marinade Forum
```

There is no need to recreate the entire Discourse UX.

---

# Design requirements

The application should feel like a modern crypto financial/governance application rather than a generic admin dashboard.

Use:

- large readable typography
- restrained borders
- whitespace
- clear status indicators
- readable numerical formatting
- responsive layout
- dark/light mode only if easy; do not prioritize it over functionality

Avoid excessive gradients, glassmorphism and decorative crypto visuals.

Focus on information hierarchy.

---

# Tailwind

Use Tailwind CSS v4.

Follow the current Tailwind v4 setup rather than legacy v3 patterns.

Do not create an unnecessary large Tailwind config if CSS-first configuration is sufficient.

Use utility classes for the majority of styling.

Create reusable components when utility combinations become repetitive.

---

# Responsive behavior

The application must work at:

- desktop
- tablet
- mobile

On mobile:

- stack proposal information vertically
- preserve readable vote information
- avoid horizontal scrolling except for intentionally scrollable technical data
- truncate public keys intelligently

---

# Loading states

Every data-dependent view should have an intentional loading state.

Where Server Components resolve data before rendering, use:

```text
loading.tsx
```

where appropriate.

Do not show blank screens.

---

# Error handling

Handle:

- unavailable Solana RPC
- malformed RPC responses
- proposal not found
- forum unavailable
- forum topic not found
- missing forum mapping
- instruction decoding failure

Failure of the forum should **not** prevent displaying the on-chain proposal.

For example:

```text
Forum discussion temporarily unavailable.
On-chain governance data is still shown below.
```

Similarly, failure to decode one instruction should not break the proposal page.

---

# Caching

Governance data does not need millisecond freshness.

Use reasonable Next.js caching/revalidation.

Suggested initial values:

```text
Proposal list: 30–60 seconds
Proposal details: 30 seconds
Forum topic: 5 minutes
```

These are guidelines, not requirements.

Do not add Redis or an external cache.

---

# Data precision

Governance vote amounts will likely use integers / bigints.

Never convert large governance values directly to JavaScript `number` before determining whether precision is safe.

Keep values as:

```ts
bigint;
```

internally where possible.

Formatting should happen at the UI boundary.

---

# Formatting utilities

Create utilities for:

```ts
formatTokenAmount();
formatPercentage();
formatPublicKey();
formatDate();
formatRelativeTime();
```

Examples:

```text
12483920 → 12.48M
0.68492 → 68.5%
899YG3...L6Mo
2 days remaining
```

Keep formatting logic out of JSX where practical.

---

# No wallet functionality yet

The first version is intentionally read-only.

Do NOT implement:

- Connect Wallet
- Phantom
- Solflare
- wallet adapter UI
- voting
- proposal creation
- executing proposals
- MNDE locking
- unlocking MNDE
- delegation
- claiming rewards
- signing transactions

However, architecture should not make adding these features unnecessarily difficult later.

---

# No AI functionality yet

Do NOT implement:

- AI proposal summaries
- AI risk scoring
- AI instruction explanations
- AI forum summarization

The initial application should establish trustworthy deterministic data retrieval first.

AI interpretation can be added later on top of verified data.

---

# Development diagnostics

Because governance account parsing can be difficult, create useful development logging.

In development mode, it should be easy to inspect:

```text
proposal address
proposal state
vote weights
governance account
proposal transactions
instruction program IDs
```

Do not leave noisy debugging output enabled in production.

---

# Optional debug page

If useful, create:

```text
/debug/governance
```

Only in development.

This can show:

```text
Realm
Governances
Proposals
Proposal transactions
Raw account state
```

This is optional but may dramatically speed up development.

Do not spend time styling it.

---

# Research requirement

Before implementing the governance client, inspect:

```text
https://github.com/marinade-finance/governance-ui
```

Specifically determine:

1. which SPL Governance SDK/version Marinade currently uses
2. how the Marinade Realm is loaded
3. which governance program ID is relevant
4. how proposals are enumerated
5. how proposal transactions/instructions are loaded
6. how voter weight is represented
7. whether Marinade uses any custom Realm configuration relevant to reading proposals

Document significant findings in:

```text
docs/GOVERNANCE.md
```

Do not blindly copy large parts of the repository.

---

# `docs/GOVERNANCE.md`

Create this document during implementation.

It should contain:

```markdown
# Marinade Governance Architecture

## Realm

Address:
...

## Governance program

Address:
...

## Community mint

Address:
...

## Voter weight plugin

...

## How proposals are discovered

...

## How votes are represented

...

## How proposal instructions are retrieved

...

## Relevant source repositories

...
```

This document should explain enough that another engineer can understand how our UI obtains governance state.

---

# Forum research

Also document:

```text
docs/FORUM.md
```

Include:

- Marinade forum base URL
- relevant category/tag used for proposals
- endpoints used
- mapping strategy
- sanitization approach
- example MIP topic IDs

---

# Testing

At minimum add unit tests for normalization and formatting logic.

Priority test targets:

```text
normalize proposal state
calculate Yes/No percentages
zero-vote proposal
bigint token formatting
public-key formatting
Discourse normalization
proposal/forum mapping
unknown instruction handling
```

Do not spend hackathon time building exhaustive component snapshot tests.

---

# Acceptance criteria

The task is complete when all of the following work.

## Governance list

Opening:

```text
/governance
```

retrieves current Marinade governance proposals from Solana mainnet.

The page displays:

- proposal name
- proposal address
- current state
- Yes votes
- No votes
- voting deadline where applicable

No proposal data is hardcoded.

---

## Proposal page

Opening:

```text
/governance/proposals/<valid-address>
```

shows live data for that proposal.

It includes:

- title/name
- state
- public key
- voting data
- relevant dates
- attached governance instructions

---

## Instructions

Proposal instructions are retrieved from on-chain governance accounts.

Each instruction displays at least:

- program ID
- accounts
- writable/signing flags
- raw data

Known programs should have human-readable labels.

Unknown programs must still render correctly.

---

## Forum

At least several real Marinade governance proposals are mapped to their corresponding forum topics.

The proposal page displays:

- forum title
- original author
- first post
- creation date
- reply count
- link to Marinade Forum

Forum content is loaded dynamically from Discourse.

It must not be copied manually into the source code.

---

## Failure independence

If the Marinade forum is unavailable, on-chain proposal pages still work.

If a forum mapping does not exist, the page simply omits the discussion and explains:

```text
No linked forum discussion found.
```

---

## UI

The interface:

- uses Next.js
- uses Tailwind CSS 4
- is responsive
- has useful loading states
- has useful error states
- clearly distinguishes on-chain information from forum information

---

# Desired MVP demo

The final demo should allow us to open the application and say:

> This is Marinade governance.

Then show live proposals.

Open one proposal and demonstrate:

1. the human proposal from the Marinade forum
2. the actual vote occurring on Solana
3. current For/Against totals
4. voting timing/state
5. the actual on-chain instructions attached to the proposal

The important product concept is:

```text
Discussion
+
Voting state
+
Executable actions
```

in one interface.

The user should no longer need to understand that these currently live across Marinade Forum, Realms, and raw Solana accounts.

---

# Explicitly out of scope for this task

Do not implement the following unless everything above is complete:

- wallet connection
- voting
- MNDE locking
- MNDE unlocking
- governance rewards
- treasury analytics
- proposal creation
- proposal execution
- Council multisig functionality
- notifications
- AI summaries
- AI security analysis
- transaction simulation
- advanced instruction decoding
- user profiles
- database
- authentication

These are subsequent tasks.

---

# Future phase

The architecture should make the next task possible:

```text
TASK 2 — Wallet + Voting
```

That phase will add:

```text
connect wallet
      ↓
retrieve user's governance/voter record
      ↓
display veMNDE voting power
      ↓
select For / Against
      ↓
construct SPL Governance vote transaction
      ↓
wallet signs
      ↓
submit
      ↓
refresh proposal state
```

Do not implement it yet.

The purpose of this task is to establish a reliable, comprehensible, read-only Marinade governance data layer and UI first.
