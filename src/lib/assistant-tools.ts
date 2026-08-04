// Shared tool schemas for the Pi Assistant.
// Tools are declared on the server WITHOUT `execute`, and executed in the
// browser against the local banking store (the ledger lives client-side).

import { z } from "zod";

export const COUNTRY_CODES = ["US", "GB", "EU", "NG", "IN", "AE"] as const;

export const assistantToolSchemas = {
  get_overview: z.object({}),
  get_transactions: z.object({
    accountId: z.string().nullable().describe("Filter to one account id, or null for all."),
    limit: z.number().int().nullable().describe("How many to return, default 10."),
  }),
  get_country_info: z.object({
    country: z.enum(COUNTRY_CODES).describe("Country module to describe."),
  }),
  switch_country: z.object({
    country: z.enum(COUNTRY_CODES),
  }),
  transfer_funds: z.object({
    fromAccountId: z.string().describe("Source account id from get_overview."),
    toAccountId: z.string().nullable().describe("Destination account id for internal moves."),
    beneficiary: z.string().nullable().describe("External beneficiary name, if not internal."),
    amount: z.number().positive(),
    note: z.string().nullable(),
  }),
  pay_bill: z.object({
    accountId: z.string(),
    billerId: z.string().describe("Biller id from get_country_info."),
    amount: z.number().positive(),
  }),
  topup_mobile: z.object({
    accountId: z.string(),
    phone: z.string(),
    amount: z.number().positive(),
  }),
  cash_movement: z.object({
    accountId: z.string(),
    direction: z.enum(["deposit", "withdraw"]),
    amount: z.number().positive(),
  }),
  open_page: z.object({
    path: z
      .enum(["/", "/transfer", "/bills", "/cash", "/topup", "/international", "/pi", "/more", "/guide", "/settings"])
      .describe("App route to open for the user."),
  }),
} as const;

export type AssistantToolName = keyof typeof assistantToolSchemas;
