// ISO 20022 / SWIFT standards layer for Pi Bank.
// Simulation only — no real settlement occurs, but the message structures,
// identifiers and validation rules follow the published standards.

import { COUNTRIES, type CountryCode } from "./banking";

// ───────── Institution identity (BIC / national clearing) ─────────

export interface BankIdentity {
  /** SWIFT/BIC of the Pi Bank branch acting for this country (ISO 9362). */
  bic: string;
  /** ISO 3166-1 alpha-2 prefix used by IBANs in this jurisdiction. */
  ibanPrefix: string | null;
  /** Total IBAN length for that prefix (ISO 13616). */
  ibanLength: number | null;
  /** ISO 20022 ClearingSystemIdentification code. */
  clearingSystem: string;
  /** Human label for the national member id. */
  memberIdLabel: string;
  memberId: string;
  /** Correspondent / intermediary used for cross-border legs. */
  correspondentBic: string;
  /** Settlement method used on pacs.008 (ISO 20022 SttlmMtd). */
  settlementMethod: "INDA" | "INGA" | "COVE" | "CLRG";
  /** Typical settlement lag in business days for the cross-border leg. */
  settlementDays: number;
}

export const BANK_IDENTITY: Record<CountryCode, BankIdentity> = {
  US: {
    bic: "PIBKUS33XXX",
    ibanPrefix: null,
    ibanLength: null,
    clearingSystem: "USABA",
    memberIdLabel: "Fedwire ABA routing number",
    memberId: "021000021",
    correspondentBic: "CHASUS33XXX",
    settlementMethod: "CLRG",
    settlementDays: 1,
  },
  GB: {
    bic: "PIBKGB2LXXX",
    ibanPrefix: "GB",
    ibanLength: 22,
    clearingSystem: "GBDSC",
    memberIdLabel: "Sort code",
    memberId: "20-00-00",
    correspondentBic: "BARCGB22XXX",
    settlementMethod: "CLRG",
    settlementDays: 0,
  },
  EU: {
    bic: "PIBKDEFFXXX",
    ibanPrefix: "DE",
    ibanLength: 22,
    clearingSystem: "DEBLZ",
    memberIdLabel: "Bankleitzahl (BLZ)",
    memberId: "50010517",
    correspondentBic: "DEUTDEFFXXX",
    settlementMethod: "INDA",
    settlementDays: 0,
  },
  NG: {
    bic: "PIBKNGLAXXX",
    ibanPrefix: null,
    ibanLength: null,
    clearingSystem: "NGNIP",
    memberIdLabel: "NIBSS institution code",
    memberId: "000014",
    correspondentBic: "CITINGLAXXX",
    settlementMethod: "CLRG",
    settlementDays: 1,
  },
  IN: {
    bic: "PIBKINBBXXX",
    ibanPrefix: null,
    ibanLength: null,
    clearingSystem: "INFSC",
    memberIdLabel: "IFSC",
    memberId: "PIBK0000123",
    correspondentBic: "ICICINBBXXX",
    settlementMethod: "CLRG",
    settlementDays: 1,
  },
  AE: {
    bic: "PIBKAEADXXX",
    ibanPrefix: "AE",
    ibanLength: 23,
    clearingSystem: "AEUAE",
    memberIdLabel: "CBUAE routing code",
    memberId: "302620101",
    correspondentBic: "EBILAEADXXX",
    settlementMethod: "INDA",
    settlementDays: 1,
  },
};

// ───────── ISO 13616 IBAN ─────────

export const IBAN_LENGTHS: Record<string, number> = {
  AE: 23, AT: 20, BE: 16, CH: 21, CY: 28, DE: 22, DK: 18, ES: 24, FI: 18,
  FR: 27, GB: 22, GR: 27, IE: 22, IT: 27, LU: 20, MT: 31, NL: 18, NO: 15,
  PL: 28, PT: 25, SE: 24, SI: 19, SK: 24, TR: 26,
};

function mod97(input: string): number {
  let remainder = 0;
  for (const ch of input) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }
  return remainder;
}

export function normalizeIban(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** Full ISO 13616 check: charset, country length, and mod-97-10 checksum. */
export function validateIban(raw: string): ValidationResult {
  const iban = normalizeIban(raw);
  if (!iban) return { valid: false, reason: "IBAN is required" };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return { valid: false, reason: "Invalid IBAN format (ISO 13616)" };
  }
  const country = iban.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (expected && iban.length !== expected) {
    return { valid: false, reason: `${country} IBANs must be ${expected} characters` };
  }
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  if (mod97(numeric) !== 1) return { valid: false, reason: "IBAN checksum failed (mod-97-10)" };
  return { valid: true };
}

/** ISO 9362 BIC: 4 bank + 2 country + 2 location + optional 3 branch. */
export function validateBic(raw: string): ValidationResult {
  const bic = raw.replace(/\s/g, "").toUpperCase();
  if (!bic) return { valid: false, reason: "BIC is required" };
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
    return { valid: false, reason: "Invalid BIC format (ISO 9362)" };
  }
  return { valid: true };
}

export function bicCountry(bic: string): string {
  return bic.slice(4, 6).toUpperCase();
}

/** National account identifiers where IBAN is not used. */
export function validateNationalAccount(country: CountryCode, value: string): ValidationResult {
  const v = value.replace(/[\s-]/g, "").toUpperCase();
  if (!v) return { valid: false, reason: "Account identifier is required" };
  switch (country) {
    case "US":
      return /^[0-9]{6,17}$/.test(v)
        ? { valid: true }
        : { valid: false, reason: "US account numbers are 6–17 digits" };
    case "NG":
      return /^[0-9]{10}$/.test(v)
        ? { valid: true }
        : { valid: false, reason: "NUBAN account numbers are exactly 10 digits" };
    case "IN":
      return /^[0-9]{9,18}$/.test(v)
        ? { valid: true }
        : { valid: false, reason: "Indian account numbers are 9–18 digits" };
    default:
      return { valid: true };
  }
}

/** Chooses IBAN or national validation based on the destination jurisdiction. */
export function validateAccountIdentifier(country: CountryCode, value: string): ValidationResult {
  return BANK_IDENTITY[country].ibanPrefix
    ? validateIban(value)
    : validateNationalAccount(country, value);
}

// ───────── Identifiers ─────────

/** RFC 4122 v4 UUID used as the SWIFT gpi UETR (unique end-to-end txn reference). */
export function generateUetr(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomRef(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function generateEndToEndId(prefix = "PIB"): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomRef(8)}`;
}

export function generateMessageId(): string {
  return `MSGID${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${randomRef(10)}`;
}

// ───────── ISO 20022 code sets ─────────

export const CHARGE_BEARERS = [
  { code: "SHAR", label: "SHA — shared charges", swift: "SHA" },
  { code: "DEBT", label: "OUR — sender pays all charges", swift: "OUR" },
  { code: "CRED", label: "BEN — beneficiary pays charges", swift: "BEN" },
] as const;

export type ChargeBearer = (typeof CHARGE_BEARERS)[number]["code"];

export const PURPOSE_CODES = [
  { code: "SALA", label: "Salary payment" },
  { code: "SUPP", label: "Supplier payment" },
  { code: "TRAD", label: "Trade settlement" },
  { code: "GDDS", label: "Purchase of goods" },
  { code: "SCVE", label: "Purchase of services" },
  { code: "FAMS", label: "Family maintenance / remittance" },
  { code: "TAXS", label: "Tax payment" },
  { code: "INVS", label: "Investment transfer" },
] as const;

export type PurposeCode = (typeof PURPOSE_CODES)[number]["code"];

/** ISO 20022 message type per rail. */
export function messageTypeForRail(rail: string): { iso: string; mt: string; name: string } {
  const r = rail.toLowerCase();
  if (r.includes("sepa")) return { iso: "pacs.008.001.08", mt: "—", name: "SEPA Credit Transfer" };
  if (r.includes("target2")) return { iso: "pacs.009.001.08", mt: "MT202", name: "TARGET2 RTGS" };
  if (r.includes("swift")) return { iso: "pacs.008.001.08", mt: "MT103", name: "SWIFT customer credit transfer" };
  if (r.includes("wire") || r.includes("rtgs") || r.includes("chaps"))
    return { iso: "pacs.008.001.08", mt: "MT103", name: "RTGS wire" };
  return { iso: "pacs.008.001.08", mt: "—", name: "Domestic credit transfer" };
}

// ───────── Value dating ─────────

export function isBusinessDay(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0 || !isBusinessDay(d)) {
    if (left > 0) left--;
    else break;
    d.setUTCDate(d.getUTCDate() + 1);
    while (!isBusinessDay(d)) d.setUTCDate(d.getUTCDate() + 1);
  }
  while (!isBusinessDay(d)) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ───────── Compliance screening (simulated) ─────────

export interface ScreeningResult {
  status: "clear" | "review" | "blocked";
  checks: { name: string; passed: boolean; detail: string }[];
}

const SANCTIONED_TOKENS = ["ofac", "sdn", "sanction", "denied party"];
const HIGH_RISK_JURISDICTIONS = ["KP", "IR", "SY", "CU"];

export function screenPayment(params: {
  beneficiaryName: string;
  beneficiaryBic?: string;
  amount: number;
  currency: string;
  originCountry: CountryCode;
  destinationCountry: CountryCode;
}): ScreeningResult {
  const origin = COUNTRIES[params.originCountry];
  const nameHit = SANCTIONED_TOKENS.some((t) =>
    params.beneficiaryName.toLowerCase().includes(t),
  );
  const jurisdictionHit = params.beneficiaryBic
    ? HIGH_RISK_JURISDICTIONS.includes(bicCountry(params.beneficiaryBic))
    : false;
  const overThreshold = params.amount >= origin.reportingThreshold;
  const overLimit = params.amount > origin.singleTxnLimit;

  const checks = [
    {
      name: "Sanctions & PEP screening",
      passed: !nameHit,
      detail: nameHit ? "Beneficiary matched a watchlist token" : "No watchlist match",
    },
    {
      name: "Jurisdiction risk (FATF)",
      passed: !jurisdictionHit,
      detail: jurisdictionHit ? "Beneficiary institution in a high-risk jurisdiction" : "Jurisdiction acceptable",
    },
    {
      name: `${origin.centralBank} transaction limit`,
      passed: !overLimit,
      detail: overLimit ? "Above single-transaction limit" : "Within limit",
    },
    {
      name: "Regulatory reporting",
      passed: true,
      detail: overThreshold
        ? `Above reporting threshold — report filed automatically`
        : "Below reporting threshold",
    },
  ];

  const status: ScreeningResult["status"] =
    nameHit || jurisdictionHit ? "blocked" : overLimit ? "review" : "clear";
  return { status, checks };
}

// ───────── Message construction ─────────

export interface PaymentInstruction {
  uetr: string;
  messageId: string;
  endToEndId: string;
  createdAt: string; // ISO datetime
  valueDate: string; // ISO date
  amount: number;
  currency: string;
  instructedAmount?: { amount: number; currency: string };
  exchangeRate?: number;
  chargeBearer: ChargeBearer;
  purpose: PurposeCode;
  remittanceInfo?: string;
  debtor: { name: string; account: string; bic: string; country: CountryCode };
  creditor: { name: string; account: string; bic: string; country: CountryCode };
  intermediaryBic?: string;
  rail: string;
}

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

function acctTag(country: CountryCode, account: string): string {
  return BANK_IDENTITY[country].ibanPrefix
    ? `<Id><IBAN>${xmlEscape(normalizeIban(account))}</IBAN></Id>`
    : `<Id><Othr><Id>${xmlEscape(account)}</Id></Othr></Id>`;
}

/** ISO 20022 pacs.008 FI-to-FI Customer Credit Transfer. */
export function buildPacs008(p: PaymentInstruction): string {
  const sm = BANK_IDENTITY[p.debtor.country].settlementMethod;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${p.messageId}</MsgId>
      <CreDtTm>${p.createdAt}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf><SttlmMtd>${sm}</SttlmMtd></SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>${p.endToEndId}</EndToEndId>
        <UETR>${p.uetr}</UETR>
      </PmtId>
      <PmtTpInf><SvcLvl><Cd>${p.rail.toLowerCase().includes("sepa") ? "SEPA" : "URGP"}</Cd></SvcLvl></PmtTpInf>
      <IntrBkSttlmAmt Ccy="${p.currency}">${p.amount.toFixed(2)}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>${p.valueDate}</IntrBkSttlmDt>${
        p.instructedAmount
          ? `\n      <InstdAmt Ccy="${p.instructedAmount.currency}">${p.instructedAmount.amount.toFixed(2)}</InstdAmt>`
          : ""
      }${p.exchangeRate ? `\n      <XchgRate>${p.exchangeRate.toFixed(6)}</XchgRate>` : ""}
      <ChrgBr>${p.chargeBearer}</ChrgBr>
      <Dbtr><Nm>${xmlEscape(p.debtor.name)}</Nm><PstlAdr><Ctry>${p.debtor.country === "EU" ? "DE" : p.debtor.country}</Ctry></PstlAdr></Dbtr>
      <DbtrAcct>${acctTag(p.debtor.country, p.debtor.account)}</DbtrAcct>
      <DbtrAgt><FinInstnId><BICFI>${p.debtor.bic}</BICFI></FinInstnId></DbtrAgt>${
        p.intermediaryBic
          ? `\n      <IntrmyAgt1><FinInstnId><BICFI>${p.intermediaryBic}</BICFI></FinInstnId></IntrmyAgt1>`
          : ""
      }
      <CdtrAgt><FinInstnId><BICFI>${p.creditor.bic}</BICFI></FinInstnId></CdtrAgt>
      <Cdtr><Nm>${xmlEscape(p.creditor.name)}</Nm><PstlAdr><Ctry>${p.creditor.country === "EU" ? "DE" : p.creditor.country}</Ctry></PstlAdr></Cdtr>
      <CdtrAcct>${acctTag(p.creditor.country, p.creditor.account)}</CdtrAcct>
      <Purp><Cd>${p.purpose}</Cd></Purp>
      <RmtInf><Ustrd>${xmlEscape(p.remittanceInfo ?? "")}</Ustrd></RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
}

/** SWIFT MT103 single customer credit transfer (FIN block format). */
export function buildMt103(p: PaymentInstruction): string {
  const bearer = CHARGE_BEARERS.find((c) => c.code === p.chargeBearer)?.swift ?? "SHA";
  const vd = p.valueDate.slice(2).replace(/-/g, "");
  const amt = p.amount.toFixed(2).replace(".", ",");
  const lines = [
    `{1:F01${p.debtor.bic.slice(0, 8)}A0000000000}`,
    `{2:I103${p.creditor.bic.slice(0, 8)}N}`,
    `{3:{121:${p.uetr}}}`,
    `{4:`,
    `:20:${p.endToEndId.slice(-16)}`,
    `:23B:CRED`,
    `:32A:${vd}${p.currency}${amt}`,
    p.instructedAmount
      ? `:33B:${p.instructedAmount.currency}${p.instructedAmount.amount.toFixed(2).replace(".", ",")}`
      : null,
    `:50K:/${normalizeIban(p.debtor.account)}`,
    p.debtor.name,
    p.intermediaryBic ? `:56A:${p.intermediaryBic}` : null,
    `:57A:${p.creditor.bic}`,
    `:59:/${normalizeIban(p.creditor.account)}`,
    p.creditor.name,
    `:70:${(p.remittanceInfo ?? "").slice(0, 35) || "/ROC/" + p.endToEndId}`,
    `:71A:${bearer}`,
    p.exchangeRate ? `:36:${p.exchangeRate.toFixed(6).replace(".", ",")}` : null,
    `-}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Charges applied to the debtor for a given bearer option. */
export function chargesFor(amount: number, bearer: ChargeBearer, crossBorder: boolean) {
  const base = crossBorder ? +(amount * 0.005 + 2).toFixed(2) : 0;
  const correspondent = crossBorder ? 15 : 0;
  switch (bearer) {
    case "DEBT":
      return { debtorCharges: +(base + correspondent).toFixed(2), beneficiaryDeduction: 0 };
    case "CRED":
      return { debtorCharges: 0, beneficiaryDeduction: +(base + correspondent).toFixed(2) };
    default:
      return { debtorCharges: base, beneficiaryDeduction: correspondent };
  }
}
