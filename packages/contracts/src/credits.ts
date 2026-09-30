import { z } from "zod";

export const CreditsResponseSchema = z
  .object({
    balance: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
  })
  .refine(
    (account) => account.available === account.balance - account.reserved,
    {
      message: "Available credits must equal balance minus reserved credits",
    },
  );

export const CreditLedgerEntrySchema = z.object({
  id: z.uuid(),
  kind: z.enum([
    "grant",
    "reservation",
    "commit",
    "release",
    "purchase",
    "adjustment",
  ]),
  balanceDelta: z.number().int(),
  reservedDelta: z.number().int(),
  description: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const CreditLedgerSchema = z.object({
  entries: z.array(CreditLedgerEntrySchema),
});

export type CreditsResponse = z.infer<typeof CreditsResponseSchema>;
export type CreditLedger = z.infer<typeof CreditLedgerSchema>;
export type CreditLedgerEntry = z.infer<typeof CreditLedgerEntrySchema>;

/**
 * Bible §12.3 "Permettre un plafond par génération": an optional, per
 * workspace ceiling on how many credits a single generation reservation
 * may claim. `spendCap: null` means no cap is configured.
 */
export const UpdateCreditSpendCapSchema = z.object({
  spendCap: z.number().int().positive().nullable(),
});

/**
 * `maxOperationCost` rides along on every read so clients can explain the
 * cap (and warn about low balances) relative to the most expensive
 * generation currently offered, without hard-coding that number. See
 * `maxCreditCost` in apps/api/src/modules/credits/credits.service.ts.
 */
export const CreditSpendCapSchema = UpdateCreditSpendCapSchema.extend({
  maxOperationCost: z.number().int().positive(),
});

export type UpdateCreditSpendCapInput = z.infer<
  typeof UpdateCreditSpendCapSchema
>;
export type CreditSpendCap = z.infer<typeof CreditSpendCapSchema>;
