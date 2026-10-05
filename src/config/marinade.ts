/**
 * Public, well-known Marinade governance addresses and configuration.
 *
 * Every address used by the data layer lives here. Do not scatter addresses
 * through components. All values were verified against live mainnet state and
 * Marinade's published sources — see docs/GOVERNANCE.md.
 */

/** The Marinade DAO realm (SPL Governance RealmV2 account). */
export const MARINADE_REALM = "899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo";

/**
 * Marinade runs its own deployment of the SPL Governance program (v3.1.x),
 * not the shared Realms instance (GovER5...).
 */
export const MARINADE_GOVERNANCE_PROGRAM_ID =
  "GovMaiHfpVPw8BAM1mbdzgmSZYDw2tdP32J2fapoQoYs";

/** Community voter weight plugin configured in the realm's RealmConfig account. */
export const MARINADE_VSR_PROGRAM_ID =
  "VoteMBhDCqGLRgYpp9o7DGyq81KNmwjXQRAHStjtJsS";

export const MNDE_MINT = "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey";
export const MARINADE_COUNCIL_MINT =
  "6MGwpuJ5YE1c8jJaF8FKurQdDJeYRf1adX76dovkXxRs";

export type GoverningBody = "community" | "council";

export interface GoverningMintConfig {
  address: string;
  body: GoverningBody;
  /** Mint decimals, used to format vote weights. Verified on-chain. */
  decimals: number;
  /** Short label for vote weight amounts. */
  voteUnit: string;
  description: string;
}

export const GOVERNING_MINTS: Record<string, GoverningMintConfig> = {
  [MNDE_MINT]: {
    address: MNDE_MINT,
    body: "community",
    decimals: 9,
    voteUnit: "votes",
    description:
      "Community vote. Weight comes from MNDE locked in the Marinade Voter Stake Registry.",
  },
  [MARINADE_COUNCIL_MINT]: {
    address: MARINADE_COUNCIL_MINT,
    body: "council",
    decimals: 0,
    voteUnit: "council votes",
    description: "Council vote. One council token = one vote.",
  },
};

/** Explorer used for address links. */
export const SOLANA_EXPLORER_URL = "https://explorer.solana.com";

export const DEFAULT_SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

/** Marinade Discourse forum. */
export const MARINADE_FORUM_URL = "https://forum.marinade.finance";

/** Discourse category "Governance" (slug: flavourful-responsibility). */
export const MARINADE_FORUM_GOVERNANCE_CATEGORY = {
  id: 8,
  slug: "flavourful-responsibility",
};

/** Discourse tag applied to most (not all) proposal topics. */
export const MARINADE_FORUM_PROPOSAL_TAG = "proposal";

/** Cache lifetimes in seconds. */
export const REVALIDATE = {
  proposalList: 60,
  proposalDetail: 30,
  forumTopic: 300,
  forumList: 300,
} as const;

export interface KnownProgram {
  name: string;
  /** Where the name was verified. */
  source: string;
}

/**
 * Known program addresses → readable names. Only programs whose identity was
 * verified from official sources are listed. Unknown programs are displayed
 * by address only.
 */
export const KNOWN_PROGRAMS: Record<string, KnownProgram> = {
  [MARINADE_GOVERNANCE_PROGRAM_ID]: {
    name: "Marinade Governance (SPL Governance)",
    source: "Marinade docs: contract addresses",
  },
  GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw: {
    name: "SPL Governance (Realms)",
    source: "Realms governance-ui",
  },
  [MARINADE_VSR_PROGRAM_ID]: {
    name: "Marinade Voter Stake Registry",
    source: "Marinade docs; realm config voter weight addin",
  },
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: {
    name: "Marinade Liquid Staking",
    source: "Marinade docs: contract addresses",
  },
  mnspJQyF1KdDEs5c6YJPocYdY1esBgVQFufM2dY9oDk: {
    name: "Marinade Native Staking Proxy",
    source: "Marinade docs: contract addresses",
  },
  dstK1PDHNoKN9MdmftRzsEbXP5T1FTBiQBm1Ee3meVd: {
    name: "Marinade Directed Stake",
    source: "Marinade docs: contract addresses",
  },
  vBoNdEvzMrSai7is21XgVYik65mqtaKXuSdMBJ1xkW4: {
    name: "Marinade Validator Bonds",
    source: "marinade-finance/validator-bonds",
  },
  MR2LqxoSbw831bNy68utpu5n4YqBH3AzDmddkgk9LQv: {
    name: "Marinade Liquid Staking Referral",
    source: "Marinade docs: contract addresses",
  },
  LigadctxNRkZied3WuhX525vUhDkuhXNK5DyeijeDnh: {
    name: "Marinade Liquidity Gauges",
    source: "Marinade docs: contract addresses",
  },
  va12L6Z9fa5aGJ7gxtJuQZ928nySAk5UetjcGPve3Nu: {
    name: "Marinade Validator Gauges",
    source: "Marinade docs: contract addresses",
  },
  tovt1VkTE2T4caWoeFP6a2xSFoew5mNpd7FWidyyMuk: {
    name: "Marinade Escrow Relocker (Tribeca)",
    source: "Marinade docs: contract addresses",
  },
  tokdh9ZbWPxkFzqsKqeAwLDk6J6a8NBZtQanVuuENxa: {
    name: "Marinade Tokadapt",
    source: "Marinade docs: contract addresses",
  },
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: {
    name: "SPL Token",
    source: "Solana",
  },
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: {
    name: "SPL Token-2022",
    source: "Solana",
  },
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: {
    name: "SPL Associated Token Account",
    source: "Solana",
  },
  "11111111111111111111111111111111": {
    name: "System Program",
    source: "Solana",
  },
  BPFLoaderUpgradeab1e11111111111111111111111: {
    name: "BPF Upgradeable Loader",
    source: "Solana",
  },
  Stake11111111111111111111111111111111111111: {
    name: "Stake Program",
    source: "Solana",
  },
  ComputeBudget111111111111111111111111111111: {
    name: "Compute Budget",
    source: "Solana",
  },
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: {
    name: "SPL Memo",
    source: "Solana",
  },
};

/** Known non-program accounts, labelled where they appear in instructions. */
export const KNOWN_ACCOUNTS: Record<string, string> = {
  [MARINADE_REALM]: "Marinade DAO Realm",
  [MNDE_MINT]: "MNDE mint",
  [MARINADE_COUNCIL_MINT]: "Marinade council mint",
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "mSOL mint",
  "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC": "Marinade state",
  SysvarRent111111111111111111111111111111111: "Sysvar: Rent",
  SysvarC1ock11111111111111111111111111111111: "Sysvar: Clock",
};

/**
 * Governance rules as configured on-chain, used for explanatory copy on the
 * About page. Read from the Governance accounts and the VSR registrar
 * (5zgEgPbWKsAAnLPjSM56ZsbLPfVM6nUzh3u45tCnm97D) in October 2026 — re-check
 * via /debug/governance if the DAO changes its configuration.
 */
export const MARINADE_GOVERNANCE_RULES = {
  /** Base voting time for all governances. */
  votingDays: 3,
  /** Cool-off after voting on community-vote governances (only Against/veto). */
  communityCoolOffDays: 1,
  /** Community approval: For ≥ this % of total MNDE supply, and For > Against. */
  communityYesThresholdPct: 2,
  /** Voting power required to create a community proposal. */
  communityMinVotesToPropose: 200_000,
  councilSeats: 5,
  /** Council approval threshold (% of council tokens). */
  councilYesThresholdPct: 50,
  /** Council veto threshold on community proposals (% of council tokens). */
  councilVetoThresholdPct: 50,
  /** VSR: lock time remaining at which locked MNDE reaches full voting power. */
  vsrFullPowerLockupDays: 31,
} as const;
