// Product maths for Pi Bank — lending, deposits, FX, cards and trade finance.
// Simulation only; the formulas follow standard banking practice.

import { convert, type CountryCode } from "./banking";
import { toPi } from "./pi-settlement";

// ───────── Lending ─────────

export interface LoanProduct {
  id: string;
  name: string;
  kind: "pi-collateral" | "personal" | "sme";
  aprMin: number; // %
  aprMax: number;
  minMonths: number;
  maxMonths: number;
  /** Max loan-to-value for collateralised products. */
  maxLtv?: number;
  blurb: string;
}

export const LOAN_PRODUCTS: LoanProduct[] = [
  { id: "pi-collateral", name: "Pi-collateralised loan", kind: "pi-collateral", aprMin: 4.5, aprMax: 6.9, minMonths: 1, maxMonths: 24, maxLtv: 0.5, blurb: "Lock Pi in an on-chain escrow and draw local currency. No credit check; liquidation at 75% LTV." },
  { id: "personal", name: "Personal instalment loan", kind: "personal", aprMin: 9.9, aprMax: 18.9, minMonths: 6, maxMonths: 60, blurb: "Fixed monthly repayments, early settlement without penalty." },
  { id: "sme", name: "SME working-capital loan", kind: "sme", aprMin: 7.5, aprMax: 14.0, minMonths: 3, maxMonths: 36, blurb: "For registered businesses; secured on receivables or Pi." },
];

/** Standard annuity payment. */
export function monthlyPayment(principal: number, aprPct: number, months: number): number {
  const r = aprPct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function totalInterest(principal: number, aprPct: number, months: number): number {
  return monthlyPayment(principal, aprPct, months) * months - principal;
}

/** Indicative APR: shorter tenors and lower LTV price better. */
export function quoteApr(p: LoanProduct, months: number, ltv = 0): number {
  const t = (months - p.minMonths) / Math.max(1, p.maxMonths - p.minMonths);
  const base = p.aprMin + (p.aprMax - p.aprMin) * Math.min(1, Math.max(0, t));
  return +(base + (p.maxLtv ? ltv * 2 : 0)).toFixed(2);
}

export function piCollateralRequired(amount: number, currency: string, ltv: number): number {
  return +(toPi(amount, currency) / ltv).toFixed(4);
}

export function currentLtv(principalOutstanding: number, currency: string, collateralPi: number): number {
  const debtPi = toPi(principalOutstanding, currency);
  return collateralPi > 0 ? debtPi / collateralPi : 0;
}

export const LIQUIDATION_LTV = 0.75;

// ───────── P2P pool ─────────

export const POOL = {
  name: "Pi Liquidity Pool",
  supplyApy: 5.8,
  borrowApr: 7.9,
  utilisation: 0.71,
  totalSuppliedPi: 4_820_000,
  totalBorrowedPi: 3_422_000,
  contract: "GBPIBANKP00LMAINNETSIMULATED000000000000000000000000000",
};

// ───────── Deposits ─────────

export interface DepositTerm { months: number; ratePct: number }

export const DEPOSIT_TERMS: DepositTerm[] = [
  { months: 1, ratePct: 3.1 },
  { months: 3, ratePct: 3.6 },
  { months: 6, ratePct: 4.0 },
  { months: 12, ratePct: 4.6 },
  { months: 24, ratePct: 5.1 },
];

export function depositMaturityValue(principal: number, ratePct: number, months: number): number {
  return principal * Math.pow(1 + ratePct / 100 / 12, months);
}

// ───────── FX ─────────

export const FX_SPREAD_BPS = 35; // 0.35% each side

export function fxQuote(amount: number, from: string, to: string) {
  const mid = convert(1, from, to);
  const rate = mid * (1 - FX_SPREAD_BPS / 10_000);
  const receive = amount * rate;
  return { mid, rate, receive, spreadBps: FX_SPREAD_BPS };
}

export function buildMt300(p: { ref: string; buyCcy: string; buyAmt: number; sellCcy: string; sellAmt: number; rate: number; valueDate: string; bic: string; cptyBic: string }) {
  return [
    "{1:F01" + p.bic + "0000000000}{2:I300" + p.cptyBic + "N}{4:",
    ":15A:", `:20:${p.ref}`, ":22A:NEWT", ":22C:" + p.buyCcy + p.sellCcy + p.valueDate.replace(/-/g, "").slice(2),
    ":15B:", `:30T:${p.valueDate.replace(/-/g, "")}`, `:30V:${p.valueDate.replace(/-/g, "")}`,
    `:36:${p.rate.toFixed(6)}`,
    `:32B:${p.buyCcy}${p.buyAmt.toFixed(2).replace(".", ",")}`, `:57A:${p.bic}`,
    `:33B:${p.sellCcy}${p.sellAmt.toFixed(2).replace(".", ",")}`, `:57A:${p.cptyBic}`,
    "-}",
  ].join("\n");
}

// ───────── Cards ─────────

export type CardNetwork = "Visa" | "Mastercard" | "Pi Pay";

export function generatePan(network: CardNetwork): string {
  const bin = network === "Visa" ? "4" : network === "Mastercard" ? "5" : "9";
  let s = bin + Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("");
  // Luhn check digit
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(s[14 - i]);
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return s + ((10 - (sum % 10)) % 10);
}

export function maskPan(pan: string): string {
  return pan.replace(/(\d{4})(?=\d)/g, "$1 ").replace(/^(\d{4}) (\d{4}) (\d{4})/, "•••• •••• ••••");
}

// ───────── Trade finance ─────────

export type TradeKind = "lc" | "guarantee" | "collection";

export const TRADE_META: Record<TradeKind, { title: string; mt: string; rules: string; feePct: number }> = {
  lc: { title: "Documentary letter of credit", mt: "MT700", rules: "UCP 600", feePct: 0.6 },
  guarantee: { title: "Demand guarantee / standby LC", mt: "MT760", rules: "URDG 758 / ISP98", feePct: 0.45 },
  collection: { title: "Documentary collection", mt: "MT400", rules: "URC 522", feePct: 0.2 },
};

export function tradeFee(amount: number, kind: TradeKind, months: number): number {
  return +(amount * (TRADE_META[kind].feePct / 100) * Math.max(1, months / 3)).toFixed(2);
}

export function buildMt700(p: { ref: string; issueDate: string; expiryDate: string; applicant: string; beneficiary: string; currency: string; amount: number; goods: string; issuingBic: string; advisingBic: string; incoterm: string }) {
  const d = (s: string) => s.replace(/-/g, "").slice(2);
  return [
    "{1:F01" + p.issuingBic + "0000000000}{2:I700" + p.advisingBic + "N}{4:",
    ":27:1/1", ":40A:IRREVOCABLE", `:20:${p.ref}`, `:31C:${d(p.issueDate)}`, ":40E:UCP LATEST VERSION",
    `:31D:${d(p.expiryDate)}${p.beneficiary.slice(0, 20).toUpperCase()}`,
    `:50:${p.applicant.toUpperCase()}`, `:59:${p.beneficiary.toUpperCase()}`,
    `:32B:${p.currency}${p.amount.toFixed(2).replace(".", ",")}`, ":41A:" + p.advisingBic + " BY PAYMENT",
    ":43P:NOT ALLOWED", ":43T:NOT ALLOWED", `:45A:${p.goods.toUpperCase()} ${p.incoterm}`,
    ":46A:SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS\nFULL SET CLEAN ON BOARD BILL OF LADING\nPACKING LIST",
    ":47A:DOCUMENTS TO BE PRESENTED WITHIN 21 DAYS AFTER SHIPMENT", ":71D:ALL CHARGES OUTSIDE ISSUING BANK FOR BENEFICIARY",
    ":48:21/SHIPMENT", ":49:WITHOUT", ":78:UPON RECEIPT OF COMPLYING DOCUMENTS WE SHALL REMIT PROCEEDS AS INSTRUCTED",
    "-}",
  ].join("\n");
}

export function buildMt202(p: { ref: string; relatedRef: string; valueDate: string; currency: string; amount: number; orderingBic: string; beneficiaryBic: string; intermediaryBic?: string; uetr: string }) {
  return [
    "{1:F01" + p.orderingBic + "0000000000}{2:I202" + p.beneficiaryBic + "N}{3:{121:" + p.uetr + "}}{4:",
    `:20:${p.ref}`, `:21:${p.relatedRef}`,
    `:32A:${p.valueDate.replace(/-/g, "").slice(2)}${p.currency}${p.amount.toFixed(2).replace(".", ",")}`,
    `:52A:${p.orderingBic}`,
    ...(p.intermediaryBic ? [`:56A:${p.intermediaryBic}`] : []),
    `:58A:${p.beneficiaryBic}`, ":72:/INS/" + p.orderingBic,
    "-}",
  ].join("\n");
}

export function buildMt940(p: { account: string; currency: string; statementNo: number; opening: number; lines: { date: string; amount: number; ref: string; desc: string }[] }) {
  const d = (s: string) => s.replace(/-/g, "").slice(2);
  const fmt = (n: number) => Math.abs(n).toFixed(2).replace(".", ",");
  let bal = p.opening;
  const out = [`:20:PIBSTMT${p.statementNo}`, `:25:${p.account}`, `:28C:${p.statementNo}/1`,
    `:60F:${p.opening < 0 ? "D" : "C"}${d(p.lines[0]?.date ?? new Date().toISOString().slice(0, 10))}${p.currency}${fmt(p.opening)}`];
  for (const l of p.lines) {
    bal += l.amount;
    out.push(`:61:${d(l.date)}${l.amount < 0 ? "D" : "C"}${fmt(l.amount)}NTRF${l.ref}`, `:86:${l.desc}`);
  }
  out.push(`:62F:${bal < 0 ? "D" : "C"}${d(p.lines.at(-1)?.date ?? new Date().toISOString().slice(0, 10))}${p.currency}${fmt(bal)}`);
  return out.join("\n");
}

// ───────── gpi tracker ─────────

export interface GpiHop { bic: string; role: string; status: string; at: string; charge?: number }

export function simulateGpiTrack(uetr: string, originBic: string, correspondentBic: string, beneficiaryBic: string): GpiHop[] {
  const seed = uetr.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = Date.now() - 3 * 3600_000;
  const at = (h: number) => new Date(base + h * 3600_000 * ((seed % 3) + 1)).toISOString().replace("T", " ").slice(0, 16);
  return [
    { bic: originBic, role: "Instructing agent", status: "ACSP · sent", at: at(0), charge: 0 },
    { bic: correspondentBic, role: "Intermediary", status: "ACSP · in progress", at: at(0.6), charge: 12 },
    { bic: beneficiaryBic, role: "Creditor agent", status: seed % 2 ? "ACCC · credited" : "ACSP · pending credit", at: at(1.4), charge: seed % 2 ? 8 : undefined },
  ];
}

export const NOSTRO: { country: CountryCode; correspondent: string; currency: string; balance: number }[] = [
  { country: "US", correspondent: "CHASUS33XXX", currency: "USD", balance: 12_400_000 },
  { country: "GB", correspondent: "BARCGB22XXX", currency: "GBP", balance: 4_950_000 },
  { country: "EU", correspondent: "DEUTDEFFXXX", currency: "EUR", balance: 8_100_000 },
  { country: "NG", correspondent: "CITINGLAXXX", currency: "NGN", balance: 6_200_000_000 },
  { country: "IN", correspondent: "ICICINBBXXX", currency: "INR", balance: 910_000_000 },
  { country: "AE", correspondent: "EBILAEADXXX", currency: "AED", balance: 22_000_000 },
];

// ───────── Digital assets ─────────

export interface DigitalAsset { symbol: string; name: string; kind: "native" | "tokenised-deposit" | "cbdc"; network: string; blurb: string; priceUsd: number }

export const DIGITAL_ASSETS: DigitalAsset[] = [
  { symbol: "PI", name: "Pi", kind: "native", network: "Pi Mainnet (Stellar-based SCP)", blurb: "Native settlement asset for every Pi Bank operation.", priceUsd: 25 },
  { symbol: "tUSD", name: "Tokenised USD deposit", kind: "tokenised-deposit", network: "Pi Mainnet · bank-issued", blurb: "1:1 claim on a Pi Bank USD deposit, transferable on-chain.", priceUsd: 1 },
  { symbol: "tEUR", name: "Tokenised EUR deposit", kind: "tokenised-deposit", network: "Pi Mainnet · bank-issued", blurb: "1:1 claim on a Pi Bank EUR deposit.", priceUsd: 1 / 0.92 },
  { symbol: "e₦", name: "eNaira", kind: "cbdc", network: "CBN eNaira (Hyperledger Fabric)", blurb: "Central Bank of Nigeria digital currency, bridged for on/off-ramp.", priceUsd: 1 / 1580 },
  { symbol: "e₹", name: "Digital Rupee", kind: "cbdc", network: "RBI e₹ pilot", blurb: "Reserve Bank of India retail CBDC, bridged for on/off-ramp.", priceUsd: 1 / 83.2 },
  { symbol: "dAED", name: "Digital Dirham", kind: "cbdc", network: "CBUAE mBridge", blurb: "Cross-border CBDC via Project mBridge.", priceUsd: 1 / 3.67 },
];
