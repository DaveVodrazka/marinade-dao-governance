import { InstructionExecutionStatus } from "@solana/spl-governance";
import { PublicKey } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { decodeInstruction, normalizeProposalTransactions } from "./instructions";

const UNKNOWN_PROGRAM = "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const MARINADE = "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD";

function tx(programId: string, data: Buffer) {
  return {
    pubkey: new PublicKey("48oLbxUVdn6rEG2qA7K6zwTPxFy8JtkXcyjw8313ozUc"),
    owner: new PublicKey("GovMaiHfpVPw8BAM1mbdzgmSZYDw2tdP32J2fapoQoYs"),
    account: {
      optionIndex: 0,
      instructionIndex: 0,
      holdUpTime: 0,
      executionStatus: InstructionExecutionStatus.None,
      executedAt: null,
      instructions: [
        {
          programId: new PublicKey(programId),
          accounts: [
            { pubkey: new PublicKey("899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo"), isWritable: true, isSigner: false },
            { pubkey: new PublicKey(MARINADE), isWritable: false, isSigner: true },
          ],
          data: new Uint8Array(data),
        },
      ],
    },
  } as never;
}

describe("instructions", () => {
  it("renders unknown programs without decoding or guessing", () => {
    const [ix] = normalizeProposalTransactions([tx(UNKNOWN_PROGRAM, Buffer.from([1, 2, 3]))]);
    expect(ix.programId).toBe(UNKNOWN_PROGRAM);
    expect(ix.programName).toBeUndefined();
    expect(ix.decoded).toBeUndefined();
    expect(ix.dataHex).toBe("010203");
    expect(ix.data).toBe("AQID");
    expect(ix.accounts).toEqual([
      { address: "899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo", writable: true, signer: false, label: "Marinade DAO Realm" },
      { address: MARINADE, writable: false, signer: true, label: "Marinade Liquid Staking" },
    ]);
    expect(ix.executionStatus).toBe("not_executed");
  });

  it("decodes SPL Token transfers", () => {
    const data = Buffer.alloc(9);
    data[0] = 3;
    data.writeBigUInt64LE(1_000_000_000n, 1);
    expect(decodeInstruction(TOKEN, data)).toMatchObject({ type: "Transfer", fields: { amount: "1000000000" }, programName: "SPL Token" });
  });

  it("decodes known Anchor instructions by discriminator", () => {
    const disc = createHash("sha256").update("global:config_lp").digest().subarray(0, 8);
    expect(decodeInstruction(MARINADE, Buffer.concat([disc, Buffer.from([1])]))?.type).toBe("ConfigLp");
  });

  it("returns undefined on malformed data instead of throwing", () => {
    expect(decodeInstruction(TOKEN, Buffer.from([3]))).toBeUndefined();
    expect(decodeInstruction(MARINADE, Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]))).toBeUndefined();
  });
});
