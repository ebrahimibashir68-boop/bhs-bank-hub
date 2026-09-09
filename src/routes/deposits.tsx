import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useState } from "react";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import { formatPi, piPayable, toPi } from "@/lib/pi-settlement";
import { usePiPayment } from "@/hooks/usePiPayment";
import { PiSettleNotice } from "@/components/PiSettleNotice";
import { DEPOSIT_TERMS, depositMaturityValue } from "@/lib/products";
import { Card, Field, KV, Primary, Tabs, inputCls, head } from "@/components/ServiceUi";
import { Vault } from "lucide-react";

export const Route = createFileRoute("/deposits")({
  head: () =>
    head(
      "/deposits",
      "Savings & term deposits",
      "Open fixed-rate term deposits and savings goals that accrue interest and settle in Pi.",
    ),
  component: Deposits,
});

function Deposits() {
  const [tab, setTab] = useState<"term" | "goal" | "mine">("term");
  return (
    <AppShell>
      <PageHeader title="Savings & deposits" subtitle="Fixed-rate terms and savings goals" />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[{ id: "term", label: "Term deposit" }, { id: "goal", label: "Savings goal" }, { id: "mine", label: "My savings" }]}
      />
      <SimBanner />
      {tab === "mine" ? <Mine /> : <Open kind={tab} />}
    </AppShell>
  );
}

function Open({ kind }: { kind: "term" | "goal" }) {
  const { accounts, activeCountry, addDeposit, adjustBalance, addTxn } = useBank();
  const country = COUNTRIES[activeCountry];
  const own = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");
  const [acct, setAcct] = useState(own[0]?.id ?? "");
  const [amount, setAmount] = useState(1_000);
  const [months, setMonths] = useState(12);
  const [goalName, setGoalName] = useState("Emergency fund");
  const piPay = usePiPayment();

  const source = accounts.find((a) => a.id === acct);
  const currency = source?.currency ?? country.currency;
  const term = DEPOSIT_TERMS.find((t) => t.months === months) ?? DEPOSIT_TERMS[0];
  const rate = kind === "goal" ? 2.5 : term.ratePct;
  const maturity = depositMaturityValue(amount, rate, months);
  const pi = piPayable(amount, currency);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!source || amount <= 0 || amount > source.balance || piPay.pending) return;
    const settled = await piPay.pay({
      amount: pi,
      memo: kind === "goal" ? `Savings goal ${goalName}` : `${months}-month term deposit`,
      metadata: { kind: `deposit-${kind}`, amount, currency, months, rate },
    });
    if (!settled) return;
    const opened = new Date();
    const matures = new Date(opened);
    matures.setMonth(matures.getMonth() + months);
    addDeposit({
      id: `d-${Date.now()}`, accountId: source.id, currency, principal: amount, ratePct: rate, months,
      openedAt: opened.toISOString().slice(0, 10), maturesAt: matures.toISOString().slice(0, 10),
      maturityValue: +maturity.toFixed(2), kind, goalName: kind === "goal" ? goalName : undefined, status: "open",
    });
    adjustBalance(source.id, -amount);
    addTxn({ accountId: source.id, description: kind === "goal" ? `Savings goal — ${goalName}` : `${months}-month term deposit`, category: "Savings", amount: -amount, currency, channel: `Pi ${formatPi(pi)}` });
  }

  return (
    <form onSubmit={submit} className="mx-5 mt-2 space-y-4 pb-6">
      {kind === "goal" ? (
        <Field label="Goal name">
          <input value={goalName} onChange={(e) => setGoalName(e.target.value)} className={inputCls} />
        </Field>
      ) : null}

      <Field label="Fund from">
        <select value={acct} onChange={(e) => setAcct(e.target.value)} className={inputCls}>
          {own.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatMoney(a.balance, a.currency)}</option>)}
        </select>
      </Field>

      <Field label={`Amount (${currency})`}>
        <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputCls} />
      </Field>

      <div>
        <div className="mb-1 text-xs font-medium text-muted-foreground">Term</div>
        <div className="grid grid-cols-3 gap-2">
          {DEPOSIT_TERMS.map((t) => (
            <button
              key={t.months}
              type="button"
              onClick={() => setMonths(t.months)}
              className={`rounded-xl border py-2 text-center ${months === t.months ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
            >
              <div className="text-sm font-semibold">{t.months}m</div>
              <div className="text-[10px] text-muted-foreground">{kind === "goal" ? "2.50" : t.ratePct.toFixed(2)}%</div>
            </button>
          ))}
        </div>
      </div>

      <Card className="space-y-2">
        <div className="flex items-center gap-2"><Vault className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Projection</span></div>
        <KV label="Interest rate" value={`${rate.toFixed(2)}% p.a.`} />
        <KV label="Value at maturity" value={`${formatMoney(maturity, currency)} · ${formatPi(toPi(maturity, currency))}`} />
        <KV label="Interest earned" value={formatMoney(maturity - amount, currency)} />
        <KV label="Deposit protection" value={`${country.centralBank} scheme (simulated)`} />
      </Card>

      <PiSettleNotice pi={pi} status={piPay.status} pending={piPay.pending} />
      <Primary disabled={amount <= 0 || piPay.pending || (source ? amount > source.balance : true)}>
        {kind === "goal" ? "Start saving" : "Open term deposit"} · {formatPi(pi)}
      </Primary>
    </form>
  );
}

function Mine() {
  const { deposits, updateDeposit, adjustBalance, addTxn } = useBank();
  if (deposits.length === 0) {
    return <p className="mx-5 mt-6 text-sm text-muted-foreground">No savings yet. Open a term deposit or a goal.</p>;
  }
  return (
    <div className="mx-5 mt-2 space-y-3 pb-6">
      {deposits.map((d) => (
        <Card key={d.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{d.kind === "goal" ? d.goalName : `${d.months}-month term deposit`}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{d.status}</span>
          </div>
          <KV label="Principal" value={formatMoney(d.principal, d.currency)} />
          <KV label="Rate" value={`${d.ratePct.toFixed(2)}% p.a.`} />
          <KV label="Matures" value={d.maturesAt} />
          <KV label="At maturity" value={`${formatMoney(d.maturityValue, d.currency)} · ${formatPi(toPi(d.maturityValue, d.currency))}`} />
          {d.status === "open" ? (
            <button
              type="button"
              onClick={() => {
                updateDeposit(d.id, { status: "closed" });
                adjustBalance(d.accountId, d.principal);
                addTxn({ accountId: d.accountId, description: "Deposit closed early", category: "Savings", amount: d.principal, currency: d.currency, channel: "Early withdrawal" });
              }}
              className="w-full rounded-md border border-border py-2 text-xs font-medium"
            >
              Break deposit (forfeits interest)
            </button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
