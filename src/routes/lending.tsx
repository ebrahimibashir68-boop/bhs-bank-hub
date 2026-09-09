import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useState } from "react";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import { formatPi, piPayable, toPi, fromPi } from "@/lib/pi-settlement";
import { usePiPayment } from "@/hooks/usePiPayment";
import { PiSettleNotice } from "@/components/PiSettleNotice";
import {
  LOAN_PRODUCTS, LIQUIDATION_LTV, POOL, monthlyPayment, piCollateralRequired,
  quoteApr, totalInterest, currentLtv,
} from "@/lib/products";
import { Card, Field, KV, Primary, Success, Tabs, inputCls, head } from "@/components/ServiceUi";
import { HandCoins, Layers, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/lending")({
  head: () =>
    head(
      "/lending",
      "Lending & credit",
      "Borrow against Pi collateral in an on-chain escrow, take a personal or SME instalment loan, or supply Pi to the blockchain lending pool.",
    ),
  component: Lending,
});

type Tab = "borrow" | "pool" | "mine";

function Lending() {
  const [tab, setTab] = useState<Tab>("borrow");
  return (
    <AppShell>
      <PageHeader title="Lending & credit" subtitle="Blockchain-collateralised and traditional credit" />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "borrow", label: "Borrow" },
          { id: "pool", label: "Pi pool" },
          { id: "mine", label: "My loans" },
        ]}
      />
      <SimBanner />
      {tab === "borrow" ? <Borrow /> : tab === "pool" ? <Pool /> : <MyLoans />}
    </AppShell>
  );
}

function Borrow() {
  const { accounts, activeCountry, addLoan, addTxn, adjustBalance } = useBank();
  const country = COUNTRIES[activeCountry];
  const own = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");
  const [productId, setProductId] = useState(LOAN_PRODUCTS[0].id);
  const [acct, setAcct] = useState(own[0]?.id ?? "");
  const [amount, setAmount] = useState(2_000);
  const [months, setMonths] = useState(12);
  const [ltv, setLtv] = useState(0.4);
  const [done, setDone] = useState<string | null>(null);
  const piPay = usePiPayment();

  const product = LOAN_PRODUCTS.find((p) => p.id === productId)!;
  const target = accounts.find((a) => a.id === acct);
  const currency = target?.currency ?? country.currency;
  const apr = quoteApr(product, months, product.maxLtv ? ltv : 0);
  const monthly = monthlyPayment(amount, apr, months);
  const collateralPi = product.maxLtv ? piCollateralRequired(amount, currency, ltv) : 0;
  const overLimit = amount > country.singleTxnLimit;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || amount <= 0 || piPay.pending || overLimit) return;

    // Collateralised loans lock Pi on-chain before funds are released.
    let escrowTx: string | undefined;
    if (collateralPi > 0) {
      const settled = await piPay.pay({
        amount: collateralPi,
        memo: `Loan collateral lock ${formatMoney(amount, currency)}`,
        metadata: { kind: "loan-collateral", product: product.id, amount, currency, ltv, months },
      });
      if (!settled) return;
      escrowTx = settled.txid;
    }

    const id = `l-${Date.now()}`;
    addLoan({
      id, productId: product.id, accountId: target.id, currency,
      principal: amount, outstanding: amount, aprPct: apr, months, monthly,
      collateralPi, escrowTx, openedAt: new Date().toISOString().slice(0, 10), status: "active",
    });
    adjustBalance(target.id, amount);
    addTxn({
      accountId: target.id,
      description: `${product.name} drawdown`,
      category: "Loan",
      amount,
      currency,
      channel: collateralPi ? `Pi escrow ${formatPi(collateralPi)}` : "Credit",
    });
    setDone(id);
  }

  if (done) {
    return (
      <Success
        title="Loan disbursed"
        lines={[
          `${formatMoney(amount, currency)} credited to ${target?.name}`,
          `${formatMoney(monthly, currency)} / month for ${months} months at ${apr}% APR`,
          collateralPi ? `${formatPi(collateralPi)} locked in on-chain escrow` : "Unsecured instalment credit",
        ]}
        onDone={() => setDone(null)}
        cta="Back to lending"
      />
    );
  }

  return (
    <form onSubmit={submit} className="mx-5 mt-2 space-y-4 pb-6">
      <div className="space-y-2">
        {LOAN_PRODUCTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { setProductId(p.id); setMonths(Math.max(p.minMonths, Math.min(p.maxMonths, months))); }}
            className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left ${
              p.id === productId ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>
              <span className="block text-sm font-semibold">{p.name}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{p.blurb}</span>
              <span className="mt-1 block text-[11px] font-medium text-primary">{p.aprMin}%–{p.aprMax}% APR · {p.minMonths}–{p.maxMonths} months</span>
            </span>
          </button>
        ))}
      </div>

      <Field label="Disburse to">
        <select value={acct} onChange={(e) => setAcct(e.target.value)} className={inputCls}>
          {own.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatMoney(a.balance, a.currency)}</option>)}
        </select>
      </Field>

      <Field label={`Loan amount (${currency})`} hint={overLimit ? `Above the ${country.centralBank} single-transaction limit.` : undefined}>
        <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputCls} />
      </Field>

      <Field label={`Term — ${months} months`}>
        <input type="range" min={product.minMonths} max={product.maxMonths} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
      </Field>

      {product.maxLtv ? (
        <Field label={`Loan-to-value — ${(ltv * 100).toFixed(0)}%`} hint={`Escrow liquidates at ${LIQUIDATION_LTV * 100}% LTV.`}>
          <input type="range" min={10} max={product.maxLtv * 100} value={ltv * 100} onChange={(e) => setLtv(Number(e.target.value) / 100)} className="w-full accent-[var(--color-primary)]" />
        </Field>
      ) : null}

      <Card className="space-y-2">
        <KV label="Indicative APR" value={`${apr}%`} />
        <KV label="Monthly repayment" value={`${formatMoney(monthly, currency)} · ${formatPi(toPi(monthly, currency))}`} />
        <KV label="Total interest" value={formatMoney(totalInterest(amount, apr, months), currency)} />
        <KV label="Total repayable" value={formatMoney(amount + totalInterest(amount, apr, months), currency)} />
        {collateralPi ? <KV label="Pi collateral locked" value={formatPi(collateralPi)} /> : null}
        <KV label="Regulator" value={country.centralBank} />
      </Card>

      {collateralPi ? (
        <PiSettleNotice pi={collateralPi} status={piPay.status} pending={piPay.pending} />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Unsecured credit is underwritten off-chain; repayments settle in Pi each month.
        </p>
      )}

      <Primary disabled={amount <= 0 || overLimit || piPay.pending}>
        {collateralPi ? `Lock ${formatPi(collateralPi)} & draw funds` : "Accept loan offer"}
      </Primary>
    </form>
  );
}

function Pool() {
  const { pool, setPool, accounts, addTxn } = useBank();
  const piWallet = accounts.find((a) => a.type === "pi-wallet");
  const [supply, setSupply] = useState(50);
  const piPay = usePiPayment();

  async function addLiquidity() {
    if (supply <= 0 || piPay.pending) return;
    const settled = await piPay.pay({
      amount: supply,
      memo: `Supply ${supply} Pi to lending pool`,
      metadata: { kind: "pool-supply", pi: supply, contract: POOL.contract },
    });
    if (!settled) return;
    setPool({ suppliedPi: +(pool.suppliedPi + supply).toFixed(4), since: pool.since || new Date().toISOString().slice(0, 10) });
    if (piWallet) {
      addTxn({ accountId: piWallet.id, description: "Supplied to Pi Liquidity Pool", category: "Lending", amount: -supply, currency: "PI", channel: "Smart contract" });
    }
  }

  const earnedYear = pool.suppliedPi * (POOL.supplyApy / 100);

  return (
    <div className="mx-5 mt-2 space-y-4 pb-6">
      <Card className="space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">{POOL.name}</h2>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          A blockchain lending pool on Pi Mainnet. Supplied Pi backs collateralised borrowing; interest accrues per block and is paid in Pi.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="Supply APY" value={`${POOL.supplyApy}%`} />
          <Stat label="Borrow APR" value={`${POOL.borrowApr}%`} />
          <Stat label="Utilisation" value={`${(POOL.utilisation * 100).toFixed(0)}%`} />
          <Stat label="Total supplied" value={formatPi(POOL.totalSuppliedPi, 0)} />
        </div>
        <div className="mt-2 break-all rounded-md bg-muted/40 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
          {POOL.contract}
        </div>
      </Card>

      <Card className="space-y-2">
        <KV label="Your position" value={formatPi(pool.suppliedPi)} />
        <KV label="Projected yield / year" value={formatPi(earnedYear)} />
        {pool.since ? <KV label="Supplying since" value={pool.since} /> : null}
      </Card>

      <Field label="Supply amount (π)">
        <input type="number" min={0} step="0.1" value={supply} onChange={(e) => setSupply(Number(e.target.value))} className={inputCls} />
      </Field>
      <PiSettleNotice pi={supply} status={piPay.status} pending={piPay.pending} />
      <Primary type="button" onClick={addLiquidity} disabled={supply <= 0 || piPay.pending}>
        Supply {formatPi(supply)}
      </Primary>
    </div>
  );
}

function MyLoans() {
  const { loans, updateLoan, adjustBalance, addTxn } = useBank();
  const piPay = usePiPayment();

  async function repay(id: string) {
    const loan = loans.find((l) => l.id === id);
    if (!loan || piPay.pending) return;
    const due = Math.min(loan.monthly, loan.outstanding);
    const pi = piPayable(due, loan.currency);
    const settled = await piPay.pay({
      amount: pi,
      memo: `Loan repayment ${formatMoney(due, loan.currency)}`,
      metadata: { kind: "loan-repayment", loanId: loan.id, amount: due, currency: loan.currency },
    });
    if (!settled) return;
    const left = +(loan.outstanding - due).toFixed(2);
    updateLoan(loan.id, { outstanding: left, status: left <= 0 ? "repaid" : "active" });
    adjustBalance(loan.accountId, -due);
    addTxn({ accountId: loan.accountId, description: "Loan repayment", category: "Loan", amount: -due, currency: loan.currency, channel: `Pi ${formatPi(pi)}` });
  }

  if (loans.length === 0) {
    return <p className="mx-5 mt-6 text-sm text-muted-foreground">No loans yet. Open one from the Borrow tab.</p>;
  }

  return (
    <div className="mx-5 mt-2 space-y-3 pb-6">
      {loans.map((l) => {
        const ltvNow = currentLtv(l.outstanding, l.currency, l.collateralPi);
        const product = LOAN_PRODUCTS.find((p) => p.id === l.productId);
        return (
          <Card key={l.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{product?.name}</span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${l.status === "active" ? "bg-primary/10 text-primary" : "bg-emerald-500/15 text-emerald-600"}`}>
                {l.status}
              </span>
            </div>
            <KV label="Outstanding" value={`${formatMoney(l.outstanding, l.currency)} · ${formatPi(toPi(l.outstanding, l.currency))}`} />
            <KV label="Monthly" value={formatMoney(l.monthly, l.currency)} />
            <KV label="APR / term" value={`${l.aprPct}% · ${l.months} months`} />
            {l.collateralPi ? (
              <>
                <KV label="Pi collateral" value={formatPi(l.collateralPi)} />
                <KV label="Current LTV" value={`${(ltvNow * 100).toFixed(1)}% (liquidation ${LIQUIDATION_LTV * 100}%)`} />
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${ltvNow > LIQUIDATION_LTV ? "bg-red-500" : ltvNow > 0.6 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (ltvNow / LIQUIDATION_LTV) * 100)}%` }}
                  />
                </div>
                {l.escrowTx ? <div className="break-all font-mono text-[10px] text-muted-foreground">escrow tx {l.escrowTx}</div> : null}
              </>
            ) : null}
            {l.status === "active" ? (
              <>
                <PiSettleNotice pi={piPayable(Math.min(l.monthly, l.outstanding), l.currency)} status={piPay.status} pending={piPay.pending} />
                <Primary type="button" onClick={() => repay(l.id)} disabled={piPay.pending}>
                  Repay {formatMoney(Math.min(l.monthly, l.outstanding), l.currency)}
                </Primary>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" /> Repaid in full · collateral released {l.collateralPi ? formatPi(l.collateralPi) : ""}
              </p>
            )}
          </Card>
        );
      })}
      <p className="text-[11px] text-muted-foreground">
        Collateral is valued at the live Pi rate; {formatPi(1)} ≈ {formatMoney(fromPi(1, "USD"), "USD")}.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
