import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useState } from "react";
import { useBank } from "@/lib/store";
import { formatMoney } from "@/lib/banking";
import { formatPi, piPayable } from "@/lib/pi-settlement";
import { usePiPayment } from "@/hooks/usePiPayment";
import { PiSettleNotice } from "@/components/PiSettleNotice";
import { fxQuote, buildMt300 } from "@/lib/products";
import { BANK_IDENTITY, addBusinessDays, isoDate, generateMessageId } from "@/lib/iso20022";
import { Card, Field, KV, Primary, SwiftPreview, inputCls, head } from "@/components/ServiceUi";
import { Repeat } from "lucide-react";

export const Route = createFileRoute("/fx")({
  head: () =>
    head(
      "/fx",
      "Foreign exchange",
      "Convert between currencies and Pi at a live spot rate with an MT300 FX confirmation and T+2 value date.",
    ),
  component: Fx,
});

const CURRENCIES = ["USD", "GBP", "EUR", "NGN", "INR", "AED", "PI"];

function Fx() {
  const { accounts, activeCountry, adjustBalance, addTxn, addSwift } = useBank();
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("PI");
  const [amount, setAmount] = useState(500);
  const piPay = usePiPayment();

  const quote = fxQuote(amount, from, to);
  const fromAcct = accounts.find((a) => a.currency === from);
  const toAcct = accounts.find((a) => a.currency === to);
  const valueDate = isoDate(addBusinessDays(new Date(), 2));
  const identity = BANK_IDENTITY[activeCountry];
  const ref = generateMessageId();
  const swift = buildMt300({
    ref, buyCcy: to, buyAmt: quote.receive, sellCcy: from, sellAmt: amount,
    rate: quote.rate, valueDate, bic: identity.bic, cptyBic: identity.correspondentBic,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0 || from === to || piPay.pending) return;
    const pi = piPayable(amount, from);
    const settled = await piPay.pay({
      amount: pi,
      memo: `FX ${from}->${to} ${amount}`,
      metadata: { kind: "fx", from, to, amount, rate: quote.rate, ref },
    });
    if (!settled) return;
    if (fromAcct) {
      adjustBalance(fromAcct.id, -amount);
      addTxn({ accountId: fromAcct.id, description: `FX sell ${from} / buy ${to}`, category: "FX", amount: -amount, currency: from, channel: `MT300 ${ref}` });
    }
    if (toAcct) {
      adjustBalance(toAcct.id, quote.receive);
      addTxn({ accountId: toAcct.id, description: `FX buy ${to} / sell ${from}`, category: "FX", amount: quote.receive, currency: to, channel: `MT300 ${ref}` });
    }
    addSwift({ id: `s-${Date.now()}`, type: "MT300", ref, counterparty: identity.correspondentBic, currency: to, amount: quote.receive, createdAt: new Date().toISOString(), body: swift });
  }

  return (
    <AppShell>
      <PageHeader title="Foreign exchange" subtitle="Spot conversion with MT300 confirmation" right={<Repeat className="h-5 w-5 text-muted-foreground" />} />
      <SimBanner />
      <form onSubmit={submit} className="mx-5 mt-2 space-y-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sell">
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Buy">
            <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label={`Amount (${from})`}>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputCls} />
        </Field>

        <Card className="space-y-2">
          <KV label="Mid-market rate" value={`1 ${from} = ${quote.mid.toFixed(6)} ${to}`} />
          <KV label="Your rate" value={`1 ${from} = ${quote.rate.toFixed(6)} ${to}`} />
          <KV label="Spread" value={`${quote.spreadBps} bps`} />
          <KV label="You receive" value={formatMoney(quote.receive, to)} />
          <KV label="Value date" value={`${valueDate} (T+2)`} />
          <KV label="Counterparty" value={identity.correspondentBic} />
        </Card>

        <SwiftPreview title="MT300 — Foreign Exchange Confirmation" body={swift} />
        <PiSettleNotice pi={piPayable(amount, from)} status={piPay.status} pending={piPay.pending} />
        <Primary disabled={amount <= 0 || from === to || piPay.pending}>
          Execute FX · {formatPi(piPayable(amount, from))}
        </Primary>
      </form>
    </AppShell>
  );
}
