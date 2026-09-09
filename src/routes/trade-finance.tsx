import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useState } from "react";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import { formatPi, piPayable } from "@/lib/pi-settlement";
import { usePiPayment } from "@/hooks/usePiPayment";
import { PiSettleNotice } from "@/components/PiSettleNotice";
import { TRADE_META, tradeFee, buildMt700, type TradeKind } from "@/lib/products";
import { BANK_IDENTITY, generateMessageId, isoDate, addBusinessDays } from "@/lib/iso20022";
import { Card, Field, KV, Primary, SwiftPreview, Tabs, inputCls, head } from "@/components/ServiceUi";

export const Route = createFileRoute("/trade-finance")({
  head: () =>
    head(
      "/trade-finance",
      "Trade finance",
      "Issue documentary letters of credit (MT700, UCP 600), demand guarantees (MT760) and documentary collections (MT400, URC 522).",
    ),
  component: TradeFinance,
});

const INCOTERMS = ["FOB", "CIF", "CFR", "EXW", "DAP", "DDP"];

function TradeFinance() {
  const [tab, setTab] = useState<"new" | "portfolio">("new");
  return (
    <AppShell>
      <PageHeader title="Trade finance" subtitle="Letters of credit, guarantees and collections" />
      <Tabs value={tab} onChange={setTab} items={[{ id: "new", label: "New instrument" }, { id: "portfolio", label: "Portfolio" }]} />
      <SimBanner />
      {tab === "new" ? <NewInstrument /> : <Portfolio />}
    </AppShell>
  );
}

function NewInstrument() {
  const { activeCountry, addTrade, addSwift, accounts, adjustBalance, addTxn } = useBank();
  const country = COUNTRIES[activeCountry];
  const identity = BANK_IDENTITY[activeCountry];
  const [kind, setKind] = useState<TradeKind>("lc");
  const [applicant, setApplicant] = useState("Pioneer Imports Ltd");
  const [beneficiary, setBeneficiary] = useState("Shenzhen Components Co");
  const [amount, setAmount] = useState(50_000);
  const [months, setMonths] = useState(3);
  const [goods, setGoods] = useState("Solar inverters, 500 units");
  const [incoterm, setIncoterm] = useState("CIF");
  const [advisingBic, setAdvisingBic] = useState("BKCHCNBJXXX");
  const piPay = usePiPayment();

  const meta = TRADE_META[kind];
  const fee = tradeFee(amount, kind, months);
  const ref = generateMessageId();
  const issueDate = isoDate(new Date());
  const expiryDate = isoDate(addBusinessDays(new Date(), months * 21));
  const currency = country.currency;
  const swift = buildMt700({
    ref, issueDate, expiryDate, applicant, beneficiary, currency, amount, goods,
    issuingBic: identity.bic, advisingBic, incoterm,
  });
  const feeAccount = accounts.find((a) => a.country === activeCountry && a.type !== "pi-wallet");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0 || piPay.pending) return;
    const pi = piPayable(fee, currency);
    const settled = await piPay.pay({
      amount: pi,
      memo: `${meta.mt} issuance fee ${ref}`,
      metadata: { kind: `trade-${kind}`, ref, amount, currency, fee },
    });
    if (!settled) return;
    addTrade({
      id: `tf-${Date.now()}`, kind, ref, applicant, beneficiary, currency, amount, fee,
      issueDate, expiryDate, advisingBic, goods, incoterm, status: "issued", swift,
    });
    addSwift({ id: `s-${Date.now()}`, type: meta.mt, ref, counterparty: advisingBic, currency, amount, createdAt: new Date().toISOString(), body: swift });
    if (feeAccount) {
      adjustBalance(feeAccount.id, -fee);
      addTxn({ accountId: feeAccount.id, description: `${meta.mt} issuance fee`, category: "Trade finance", amount: -fee, currency, channel: `Pi ${formatPi(pi)}` });
    }
  }

  return (
    <form onSubmit={submit} className="mx-5 mt-2 space-y-4 pb-6">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TRADE_META) as TradeKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-xl border px-2 py-2.5 text-center ${kind === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
          >
            <div className="font-mono text-[11px] font-semibold">{TRADE_META[k].mt}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{TRADE_META[k].rules}</div>
          </button>
        ))}
      </div>
      <p className="text-[11.5px] text-muted-foreground">{meta.title} — issued by {identity.bic} under {meta.rules}.</p>

      <Field label="Applicant"><input value={applicant} onChange={(e) => setApplicant(e.target.value)} className={inputCls} /></Field>
      <Field label="Beneficiary"><input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={inputCls} /></Field>
      <Field label="Advising / confirming bank BIC">
        <input value={advisingBic} onChange={(e) => setAdvisingBic(e.target.value.toUpperCase())} className={`${inputCls} font-mono`} />
      </Field>
      <Field label={`Instrument amount (${currency})`}>
        <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Validity (months)">
          <input type="number" min={1} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Incoterm">
          <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className={inputCls}>
            {INCOTERMS.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Goods description"><input value={goods} onChange={(e) => setGoods(e.target.value)} className={inputCls} /></Field>

      <Card className="space-y-2">
        <KV label="Reference" value={<span className="font-mono">{ref}</span>} />
        <KV label="Issue / expiry" value={`${issueDate} → ${expiryDate}`} />
        <KV label="Issuance fee" value={`${formatMoney(fee, currency)} (${meta.feePct}%)`} />
        <KV label="Settles in Pi" value={formatPi(piPayable(fee, currency))} />
      </Card>

      <SwiftPreview title={`${meta.mt} — ${meta.title}`} body={swift} />
      <PiSettleNotice pi={piPayable(fee, currency)} status={piPay.status} pending={piPay.pending} />
      <Primary disabled={amount <= 0 || piPay.pending}>Issue {meta.mt}</Primary>
    </form>
  );
}

function Portfolio() {
  const { trade, updateTrade } = useBank();
  if (trade.length === 0) {
    return <p className="mx-5 mt-6 text-sm text-muted-foreground">No trade instruments issued yet.</p>;
  }
  const next: Record<string, string> = {
    issued: "advised", advised: "documents-presented", "documents-presented": "paid",
  };
  return (
    <div className="mx-5 mt-2 space-y-3 pb-6">
      {trade.map((t) => (
        <Card key={t.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold">{TRADE_META[t.kind].mt} · {t.ref}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{t.status}</span>
          </div>
          <KV label="Beneficiary" value={t.beneficiary} />
          <KV label="Amount" value={formatMoney(t.amount, t.currency)} />
          <KV label="Expiry" value={t.expiryDate} />
          <KV label="Advising bank" value={<span className="font-mono">{t.advisingBic}</span>} />
          <SwiftPreview title="View SWIFT message" body={t.swift} />
          {next[t.status] ? (
            <button
              type="button"
              onClick={() => updateTrade(t.id, { status: next[t.status] as typeof t.status })}
              className="w-full rounded-md border border-border py-2 text-xs font-medium"
            >
              Advance to “{next[t.status]}”
            </button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
