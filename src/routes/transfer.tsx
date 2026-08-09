import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import {
  BANK_IDENTITY,
  PURPOSE_CODES,
  generateEndToEndId,
  generateUetr,
  isoDate,
  messageTypeForRail,
  screenPayment,
  validateAccountIdentifier,
  type PurposeCode,
} from "@/lib/iso20022";
import { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { formatPi, piPayable } from "@/lib/pi-settlement";
import { usePiPayment } from "@/hooks/usePiPayment";
import { PiSettleNotice } from "@/components/PiSettleNotice";


export const Route = createFileRoute("/transfer")({
  head: () => ({
    meta: [
      { title: "Transfer Money — Pi Bank" },
      { name: "description", content: "Send money between accounts and to other people using your country's domestic payment rails like ACH, UPI, and Faster Payments." },
      { property: "og:title", content: "Transfer Money — Pi Bank" },
      { property: "og:description", content: "Move money instantly with your country's domestic payment rails." },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/transfer" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/transfer" }],
  }),
  component: Transfer,
});

function Transfer() {
  const { accounts, activeCountry, addTxn, adjustBalance } = useBank();
  const country = COUNTRIES[activeCountry];
  const own = accounts.filter((a) => a.country === activeCountry);
  const [from, setFrom] = useState(own[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [rail, setRail] = useState(country.rails[0]!);
  const [purpose, setPurpose] = useState<PurposeCode>("SUPP");
  const [remittance, setRemittance] = useState("");
  const [receipt, setReceipt] = useState<{ uetr: string; endToEndId: string; valueDate: string } | null>(null);
  const bank = BANK_IDENTITY[activeCountry];
  const piPay = usePiPayment();


  const fromAcct = accounts.find((a) => a.id === from);
  const amt = parseFloat(amount) || 0;
  const overLimit = amt > country.singleTxnLimit;
  const needsReport = amt >= country.reportingThreshold;
  const msgType = messageTypeForRail(rail);
  const acctCheck = validateAccountIdentifier(activeCountry, to);
  const screening = useMemo(
    () =>
      screenPayment({
        beneficiaryName: name,
        amount: amt,
        currency: fromAcct?.currency ?? country.currency,
        originCountry: activeCountry,
        destinationCountry: activeCountry,
      }),
    [name, amt, fromAcct, country.currency, activeCountry],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAcct || amt <= 0 || overLimit || screening.status === "blocked" || piPay.pending) return;
    const pi = piPayable(amt, fromAcct.currency);
    const settled = await piPay.pay({
      amount: pi,
      memo: `Transfer to ${name || to} via ${rail}`,
      metadata: { kind: "transfer", rail, country: activeCountry, amount: amt, currency: fromAcct.currency },
    });
    if (!settled) return;
    adjustBalance(fromAcct.id, -amt);
    addTxn({
      accountId: fromAcct.id,
      description: `${rail} to ${name || to}`,
      category: "Transfer",
      amount: -amt,
      currency: fromAcct.currency,
      channel: `${rail} · Pi ${formatPi(pi)}`,
    });
    setReceipt({ uetr: generateUetr(), endToEndId: generateEndToEndId(), valueDate: isoDate(new Date()) });
  }


  if (receipt) {
    return (
      <AppShell>
        <PageHeader title="Transfer sent" />
        <div className="mx-5 mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <div className="text-lg font-semibold">{formatMoney(amt, fromAcct?.currency ?? country.currency)}</div>
          <div className="mt-1 text-sm text-muted-foreground">to {name || to} via {rail}</div>
          <dl className="mt-4 space-y-1 rounded-md bg-muted/50 p-3 text-left text-[11px]">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Message</span><span className="text-right">{msgType.iso}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">UETR</span><span className="break-all text-right font-mono">{receipt.uetr}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">End-to-end ID</span><span className="break-all text-right font-mono">{receipt.endToEndId}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Value date</span><span>{receipt.valueDate}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Clearing</span><span className="text-right">{bank.clearingSystem} · {bank.memberId}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Purpose</span><span>{purpose}</span></div>
          </dl>
          {needsReport ? (
            <div className="mt-4 rounded-md bg-amber-100/50 px-3 py-2 text-[11px] text-amber-900">
              Per {country.centralBank} rules, this transfer is over the {formatMoney(country.reportingThreshold, country.currency)} reporting threshold and would be reported.
            </div>
          ) : null}
          <button onClick={() => { setReceipt(null); setAmount(""); setTo(""); setName(""); }} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">
            New transfer
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Transfer" subtitle={`${country.flag} ${country.name} · ${country.rails.length} rails`} />
      <SimBanner />
      <form onSubmit={submit} className="mx-5 mt-2 space-y-4">
        <Field label="From account">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="select">
            {own.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {formatMoney(a.balance, a.currency)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Payment rail">
          <select value={rail} onChange={(e) => setRail(e.target.value)} className="select">
            {country.rails.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div className="mt-1 text-[11px] text-muted-foreground">{msgType.name} · {msgType.iso} · {bank.clearingSystem}</div>
        </Field>

        <Field label="Recipient name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" className="input" />
        </Field>
        <Field label="Account number / IBAN / UPI ID">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient identifier" className="input font-mono" />
          {to && !acctCheck.valid ? <div className="mt-1 text-[11px] text-destructive">{acctCheck.reason}</div> : null}
        </Field>

        <Field label="Purpose code (ISO 20022)">
          <select value={purpose} onChange={(e) => setPurpose(e.target.value as PurposeCode)} className="select">
            {PURPOSE_CODES.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
          </select>
        </Field>

        <Field label="Remittance information">
          <input value={remittance} onChange={(e) => setRemittance(e.target.value)} maxLength={140} placeholder="Reference shown to the payee" className="input" />
        </Field>

        <Field label={`Amount (${fromAcct?.currency ?? country.currency})`}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            className="input text-lg"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">
            Single-txn limit: {formatMoney(country.singleTxnLimit, country.currency)} · Daily: {formatMoney(country.dailyLimit, country.currency)}
          </div>
        </Field>

        {overLimit ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Exceeds {country.centralBank} single-transaction limit.
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!from || !to || amt <= 0 || overLimit || !acctCheck.valid || screening.status === "blocked"}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Send {formatMoney(amt, fromAcct?.currency ?? country.currency)} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <style>{`
        .input{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem;outline:none}
        .input:focus{border-color:var(--color-ring)}
        .select{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}
      `}</style>
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
