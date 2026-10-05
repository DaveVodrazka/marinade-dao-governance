import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { StatusChip } from "@/components/governance/proposal-status";
import {
  MARINADE_FORUM_URL,
  MARINADE_GOVERNANCE_PROGRAM_ID,
  MARINADE_GOVERNANCE_RULES as RULES,
  MARINADE_REALM,
} from "@/config/marinade";
import type { StatusTone } from "@/lib/governance/presentation";
import { formatCount } from "@/utils/format";
import { explorerAddressUrl } from "@/utils/public-key";

export const metadata: Metadata = {
  title: { absolute: "About · Marinade Governance" },
  description: "How the Marinade DAO makes decisions: forum discussion, MNDE votes on Solana, council and on-chain execution.",
};

const councilVotesNeeded = Math.ceil((RULES.councilSeats * RULES.councilYesThresholdPct) / 100);
const councilVetoNeeded = Math.ceil((RULES.councilSeats * RULES.councilVetoThresholdPct) / 100);

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Discuss",
    body: (
      <>
        An idea is written up as a <strong>MIP</strong> (Marinade Improvement Proposal) on the{" "}
        <a href={MARINADE_FORUM_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          forum
        </a>{" "}
        and debated in public.
      </>
    ),
  },
  {
    title: "Propose",
    body: "It is submitted on Solana as a proposal, together with the exact on-chain actions it would perform.",
  },
  {
    title: "Vote",
    body: `Voting stays open for ${RULES.votingDays} days, followed by a ${RULES.communityCoolOffDays}-day cool-off for community votes.`,
  },
  {
    title: "Execute",
    body: "If it passes, its actions can be executed on-chain. Nothing changes until that happens.",
  },
];

const STATUSES: { label: string; tone: StatusTone; meaning: string }[] = [
  { label: "Voting", tone: "active", meaning: "Open. Votes for and against can be cast." },
  { label: "Cool-off", tone: "active", meaning: "Final day. Only Against votes and a council veto can still be added." },
  { label: "Finalizing", tone: "warning", meaning: "Time is up, but nobody has recorded the final result on-chain yet." },
  { label: "Succeeded", tone: "positive", meaning: "Passed. Its actions, if any, may still be waiting to execute." },
  { label: "Completed", tone: "positive", meaning: "Passed and all its actions have run." },
  { label: "Defeated", tone: "negative", meaning: "Did not reach enough For votes." },
  { label: "Vetoed", tone: "negative", meaning: "Blocked by the council." },
  { label: "Cancelled", tone: "neutral", meaning: "Withdrawn by its author before finishing." },
];

const GLOSSARY: { term: string; definition: ReactNode }[] = [
  {
    term: "DAO",
    definition:
      "Decentralized Autonomous Organization: a group that makes decisions by token-holder votes, and whose decisions are carried out by code instead of a company.",
  },
  {
    term: "MNDE",
    definition: "Marinade's governance token. Locked MNDE gives voting power.",
  },
  {
    term: "MIP",
    definition: "Marinade Improvement Proposal: a numbered proposal (MIP-1, MIP-2, …) for changes to the protocol, fees or treasury.",
  },
  {
    term: "Realm",
    definition: (
      <>
        The DAO&apos;s home on Solana: an account that ties together the voters, the council and the treasuries. It uses SPL
        Governance, the standard program behind Realms (Solana&apos;s DAO tool).
      </>
    ),
  },
  {
    term: "Voter Stake Registry",
    definition: "The program where MNDE is locked to get voting power.",
  },
  {
    term: "On-chain action",
    definition:
      "A Solana instruction attached to a proposal, such as moving treasury tokens or changing a program setting. It is exactly what will run if the vote passes, so it can be checked before voting.",
  },
  {
    term: "Veto",
    definition: "A council vote that blocks a community proposal, even one with a For majority.",
  },
];

function Section({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-2 max-w-3xl text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Rule({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">About</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">How Marinade governance works</h1>
        <p className="mt-5 text-lg leading-8 text-muted sm:text-xl">
          Marinade is governed by its DAO. MNDE holders and a small council decide on fees, staking strategy, the
          treasury and program upgrades. Every decision is a public vote on Solana, and a passed proposal carries out
          its own changes on-chain.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/recent"
            className="rounded-xl bg-fg px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            See what&apos;s being voted on
          </Link>
          <Link
            href="/governance"
            className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-line-strong"
          >
            Browse all proposals
          </Link>
        </div>
      </header>

      <Section title="A proposal's journey">
        <ol className="grid gap-3 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg text-xs text-subtle md:grid"
                >
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Who decides"
        intro="There are two groups of voters. Each proposal is decided by one of them, and every proposal on this site is labelled with which one."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Community</p>
            <h3 className="mt-1 text-lg font-semibold">MNDE holders</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Vote on MIPs, the big decisions: fees, tokenomics, treasury spending and the staking delegation strategy.
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-6">
              <li>
                <strong>Only locked MNDE counts.</strong> MNDE locked in the Voter Stake Registry gets 1 vote per token
                while at least {RULES.vsrFullPowerLockupDays} days of the lock remain. With less time left, it gets
                proportionally less. Unlocked MNDE in a wallet has no vote.
              </li>
              <li>
                Creating a community proposal requires at least{" "}
                {formatCount(RULES.communityMinVotesToPropose)} votes of voting power.
              </li>
            </ul>
          </article>
          <article className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Council</p>
            <h3 className="mt-1 text-lg font-semibold">{RULES.councilSeats} council members</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Handle day-to-day operations such as program upgrades, parameter changes and other routine
              configuration. This is why most proposals on the list are council votes.
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-6">
              <li>
                <strong>One council token, one vote.</strong> There are {RULES.councilSeats} tokens in total.
              </li>
              <li>
                Acts as a safeguard: the council can <strong>veto</strong> a community proposal (
                {councilVetoNeeded} of {RULES.councilSeats}), for example a malicious one. The community cannot veto
                council proposals.
              </li>
            </ul>
          </article>
        </div>
      </Section>

      <Section title="When does a proposal pass?">
        <dl className="divide-y divide-line rounded-2xl border border-line bg-surface px-6">
          <Rule label="Community vote">
            <p>
              For votes reach at least <strong>{RULES.communityYesThresholdPct}% of the total MNDE supply</strong>,{" "}
              <em>and</em> there are more For than Against votes.
            </p>
            <p className="mt-1 text-sm text-muted">
              Runs the full {RULES.votingDays} days even if the result looks settled, then the {RULES.communityCoolOffDays}
              -day cool-off. A council veto during the vote overrides the result.
            </p>
          </Rule>
          <Rule label="Council vote">
            <p>
              At least <strong>{councilVotesNeeded} of {RULES.councilSeats}</strong> council members approve.
            </p>
            <p className="mt-1 text-sm text-muted">Can pass early, as soon as enough members approve.</p>
          </Rule>
          <Rule label="Reading the numbers">
            <p className="text-sm leading-6 text-muted">
              The For / Against percentages on this site are shares of the votes cast. A proposal can show 99% For and
              still fail if fewer than {RULES.communityYesThresholdPct}% of all MNDE voted For.
            </p>
          </Rule>
        </dl>
      </Section>

      <Section title="Statuses you'll see">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {STATUSES.map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              <dt className="w-24 shrink-0 pt-0.5">
                <StatusChip label={s.label} tone={s.tone} />
              </dt>
              <dd className="text-sm leading-6 text-muted">{s.meaning}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <section className="space-y-3">
        <details className="group rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            New to this? Key terms
            <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <dl className="divide-y divide-line border-t border-line px-6">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
                <dt className="font-medium">{g.term}</dt>
                <dd className="text-sm leading-6 text-muted">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </details>

        <details className="group rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            Where this site gets its data
            <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <div className="space-y-3 border-t border-line px-6 py-4 text-sm leading-6 text-muted">
            <p>
              Proposals, votes and actions are read live from Solana mainnet. They come from Marinade&apos;s own SPL
              Governance program (
              <a href={explorerAddressUrl(MARINADE_GOVERNANCE_PROGRAM_ID)} target="_blank" rel="noopener noreferrer" className="font-mono text-accent hover:underline">
                GovMai…oQoYs
              </a>
              ) and the{" "}
              <a href={explorerAddressUrl(MARINADE_REALM)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Marinade DAO realm
              </a>
              . This is the same data Realms shows.
            </p>
            <p>
              Discussions are loaded from the Marinade Forum. The forum is where proposals are debated. Only the
              on-chain vote decides the outcome.
            </p>
            <p>This site is read-only. It never asks you to connect a wallet.</p>
          </div>
        </details>
      </section>
    </div>
  );
}
