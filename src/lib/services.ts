// Full service catalogue for Pi Bank — traditional retail & corporate banking,
// SWIFT / correspondent-banking services, and Pi-ecosystem blockchain services.
// Every service is settled in Pi (π); fiat is the presentation currency.

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight, Receipt, Banknote, Smartphone, Globe2, Sparkles, Landmark, PiggyBank,
  CreditCard, HandCoins, FileText, Repeat, Coins, ScrollText, ShieldCheck, Building2,
  Layers, Network, CalendarClock, Vault,
} from "lucide-react";

export type ServiceGroup =
  | "Everyday banking"
  | "Savings & deposits"
  | "Lending & credit"
  | "Cards"
  | "Treasury & FX"
  | "SWIFT & correspondent banking"
  | "Trade finance"
  | "Pi ecosystem & digital assets";

export interface Service {
  id: string;
  group: ServiceGroup;
  title: string;
  blurb: string;
  to: string;
  icon: LucideIcon;
  tint: string;
  /** SWIFT MT / ISO 20022 messages this service produces or consumes. */
  messages?: string[];
}

export const SERVICES: Service[] = [
  // Everyday
  { id: "transfer", group: "Everyday banking", title: "Domestic transfer", blurb: "Instant & scheduled payments on the local clearing rail.", to: "/transfer", icon: ArrowLeftRight, tint: "bg-pi/15 text-pi", messages: ["pacs.008", "pain.001"] },
  { id: "bills", group: "Everyday banking", title: "Bill payments", blurb: "Electricity, water, gas, internet, TV and tax.", to: "/bills", icon: Receipt, tint: "bg-sunrise/20 text-sunrise-foreground" },
  { id: "cash", group: "Everyday banking", title: "Cash deposit & withdrawal", blurb: "Branch, ATM and agent cash-in / cash-out with CTR reporting.", to: "/cash", icon: Banknote, tint: "bg-mint/20 text-mint-foreground", messages: ["camt.053"] },
  { id: "topup", group: "Everyday banking", title: "Mobile top-up", blurb: "Prepaid airtime and data across national carriers.", to: "/topup", icon: Smartphone, tint: "bg-aqua/20 text-aqua-foreground" },
  { id: "standing", group: "Everyday banking", title: "Standing orders & direct debits", blurb: "Recurring credits and mandate-based debits.", to: "/treasury", icon: CalendarClock, tint: "bg-coral/15 text-coral", messages: ["pain.008", "pain.001"] },
  { id: "statements", group: "Everyday banking", title: "Statements & reporting", blurb: "MT940 / camt.053 end-of-day statements.", to: "/treasury", icon: FileText, tint: "bg-pi/15 text-pi", messages: ["MT940", "camt.053"] },

  // Savings
  { id: "term", group: "Savings & deposits", title: "Term deposits", blurb: "Fixed-rate deposits from 1 to 24 months, paid in Pi.", to: "/deposits", icon: Vault, tint: "bg-mint/20 text-mint-foreground" },
  { id: "goals", group: "Savings & deposits", title: "Savings goals", blurb: "Round-ups and auto-save toward a target.", to: "/deposits", icon: PiggyBank, tint: "bg-sunrise/20 text-sunrise-foreground" },

  // Lending
  { id: "pi-loan", group: "Lending & credit", title: "Pi-collateralised loan", blurb: "Borrow local currency against Pi locked in an on-chain escrow.", to: "/lending", icon: HandCoins, tint: "bg-pi/15 text-pi" },
  { id: "p2p", group: "Lending & credit", title: "P2P lending pool", blurb: "Supply Pi to a blockchain liquidity pool and earn yield.", to: "/lending", icon: Layers, tint: "bg-aqua/20 text-aqua-foreground" },
  { id: "personal", group: "Lending & credit", title: "Personal & SME loans", blurb: "Amortising instalment loans under central-bank caps.", to: "/lending", icon: Building2, tint: "bg-coral/15 text-coral" },

  // Cards
  { id: "cards", group: "Cards", title: "Debit & virtual cards", blurb: "Issue, freeze, set limits and view card controls.", to: "/cards", icon: CreditCard, tint: "bg-pi/15 text-pi" },

  // Treasury
  { id: "fx", group: "Treasury & FX", title: "Foreign exchange", blurb: "Spot conversion between currencies and Pi with MT300 confirmation.", to: "/fx", icon: Repeat, tint: "bg-sunrise/20 text-sunrise-foreground", messages: ["MT300"] },
  { id: "multi", group: "Treasury & FX", title: "Multi-currency accounts", blurb: "Hold and move USD, GBP, EUR, NGN, INR, AED and Pi.", to: "/more", icon: Coins, tint: "bg-mint/20 text-mint-foreground" },

  // SWIFT
  { id: "mt103", group: "SWIFT & correspondent banking", title: "Customer credit transfer", blurb: "MT103 / pacs.008 cross-border payments with UETR.", to: "/international", icon: Globe2, tint: "bg-coral/15 text-coral", messages: ["MT103", "pacs.008"] },
  { id: "mt202", group: "SWIFT & correspondent banking", title: "Bank-to-bank transfer", blurb: "MT202 / pacs.009 financial-institution transfers and COV.", to: "/treasury", icon: Network, tint: "bg-pi/15 text-pi", messages: ["MT202", "MT202 COV", "pacs.009"] },
  { id: "gpi", group: "SWIFT & correspondent banking", title: "SWIFT gpi tracker", blurb: "Track any payment end-to-end by UETR.", to: "/treasury", icon: ShieldCheck, tint: "bg-aqua/20 text-aqua-foreground", messages: ["gpi Tracker", "MT199"] },
  { id: "nostro", group: "SWIFT & correspondent banking", title: "Nostro / vostro accounts", blurb: "Correspondent balances and MT950 reconciliation.", to: "/treasury", icon: Landmark, tint: "bg-mint/20 text-mint-foreground", messages: ["MT950", "camt.052"] },

  // Trade finance
  { id: "lc", group: "Trade finance", title: "Letter of credit", blurb: "Documentary credits under UCP 600 (MT700).", to: "/trade-finance", icon: ScrollText, tint: "bg-sunrise/20 text-sunrise-foreground", messages: ["MT700", "MT707"] },
  { id: "guarantee", group: "Trade finance", title: "Bank guarantee", blurb: "Demand guarantees & standby LCs (MT760, URDG 758).", to: "/trade-finance", icon: ShieldCheck, tint: "bg-coral/15 text-coral", messages: ["MT760"] },
  { id: "collection", group: "Trade finance", title: "Documentary collection", blurb: "D/P and D/A collections under URC 522 (MT400).", to: "/trade-finance", icon: FileText, tint: "bg-pi/15 text-pi", messages: ["MT400", "MT410"] },

  // Pi ecosystem
  { id: "pi-wallet", group: "Pi ecosystem & digital assets", title: "Pi Wallet", blurb: "Linked Pi Ecosystem Wallet, payments and mainnet balance.", to: "/pi", icon: Sparkles, tint: "bg-pi/15 text-pi" },
  { id: "assets", group: "Pi ecosystem & digital assets", title: "Digital assets", blurb: "Pi, tokenised deposits and CBDC rails side by side.", to: "/assets", icon: Coins, tint: "bg-aqua/20 text-aqua-foreground" },
];

export const SERVICE_GROUPS = Array.from(new Set(SERVICES.map((s) => s.group))) as ServiceGroup[];
