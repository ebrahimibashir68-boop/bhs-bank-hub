import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import { useState } from "react";
import { Banknote, ArrowDownToLine, ArrowUpFromLine, Check } from "lucide-react";

export const Route = createFileRoute("/cash")({
  head: () => ({ meta: [{ title: "Deposit / Withdraw — Pi Bank" }] }),
  component: Cash,
});

function Cash() {
  const { accounts, activeCountry, addTxn, adjustBalance } = useBank();
  const country = COUNTRIES[activeCountry];
  const own = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [acct, setAcct] = useState(own[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState(false);
  const fromAcct = accounts.find((a) => a.id === acct);
  const amt = parseFloat(amount) || 0;
  const dailyMax = country.dailyLimit;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAcct || amt <= 0) return;
    const delta = tab === "deposit" ? amt : -amt;
    adjustBalance(fromAcct.id, delta);
    addTxn({
      accountId: fromAcct.id,
      description: tab === "deposit" ? "Cash deposit (ATM)" : "Cash withdrawal (ATM)",
      category: tab === "deposit" ? "Deposit" : "Withdrawal",
      amount: delta,
      currency: fromAcct.currency,
      channel: "ATM",
    });
    setDone(true);
  }

  if (done) {
    return (
      <AppShell>
        <PageHeader title={tab === "deposit" ? "Deposit successful" : "Withdrawal ready"} />
        <div className="mx-5 mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <div className="text-lg font-semibold">{formatMoney(amt, fromAcct?.currency ?? country.currency)}</div>
          <div className="mt-1 text-sm text-muted-foreground">{tab === "deposit" ? "Funds available immediately." : "Collect cash at the ATM."}</div>
          <Link to="/" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Done</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Deposit & Withdraw" subtitle={`${country.flag} ${country.name}`} right={<Banknote className="h-5 w-5 text-muted-foreground" />} />
      <SimBanner />
      <div className="mx-5 mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
        <TabBtn active={tab === "deposit"} onClick={() => setTab("deposit")} icon={ArrowDownToLine}>Deposit</TabBtn>
        <TabBtn active={tab === "withdraw"} onClick={() => setTab("withdraw")} icon={ArrowUpFromLine}>Withdraw</TabBtn>
      </div>
      <form onSubmit={submit} className="mx-5 mt-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Account</span>
          <select value={acct} onChange={(e) => setAcct(e.target.value)} className="select">
            {own.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatMoney(a.balance, a.currency)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Amount ({fromAcct?.currency})</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="0.00" className="input text-lg" />
          <div className="mt-1 text-[11px] text-muted-foreground">Daily cap: {formatMoney(dailyMax, country.currency)}</div>
        </label>
        <button className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={amt <= 0}>
          {tab === "deposit" ? "Confirm deposit" : "Withdraw cash"}
        </button>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}.select{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}`}</style>
    </AppShell>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${active ? "bg-card shadow-sm" : "text-muted-foreground"}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
