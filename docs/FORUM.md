# Marinade Forum Integration

## Base URL

https://forum.marinade.finance (Discourse). Only JSON endpoints are used; all
requests are made server-side (`src/lib/forum/client.ts`).

## Where proposals live

- Category **Governance** — id `8`, slug `flavourful-responsibility`.
- Tag **`proposal`** — applied to most proposal topics but not consistently
  (e.g. MIP-21 has only `fees`).
- MIPs are **not** confined to the Governance category. Examples: MIP-1, 2, 4,
  5, 7, 8, 9, 10, 11 in *General* (5); MIP-3 and MIP-20 in *Tokenomics* (6);
  MIP-12 in *Grants* (9); MIP-22 in *Uncategorized* (1).

So `getMarinadeForumProposals()` combines:

1. Discourse search `MIP in:title order:latest` (paginated), and
2. the Governance category listing (paginated),

keeping topics with a MIP identifier in the title or the `proposal` tag. It
returns lightweight `ForumTopicSummary` items (title, reply count, views) used
for list-page reply counts. Full topics (`ForumTopic`) with posts are loaded
per proposal.

## Endpoints used

| Endpoint | Purpose | Cache |
| --- | --- | --- |
| `GET /t/{id}.json` | Topic metadata + first ~20 posts | 5 min |
| `GET /t/{id}/posts.json?post_ids[]=…` | Latest replies beyond the first page | 5 min |
| `GET /c/flavourful-responsibility/8.json?page=N` | Governance category listing | 5 min |
| `GET /search.json?q=MIP%20in%3Atitle%20order%3Alatest&page=N` | MIP topics in any category | 5 min |

Our own route `GET /api/forum/topics/{id}` returns the normalized, sanitized
topic (for future client-side use).

Reply count = `posts_count - 1` (Discourse's `reply_count` only counts direct
replies and is 0 for many active threads). Moderator/system posts
(`post_type != 1`), hidden and deleted posts are dropped.

## Mapping strategy

There is no machine-readable link from an on-chain proposal to a forum topic.
`src/lib/proposals/mapping.ts` resolves a topic in order:

1. `PROPOSAL_FORUM_MAPPING` — explicit, hand-reviewed proposal address → topic id
   (temporary; 21 entries).
2. A `forum.marinade.finance/t/<slug>/<id>` URL inside the proposal's on-chain
   `descriptionLink` (many MIPs link their thread). Slug-only URLs are ignored.

Fuzzy title matching is deliberately not used: the vetoed proposal
`7pYWFt7aigkEU86nbxKM182t6xgVBz9ZaJ1gFzaYN1Zj` is titled "MIP-23: VSR program
security and maintenance upgrade" and would wrongly attach to the real MIP-23
topic. Resolvers are a list, so automatic matching or metadata can be added
later without touching components.

## Sanitization

Discourse `cooked` HTML (and HTML found in on-chain descriptions) is
untrusted. `src/lib/forum/sanitize.ts` uses
[`sanitize-html`](https://www.npmjs.com/package/sanitize-html) server-side
during normalization, with an allow-list:

- formatting tags only (paragraphs, headings, lists, links, blockquotes,
  tables, code, images, details);
- `script`, `style`, `iframe`, `object`, `svg`, … are removed with content;
- no event handlers or `style` attributes; only `http`, `https`, `mailto`
  URLs (`https` only for images); `javascript:` URLs dropped;
- relative links/images are made absolute to the forum;
- every link gets `target="_blank" rel="noopener noreferrer nofollow ugc"`,
  images get `loading="lazy" referrerpolicy="no-referrer"`.

Components only ever receive already-sanitized HTML.

## Failure handling

Forum failures never block on-chain data: the proposal page streams forum
sections inside `<Suspense>` and shows "Forum discussion temporarily
unavailable" / "No linked forum discussion found" notices; the list page hides
reply counts and shows a warning.

## Example MIP topic ids

| MIP | Topic id | Category |
| --- | --- | --- |
| MIP-23 Full Validator Coverage of PSR Downtime | 1998 | Governance |
| MIP-22 MNDE Liquidity and Staking Rewards | 1993 | Uncategorized |
| MIP-21 Exchange mSOL from the DAO Treasury | 1975 | Governance |
| MIP-19 Improving SAM | 1969 | Governance |
| MIP-18 Fee Structure Revamp | 1967 | Governance |
| MIP-14 Burn 5–50% of MNDE | 1909 | Governance |
| MIP-12 Migrate Campaign | 1876 | Grants |
| MIP-10 Simplification of SAM | 1713 | General |
| MIP-1 Relaxation of SAM Constraints | 1652 | General |
