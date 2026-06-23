import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import { useState } from "react";
import { Check, Smartphone } from "lucide-react";

export const Route = createFileRoute("/topup")({
  head: () => ({ meta: [{ title: "Mobile Top-up — Pi Bank" }] }),
  component: Topup,
});

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200];

function Topup() {
  const { accounts, activeCountry, addTxn, adjustBalance } = useBank();
  const country = COUNTRIES[activeCountry];
  const operators = country.billers.filter((b) => b.category === "mobile");
  const own = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState(operators[0]?.id ?? "");
  const [acct, setAcct] = useState(own[0]?.id ?? "");
  const [amount, setAmount] = useState<number>(QUICK_AMOUNTS[1]);
  const [done, setDone] = useState(false);
  const fromAcct = accounts.find((a) => a.id === acct);
  const op = operators.find((o) => o.id === operator);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAcct || !op || amount <= 0) return;
    adjustBalance(fromAcct.id, -amount);
    addTxn({
      accountId: fromAcct.id,
      description: `${op.name} top-up ${phone}`,
      category: "Mobile",
      amount: -amount,
      currency: fromAcct.currency,
      channel: "Airtime",
    });
    setDone(true);
  }

  if (done) {
    return (
      <AppShell>
        <PageHeader title="Top-up sent" />
        <div className="mx-5 mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <div className="text-lg font-semibold">{formatMoney(amount, fromAcct?.currency ?? country.currency)}</div>
          <div className="mt-1 text-sm text-muted-foreground">{op?.name} • {phone}</div>
          <button onClick={() => setDone(false)} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">Top up another</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Mobile top-up" subtitle={`${country.flag} ${country.name}`} right={<Smartphone className="h-5 w-5 text-muted-foreground" />} />
      <SimBanner />
      <form onSubmit={submit} className="mx-5 mt-2 space-y-4">
        <Field label="Operator">
          <select value={operator} onChange={(e) => setOperator(e.target.value)} className="select">
            {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Phone number">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" inputMode="tel" placeholder="+1 555 ..." />
        </Field>
        <Field label="From">
          <select value={acct} onChange={(e) => setAcct(e.target.value)} className="select">
            {own.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatMoney(a.balance, a.currency)}</option>)}
          </select>
        </Field>
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Amount ({fromAcct?.currency})</div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={`rounded-lg border py-2 text-sm font-medium ${amount === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
              >
                {formatMoney(v, fromAcct?.currency ?? country.currency)}
              </button>
            ))}
          </div>
        </div>
        <button className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={!phone || amount <= 0}>
          Top up
        </button>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}.select{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
