import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACCOUNTS, TXNS, type Account, type Txn, type CountryCode } from "./banking";

interface BankState {
  activeCountry: CountryCode;
  accounts: Account[];
  txns: Txn[];
  setActiveCountry: (c: CountryCode) => void;
  addTxn: (t: Omit<Txn, "id" | "date" | "status"> & { status?: Txn["status"] }) => void;
  adjustBalance: (accountId: string, delta: number) => void;
}

export const useBank = create<BankState>()(
  persist(
    (set) => ({
      activeCountry: "US",
      accounts: ACCOUNTS,
      txns: TXNS,
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
    }),
    { name: "pi-bank-state-v1" },
  ),
);
