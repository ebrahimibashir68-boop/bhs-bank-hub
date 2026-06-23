import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { COUNTRIES, COUNTRY_LIST, formatMoney, convert, type CountryCode } from "@/lib/banking";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Globe2 } from "lucide-react";

export const Route = createFileRoute("/international")({
  head: () => ({ meta: [{ title: "International — Pi Bank" }, { name: "description", content: "Send money across borders with SWIFT, SEPA, Wise, and more." }] }),
  component: Intl,
});

function Intl() {
  const { accounts, activeCountry, addTxn, adjustBalance } = useBank();
  const fromCountry = COUNTRIES[activeCountry];
  const own = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");
  const [from, setFrom] = useState(own[0]?.id ?? "");
  const [toCountry, setToCountry] = useState<CountryCode>(
    (COUNTRY_LIST.find((c) => c.code !== activeCountry)?.code as CountryCode) ?? "GB",
  );
  const dest = COUNTRIES[toCountry];
  const [amount, setAmount] = useState("");
  const [rail, setRail] = useState(fromCountry.intlRails[0]);
  const [iban, setIban] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  const fromAcct = accounts.find((a) => a.id === from);
  const amt = parseFloat(amount) || 0;
  const converted = useMemo(
    () => convert(amt, fromAcct?.currency ?? fromCountry.currency, dest.currency),
    [amt, fromAcct, dest, fromCountry],
  );
  const fee = +(amt * 0.005 + 2).toFixed(2);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAcct || amt <= 0) return;
    adjustBalance(fromAcct.id, -(amt + fee));
    addTxn({
      accountId: fromAcct.id,
      description: `Intl ${rail} → ${name || iban} (${dest.country ?? dest.code})`,
      category: "International",
      amount: -(amt + fee),
      currency: fromAcct.currency,
      channel: rail,
      status: "pending",
    });
    setDone(true);
  }

  if (done) {
    return (
      <AppShell>
        <PageHeader title="Sent for processing" />
        <div className="mx-5 mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <div className="text-lg font-semibold">{formatMoney(amt, fromAcct?.currency ?? fromCountry.currency)}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            → {formatMoney(converted, dest.currency)} to {dest.flag} {dest.name}
          </div>
          <div className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-left text-[11px] text-muted-foreground">
            <div>Rail: {rail}</div>
            <div>Fee: {formatMoney(fee, fromAcct?.currency ?? fromCountry.currency)}</div>
            <div>Compliance: {dest.amlNotes}</div>
            <div>Expected arrival: 1–3 business days.</div>
          </div>
          <button onClick={() => { setDone(false); setAmount(""); }} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">New transfer</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="International"
        subtitle="Cross-border payments"
        right={<Globe2 className="h-5 w-5 text-muted-foreground" />}
      />
      <SimBanner />
      <form onSubmit={submit} className="mx-5 mt-2 space-y-4">
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>From</span>
            <span className="font-medium text-foreground">{fromCountry.flag} {fromCountry.name}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Compliance</span>
            <span className="text-right text-foreground">{fromCountry.centralBank}</span>
          </div>
        </div>

        <Field label="From account">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="select">
            {own.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatMoney(a.balance, a.currency)}</option>)}
          </select>
        </Field>

        <Field label="Destination country">
          <select value={toCountry} onChange={(e) => setToCountry(e.target.value as CountryCode)} className="select">
            {COUNTRY_LIST.filter((c) => c.code !== activeCountry).map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.currency})</option>
            ))}
          </select>
        </Field>

        <Field label="Rail">
          <select value={rail} onChange={(e) => setRail(e.target.value)} className="select">
            {fromCountry.intlRails.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>

        <Field label="Recipient name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Full legal name" />
        </Field>
        <Field label="IBAN / account number / SWIFT BIC">
          <input value={iban} onChange={(e) => setIban(e.target.value)} className="input" placeholder="e.g. GB29 NWBK ..." />
        </Field>

        <Field label={`You send (${fromAcct?.currency ?? fromCountry.currency})`}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="0.00" className="input text-lg" />
        </Field>

        <div className="rounded-xl border border-border bg-card p-3 text-xs">
          <Row label="They receive" value={formatMoney(converted, dest.currency)} bold />
          <Row label="Fee" value={formatMoney(fee, fromAcct?.currency ?? fromCountry.currency)} />
          <Row label="Rate" value={`1 ${fromAcct?.currency} ≈ ${(amt ? converted / amt : 0).toFixed(4)} ${dest.currency}`} />
          <Row label="Destination CB" value={dest.centralBank} />
        </div>

        <button
          type="submit"
          disabled={!from || !iban || amt <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Send internationally <ArrowRight className="h-4 w-4" />
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
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
