import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACCOUNTS, TXNS, type Account, type Txn, type CountryCode } from "./banking";

// ───────── Product records ─────────

export interface Loan {
  id: string;
  productId: string;
  accountId: string;
  currency: string;
  principal: number;
  outstanding: number;
  aprPct: number;
  months: number;
  monthly: number;
  collateralPi: number;
  escrowTx?: string;
  openedAt: string;
  status: "active" | "repaid" | "liquidated";
}

export interface PoolPosition { suppliedPi: number; since: string }

export interface Deposit {
  id: string;
  accountId: string;
  currency: string;
  principal: number;
  ratePct: number;
  months: number;
  openedAt: string;
  maturesAt: string;
  maturityValue: number;
  kind: "term" | "goal";
  goalName?: string;
  status: "open" | "matured" | "closed";
}

export interface Card {
  id: string;
  accountId: string;
  network: "Visa" | "Mastercard" | "Pi Pay";
  form: "virtual" | "physical";
  pan: string;
  expiry: string;
  holder: string;
  frozen: boolean;
  dailyLimit: number;
  onlineEnabled: boolean;
  contactlessEnabled: boolean;
  abroadEnabled: boolean;
}

export interface StandingOrder {
  id: string;
  accountId: string;
  beneficiary: string;
  amount: number;
  currency: string;
  frequency: "weekly" | "monthly" | "quarterly";
  nextRun: string;
  kind: "standing-order" | "direct-debit";
  mandateRef: string;
  active: boolean;
}

export interface TradeInstrument {
  id: string;
  kind: "lc" | "guarantee" | "collection";
  ref: string;
  applicant: string;
  beneficiary: string;
  currency: string;
  amount: number;
  fee: number;
  issueDate: string;
  expiryDate: string;
  advisingBic: string;
  goods: string;
  incoterm: string;
  status: "issued" | "advised" | "documents-presented" | "paid" | "expired";
  swift: string;
}

export interface SwiftMessage {
  id: string;
  type: string; // MT202, MT300, MT700, ...
  ref: string;
  uetr?: string;
  counterparty: string;
  currency: string;
  amount: number;
  createdAt: string;
  body: string;
}

interface BankState {
  activeCountry: CountryCode;
  accounts: Account[];
  txns: Txn[];
  loans: Loan[];
  pool: PoolPosition;
  deposits: Deposit[];
  cards: Card[];
  standingOrders: StandingOrder[];
  trade: TradeInstrument[];
  swift: SwiftMessage[];
  setActiveCountry: (c: CountryCode) => void;
  addTxn: (t: Omit<Txn, "id" | "date" | "status"> & { status?: Txn["status"] }) => void;
  adjustBalance: (accountId: string, delta: number) => void;
  addLoan: (l: Loan) => void;
  updateLoan: (id: string, patch: Partial<Loan>) => void;
  setPool: (p: PoolPosition) => void;
  addDeposit: (d: Deposit) => void;
  updateDeposit: (id: string, patch: Partial<Deposit>) => void;
  addCard: (c: Card) => void;
  updateCard: (id: string, patch: Partial<Card>) => void;
  addStandingOrder: (s: StandingOrder) => void;
  updateStandingOrder: (id: string, patch: Partial<StandingOrder>) => void;
  addTrade: (t: TradeInstrument) => void;
  updateTrade: (id: string, patch: Partial<TradeInstrument>) => void;
  addSwift: (m: SwiftMessage) => void;
}

const patchIn = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const useBank = create<BankState>()(
  persist(
    (set) => ({
      activeCountry: "US",
      accounts: ACCOUNTS,
      txns: TXNS,
      loans: [],
      pool: { suppliedPi: 0, since: "" },
      deposits: [],
      cards: [
        {
          id: "c-1", accountId: "a-us-chk", network: "Visa", form: "physical", pan: "4539123456781234",
          expiry: "09/29", holder: "ALEX CITIZEN", frozen: false, dailyLimit: 2_500,
          onlineEnabled: true, contactlessEnabled: true, abroadEnabled: false,
        },
      ],
      standingOrders: [
        {
          id: "so-1", accountId: "a-us-chk", beneficiary: "Riverside Apartments LLC", amount: 1_850, currency: "USD",
          frequency: "monthly", nextRun: "2026-10-01", kind: "standing-order", mandateRef: "PIB-SO-000001", active: true,
        },
        {
          id: "dd-1", accountId: "a-us-chk", beneficiary: "Con Edison", amount: 132.4, currency: "USD",
          frequency: "monthly", nextRun: "2026-09-21", kind: "direct-debit", mandateRef: "PIB-DD-000014", active: true,
        },
      ],
      trade: [],
      swift: [],
      setActiveCountry: (c) => set({ activeCountry: c }),
      addTxn: (t) =>
        set((s) => ({
          txns: [
            {
              id: `t-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              status: t.status ?? "completed",
              ...t,
            } as Txn,
            ...s.txns,
          ],
        })),
      adjustBalance: (accountId, delta) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === accountId ? { ...a, balance: +(a.balance + delta).toFixed(2) } : a,
          ),
        })),
      addLoan: (l) => set((s) => ({ loans: [l, ...s.loans] })),
      updateLoan: (id, patch) => set((s) => ({ loans: patchIn(s.loans, id, patch) })),
      setPool: (pool) => set({ pool }),
      addDeposit: (d) => set((s) => ({ deposits: [d, ...s.deposits] })),
      updateDeposit: (id, patch) => set((s) => ({ deposits: patchIn(s.deposits, id, patch) })),
      addCard: (c) => set((s) => ({ cards: [c, ...s.cards] })),
      updateCard: (id, patch) => set((s) => ({ cards: patchIn(s.cards, id, patch) })),
      addStandingOrder: (so) => set((s) => ({ standingOrders: [so, ...s.standingOrders] })),
      updateStandingOrder: (id, patch) => set((s) => ({ standingOrders: patchIn(s.standingOrders, id, patch) })),
      addTrade: (t) => set((s) => ({ trade: [t, ...s.trade] })),
      updateTrade: (id, patch) => set((s) => ({ trade: patchIn(s.trade, id, patch) })),
      addSwift: (m) => set((s) => ({ swift: [m, ...s.swift].slice(0, 50) })),
    }),
    { name: "pi-bank-state-v2" },
  ),
);
