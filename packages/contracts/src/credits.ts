import { z } from "zod";

export const CreditsResponseSchema = z
  .object({
    balance: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
  })
  .refine((account) => account.available === account.balance - account.reserved, {
    message: "Available credits must equal balance minus reserved credits",
  });

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
