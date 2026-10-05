import { createHash } from "node:crypto";

import {
  GovernanceInstruction as SplGovernanceInstructionKind,
  InstructionExecutionStatus,
  type ProposalTransaction,
  type ProgramAccount,
} from "@solana/spl-governance";
import bs58 from "bs58";

import {
  KNOWN_ACCOUNTS,
  KNOWN_PROGRAMS,
  MARINADE_GOVERNANCE_PROGRAM_ID,
  MARINADE_VSR_PROGRAM_ID,
} from "@/config/marinade";
import type {
  DecodedInstruction,
  GovernanceInstruction,
  InstructionExecutionStatus as DomainExecutionStatus,
} from "./types";

/**
 * Normalization and best-effort decoding of proposal instructions.
 *
 * Decoders only claim what they can verify from the bytes: instruction
 * discriminators and fixed-layout numeric arguments. Anything else is left
 * undecoded and shown raw. Never guess.
 */

export function getProgramName(programId: string): string | undefined {
  return KNOWN_PROGRAMS[programId]?.name;
}

export function getAccountLabel(address: string): string | undefined {
  return KNOWN_ACCOUNTS[address] ?? KNOWN_PROGRAMS[address]?.name;
}

// ---------------------------------------------------------------------------
// Byte helpers (bounds-checked; throw on short data)

function u8(data: Buffer, offset: number): number {
  if (data.length < offset + 1) throw new RangeError("data too short");
  return data.readUInt8(offset);
}
function u32(data: Buffer, offset: number): number {
  if (data.length < offset + 4) throw new RangeError("data too short");
  return data.readUInt32LE(offset);
}
function u64(data: Buffer, offset: number): string {
  if (data.length < offset + 8) throw new RangeError("data too short");
  return data.readBigUInt64LE(offset).toString();
}

// ---------------------------------------------------------------------------
// Native / SPL program decoders

type Decoder = (data: Buffer) => DecodedInstruction | undefined;

const SPL_TOKEN_DECODER: Decoder = (data): DecodedInstruction | undefined => {
  const tag = u8(data, 0);
  switch (tag) {
    case 3:
      return { type: "Transfer", fields: { amount: u64(data, 1) } };
    case 4:
      return { type: "Approve", fields: { amount: u64(data, 1) } };
    case 5:
      return { type: "Revoke" };
    case 6:
      return {
        type: "SetAuthority",
        fields: {
          authorityType: String(u8(data, 1)),
          newAuthority:
            u8(data, 2) === 1 ? bs58.encode(data.subarray(3, 35)) : "none",
        },
      };
    case 7:
      return { type: "MintTo", fields: { amount: u64(data, 1) } };
    case 8:
      return { type: "Burn", fields: { amount: u64(data, 1) } };
    case 9:
      return { type: "CloseAccount" };
    case 12:
      return {
        type: "TransferChecked",
        fields: { amount: u64(data, 1), decimals: String(u8(data, 9)) },
      };
    case 14:
      return {
        type: "MintToChecked",
        fields: { amount: u64(data, 1), decimals: String(u8(data, 9)) },
      };
    case 15:
      return {
        type: "BurnChecked",
        fields: { amount: u64(data, 1), decimals: String(u8(data, 9)) },
      };
    default:
      return undefined;
  }
};

const SYSTEM_DECODER: Decoder = (data) => {
  const tag = u32(data, 0);
  if (tag === 2) {
    return { type: "Transfer", fields: { lamports: u64(data, 4) } };
  }
  return undefined;
};

const BPF_UPGRADEABLE_LOADER_DECODER: Decoder = (data) => {
  const names: Record<number, string> = {
    0: "InitializeBuffer",
    1: "Write",
    2: "DeployWithMaxDataLen",
    3: "Upgrade",
    4: "SetAuthority",
    5: "Close",
    6: "ExtendProgram",
    7: "SetAuthorityChecked",
  };
  const name = names[u32(data, 0)];
  if (!name) return undefined;
  const summaries: Record<string, string> = {
    Upgrade: "Upgrade program from a buffer account",
    SetAuthority: "Change upgrade or buffer authority",
    SetAuthorityChecked: "Change upgrade or buffer authority",
    Close: "Close a program, buffer or program-data account",
    ExtendProgram: "Extend program data account",
  };
  return { type: name, summary: summaries[name] };
};

const SPL_GOVERNANCE_DECODER: Decoder = (data) => {
  const name = SplGovernanceInstructionKind[u8(data, 0)];
  return name ? { type: name } : undefined;
};

// ---------------------------------------------------------------------------
// Anchor programs: match the 8-byte discriminator sha256("global:<name>")[0..8]
// against instruction names of known Marinade programs. A wrong name can never
// produce a false match; it simply won't decode.

/** Anchor IDL management instructions share this 8-byte tag. */
const ANCHOR_IDL_TAG = "40f4bc78a7e9690a";
const ANCHOR_IDL_OPS: Record<number, string> = {
  0: "Create",
  1: "CreateBuffer",
  2: "Write",
  3: "SetBuffer",
  4: "SetAuthority",
  5: "Close",
  6: "Resize",
};

const ANCHOR_INSTRUCTION_NAMES: Record<string, string[]> = {
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: [
    "initialize",
    "change_authority",
    "add_validator",
    "remove_validator",
    "set_validator_score",
    "config_validator_system",
    "deposit",
    "deposit_stake_account",
    "liquid_unstake",
    "add_liquidity",
    "remove_liquidity",
    "config_lp",
    "config_marinade",
    "order_unstake",
    "claim",
    "stake_reserve",
    "update_active",
    "update_deactivated",
    "deactivate_stake",
    "emergency_unstake",
    "partial_unstake",
    "merge_stakes",
    "redelegate",
    "pause",
    "resume",
    "withdraw_stake_account",
    "realloc_validator_list",
    "realloc_stake_list",
  ],
  vBoNdEvzMrSai7is21XgVYik65mqtaKXuSdMBJ1xkW4: [
    "init_config",
    "configure_config",
    "init_bond",
    "configure_bond",
    "configure_bond_with_mint",
    "mint_bond",
    "fund_bond",
    "init_withdraw_request",
    "cancel_withdraw_request",
    "claim_withdraw_request",
    "init_settlement",
    "upsize_settlement_claims",
    "cancel_settlement",
    "fund_settlement",
    "close_settlement_v2",
    "claim_settlement_v2",
    "merge_stake",
    "reset_stake",
    "withdraw_stake",
    "emergency_pause",
    "emergency_resume",
  ],
  [MARINADE_VSR_PROGRAM_ID]: [
    "create_registrar",
    "configure_voting_mint",
    "create_voter",
    "create_deposit_entry",
    "deposit",
    "withdraw",
    "grant",
    "clawback",
    "close_deposit_entry",
    "reset_lockup",
    "internal_transfer_locked",
    "internal_transfer_unlocked",
    "update_voter_weight_record",
    "update_max_vote_weight",
    "close_voter",
    "log_voter_info",
    "set_time_offset",
  ],
  dstK1PDHNoKN9MdmftRzsEbXP5T1FTBiQBm1Ee3meVd: [
    "init_vote",
    "vote",
    "init_root",
    "update_root",
  ],
};

function anchorDiscriminator(name: string): string {
  return createHash("sha256")
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8)
    .toString("hex");
}

const ANCHOR_DISCRIMINATORS: Record<string, Map<string, string>> =
  Object.fromEntries(
    Object.entries(ANCHOR_INSTRUCTION_NAMES).map(([programId, names]) => [
      programId,
      new Map(names.map((n) => [anchorDiscriminator(n), n])),
    ]),
  );

function toPascal(snake: string): string {
  return snake.replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());
}

function decodeAnchor(
  programId: string,
  data: Buffer,
): DecodedInstruction | undefined {
  if (data.length < 8) return undefined;
  const disc = data.subarray(0, 8).toString("hex");
  if (disc === ANCHOR_IDL_TAG) {
    const op = ANCHOR_IDL_OPS[u8(data, 8)];
    return op
      ? { type: `IdlInstruction::${op}`, summary: `Anchor IDL account: ${op}` }
      : undefined;
  }
  const name = ANCHOR_DISCRIMINATORS[programId]?.get(disc);
  return name ? { type: toPascal(name) } : undefined;
}

const DECODERS: Record<string, Decoder> = {
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: SPL_TOKEN_DECODER,
  "11111111111111111111111111111111": SYSTEM_DECODER,
  BPFLoaderUpgradeab1e11111111111111111111111: BPF_UPGRADEABLE_LOADER_DECODER,
  [MARINADE_GOVERNANCE_PROGRAM_ID]: SPL_GOVERNANCE_DECODER,
  GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw: SPL_GOVERNANCE_DECODER,
};

/**
 * Decode an instruction if its program is known and its layout recognized.
 * Returns undefined for unknown programs or unrecognized data; never throws.
 */
export function decodeInstruction(
  programId: string,
  data: Buffer,
): DecodedInstruction | undefined {
  try {
    const decoder = DECODERS[programId];
    const decoded = decoder ? decoder(data) : decodeAnchor(programId, data);
    if (!decoded) return undefined;
    return { ...decoded, programName: getProgramName(programId) };
  } catch {
    return undefined;
  }
}

const EXECUTION_STATUS: Record<number, DomainExecutionStatus> = {
  [InstructionExecutionStatus.None]: "not_executed",
  [InstructionExecutionStatus.Success]: "success",
  [InstructionExecutionStatus.Error]: "error",
};

/**
 * Flatten ProposalTransaction accounts into ordered instructions.
 * Order: option index, then transaction index, then position in transaction.
 */
export function normalizeProposalTransactions(
  transactions: ProgramAccount<ProposalTransaction>[],
): GovernanceInstruction[] {
  const sorted = [...transactions].sort(
    (a, b) =>
      a.account.optionIndex - b.account.optionIndex ||
      a.account.instructionIndex - b.account.instructionIndex,
  );
  const result: GovernanceInstruction[] = [];
  for (const tx of sorted) {
    const t = tx.account;
    const executedAtSeconds = t.executedAt ? Number(t.executedAt.toString()) : 0;
    // V1 accounts store a single `instruction`; V2 store `instructions`.
    const instructions = t.instructions?.length
      ? t.instructions
      : t.instruction
        ? [t.instruction]
        : [];
    instructions.forEach((ix, position) => {
      const programId = ix.programId.toBase58();
      const data = Buffer.from(ix.data);
      result.push({
        index: result.length,
        transactionAddress: tx.pubkey.toBase58(),
        optionIndex: t.optionIndex,
        transactionIndex: t.instructionIndex,
        instructionIndex: position,
        programId,
        programName: getProgramName(programId),
        accounts: ix.accounts.map((a) => {
          const address = a.pubkey.toBase58();
          return {
            address,
            writable: a.isWritable,
            signer: a.isSigner,
            label: getAccountLabel(address),
          };
        }),
        data: data.toString("base64"),
        dataHex: data.toString("hex"),
        decoded: decodeInstruction(programId, data),
        executionStatus: EXECUTION_STATUS[t.executionStatus] ?? "not_executed",
        executedAt:
          executedAtSeconds > 0 ? new Date(executedAtSeconds * 1000) : undefined,
        holdUpTimeSeconds: t.holdUpTime,
      });
    });
  }
  return result;
}
