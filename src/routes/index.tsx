import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney, convert } from "@/lib/banking";
import {
  ArrowLeftRight, Receipt, Banknote, Smartphone, Send, Globe2, Sparkles, Eye, EyeOff,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pi Bank — Mobile Banking for the Pi Ecosystem" },
      { name: "description", content: "All-in-one mobile banking: pay bills, transfer money, manage Pi wallet, and bank internationally across 6 countries." },
      { property: "og:title", content: "Pi Bank — Mobile Banking for the Pi Ecosystem" },
      { property: "og:description", content: "Pay bills, send money worldwide, and manage your Pi wallet in one app." },
    ],
  }),
  component: Home,
});

const QUICK = [
  { to: "/transfer", icon: ArrowLeftRight, label: "Transfer" },
  { to: "/bills", icon: Receipt, label: "Pay Bills" },
  { to: "/cash", icon: Banknote, label: "Deposit" },
  { to: "/topup", icon: Smartphone, label: "Top-up" },
  { to: "/international", icon: Globe2, label: "Global" },
  { to: "/pi", icon: Sparkles, label: "Pi Wallet" },
] as const;

function Home() {
  const { accounts, txns, activeCountry } = useBank();
  const country = COUNTRIES[activeCountry];
  const [hide, setHide] = useState(false);

  const countryAccounts = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");
  const piWallet = accounts.find((a) => a.type === "pi-wallet");

  const totalLocal = useMemo(
    () => countryAccounts.reduce((sum, a) => sum + convert(a.balance, a.currency, country.currency), 0),
    [countryAccounts, country.currency],
  );

  const recent = txns
    .filter((t) => countryAccounts.some((a) => a.id === t.accountId))
    .slice(0, 5);

  return (
    <AppShell>
      <PageHeader
        title="Hello, Alex"
        subtitle={`Banking with ${country.centralBank}`}
        right={<CountrySwitcher />}
      />
      <SimBanner />

      <section className="mx-5 mt-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider opacity-80">Total balance · {country.currency}</span>
          <button onClick={() => setHide((h) => !h)} className="opacity-80">
            {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">
          {hide ? "•••••••" : formatMoney(totalLocal, country.currency)}
        </div>
        <div className="mt-1 text-xs opacity-80">
          {countryAccounts.length} account{countryAccounts.length === 1 ? "" : "s"} • {country.flag} {country.name}
        </div>
        {piWallet ? (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-black/15 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Pi Wallet</span>
            </div>
            <span className="font-medium">{hide ? "•••" : `π ${piWallet.balance.toFixed(2)}`}</span>
          </div>
        ) : null}
      </section>

      <section className="mx-5 mt-5 grid grid-cols-3 gap-3">
        {QUICK.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 text-xs font-medium hover:bg-accent"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
            {label}
          </Link>
        ))}
      </section>

      <section className="mx-5 mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your accounts</h2>
          <Link to="/more" className="text-xs text-primary">View all</Link>
        </div>
        <div className="space-y-2">
          {countryAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-[11px] text-muted-foreground">{a.number} · {a.type}</div>
              </div>
              <div className="text-sm font-semibold">{hide ? "•••" : formatMoney(a.balance, a.currency)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Send className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {recent.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No transactions yet.</div>
          ) : (
            recent.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-3 py-2.5 ${i ? "border-t border-border" : ""}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.description}</div>
                  <div className="text-[11px] text-muted-foreground">{t.date} · {t.category}{t.channel ? ` · ${t.channel}` : ""}</div>
                </div>
                <div className={`text-sm font-semibold ${t.amount < 0 ? "text-foreground" : "text-emerald-600"}`}>
                  {t.amount < 0 ? "-" : "+"}{formatMoney(Math.abs(t.amount), t.currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
