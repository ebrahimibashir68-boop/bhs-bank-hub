import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useState } from "react";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import { generatePan, maskPan, type CardNetwork } from "@/lib/products";
import { Card as Panel, Field, Primary, inputCls, head } from "@/components/ServiceUi";
import { CreditCard, Snowflake, Sun } from "lucide-react";

export const Route = createFileRoute("/cards")({
  head: () =>
    head(
      "/cards",
      "Debit & virtual cards",
      "Issue virtual and physical debit cards, freeze them instantly, and control online, contactless and overseas spending.",
    ),
  component: Cards,
});

function Cards() {
  const { cards, accounts, activeCountry, addCard, updateCard } = useBank();
  const country = COUNTRIES[activeCountry];
  const own = accounts.filter((a) => a.type !== "pi-wallet");
  const [network, setNetwork] = useState<CardNetwork>("Pi Pay");
  const [acct, setAcct] = useState(own[0]?.id ?? "");

  function issue() {
    const src = accounts.find((a) => a.id === acct);
    if (!src) return;
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 4);
    addCard({
      id: `c-${Date.now()}`, accountId: src.id, network, form: "virtual", pan: generatePan(network),
      expiry: `${String(exp.getMonth() + 1).padStart(2, "0")}/${String(exp.getFullYear()).slice(2)}`,
      holder: "ALEX CITIZEN", frozen: false, dailyLimit: 1_000, onlineEnabled: true,
      contactlessEnabled: true, abroadEnabled: false,
    });
  }

  return (
    <AppShell>
      <PageHeader title="Cards" subtitle="Debit, virtual and Pi Pay cards" />
      <SimBanner />

      <div className="mx-5 mt-2 space-y-4 pb-6">
        {cards.map((c) => {
          const acc = accounts.find((a) => a.id === c.accountId);
          return (
            <div key={c.id} className="space-y-3">
              <div className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ${c.frozen ? "bg-slate-500" : "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-700"}`}>
                <div className="flex items-start justify-between">
                  <CreditCard className="h-6 w-6 opacity-90" />
                  <span className="text-xs font-semibold">{c.network}</span>
                </div>
                <div className="mt-6 font-mono text-base tracking-widest">{maskPan(c.pan)}</div>
                <div className="mt-3 flex items-end justify-between text-[11px]">
                  <span>{c.holder}</span>
                  <span>exp {c.expiry}</span>
                </div>
                {c.frozen ? <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm font-semibold">FROZEN</div> : null}
              </div>

              <Panel className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Linked to {acc?.name} · {acc ? formatMoney(acc.balance, acc.currency) : ""} · {c.form} card
                </div>
                <Toggle label="Freeze card" on={c.frozen} onChange={(v) => updateCard(c.id, { frozen: v })} icon={c.frozen ? Snowflake : Sun} />
                <Toggle label="Online payments" on={c.onlineEnabled} onChange={(v) => updateCard(c.id, { onlineEnabled: v })} />
                <Toggle label="Contactless" on={c.contactlessEnabled} onChange={(v) => updateCard(c.id, { contactlessEnabled: v })} />
                <Toggle label="Use abroad" on={c.abroadEnabled} onChange={(v) => updateCard(c.id, { abroadEnabled: v })} />
                <Field label={`Daily spend limit (${acc?.currency ?? country.currency})`}>
                  <input
                    type="number"
                    value={c.dailyLimit}
                    onChange={(e) => updateCard(c.id, { dailyLimit: Number(e.target.value) })}
                    className={inputCls}
                  />
                </Field>
              </Panel>
            </div>
          );
        })}

        <Panel className="space-y-3">
          <h2 className="text-sm font-semibold">Issue a new card</h2>
          <Field label="Network">
            <select value={network} onChange={(e) => setNetwork(e.target.value as CardNetwork)} className={inputCls}>
              <option>Pi Pay</option>
              <option>Visa</option>
              <option>Mastercard</option>
            </select>
          </Field>
          <Field label="Linked account">
            <select value={acct} onChange={(e) => setAcct(e.target.value)} className={inputCls}>
              {own.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Primary type="button" onClick={issue}>Issue virtual card</Primary>
        </Panel>
      </div>
    </AppShell>
  );
}

function Toggle({ label, on, onChange, icon: Icon }: { label: string; on: boolean; onChange: (v: boolean) => void; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between">
      <span className="flex items-center gap-2 text-sm">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        {label}
      </span>
      <span className={`relative h-6 w-11 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
