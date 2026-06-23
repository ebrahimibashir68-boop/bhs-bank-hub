import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney, type Biller } from "@/lib/banking";
import { useState } from "react";
import { Check } from "lucide-react";

export const Route = createFileRoute("/bills")({
  head: () => ({ meta: [{ title: "Pay Bills — Pi Bank" }, { name: "description", content: "Pay utility, mobile, internet, and tax bills for your country." }] }),
  component: Bills,
});

function Bills() {
  const { accounts, activeCountry, addTxn, adjustBalance } = useBank();
  const country = COUNTRIES[activeCountry];
  const own = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");
  const [biller, setBiller] = useState<Biller | null>(null);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(own[0]?.id ?? "");
  const [done, setDone] = useState<Biller | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fromAcct = accounts.find((a) => a.id === from);
    const amt = parseFloat(amount) || 0;
    if (!biller || !fromAcct || amt <= 0) return;
    adjustBalance(fromAcct.id, -amt);
    addTxn({
      accountId: fromAcct.id,
      description: `${biller.name} — ${account || "bill"}`,
      category: "Utilities",
      amount: -amt,
      currency: fromAcct.currency,
      channel: "Bill Pay",
    });
    setDone(biller);
    setBiller(null);
    setAmount("");
    setAccount("");
  }

  if (done) {
    return (
      <AppShell>
        <PageHeader title="Bill paid" />
        <div className="mx-5 mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <div className="text-lg font-semibold">{done.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">Receipt sent to your email.</div>
          <button onClick={() => setDone(null)} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">
            Pay another bill
          </button>
        </div>
      </AppShell>
    );
  }

  if (biller) {
    const fromAcct = accounts.find((a) => a.id === from);
    return (
      <AppShell>
        <PageHeader title={biller.name} subtitle={`${biller.category} · ${country.name}`} />
        <form onSubmit={submit} className="mx-5 mt-2 space-y-4">
          <Field label="Customer / meter / phone number">
            <input value={account} onChange={(e) => setAccount(e.target.value)} className="input" placeholder="Account reference" />
          </Field>
          <Field label="Pay from">
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="select">
              {own.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatMoney(a.balance, a.currency)}</option>)}
            </select>
          </Field>
          <Field label={`Amount (${fromAcct?.currency ?? country.currency})`}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="0.00" className="input text-lg" />
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => setBiller(null)} className="flex-1 rounded-md border border-border py-2.5 text-sm">Back</button>
            <button type="submit" className="flex-1 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">Pay</button>
          </div>
        </form>
        <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}.select{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}`}</style>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Pay bills" subtitle={`${country.flag} ${country.name}`} />
      <SimBanner />
      <div className="mx-5 mt-2 grid grid-cols-2 gap-3">
        {country.billers.map((b) => (
          <button
            key={b.id}
            onClick={() => setBiller(b)}
            className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent"
          >
            <div className="text-2xl">{b.logo}</div>
            <div className="text-sm font-medium leading-tight">{b.name}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{b.category}</div>
          </button>
        ))}
      </div>
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
