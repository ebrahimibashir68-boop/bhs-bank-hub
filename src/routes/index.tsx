import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { PiSignInBar } from "@/components/PiSignInBar";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney, convert } from "@/lib/banking";
import {
  ArrowLeftRight, Receipt, Banknote, Smartphone, Globe2, Sparkles, Eye, EyeOff, Settings,
  ShieldCheck, Landmark, Users, ArrowUpRight, BookOpen,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pi Bank — Global Banking for the Pi Ecosystem" },
      { name: "description", content: "Colorful all-in-one mobile banking: pay bills, transfer money, manage a Pi wallet, and bank internationally across 6 countries on World Bank-aligned infrastructure." },
      { name: "google-site-verification", content: "XPIwI92E0qc6n1t0heXo1wFtDKitHDE6v0-SuUtmKNA" },
      { property: "og:title", content: "Pi Bank — Global Banking for the Pi Ecosystem" },
      { property: "og:description", content: "Pay bills, send money worldwide, and manage your Pi wallet on open, inclusive financial infrastructure." },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/" }],
  }),
  component: Home,
});

const QUICK = [
  { to: "/transfer", icon: ArrowLeftRight, label: "Transfer", tint: "bg-pi/15 text-pi" },
  { to: "/bills", icon: Receipt, label: "Pay Bills", tint: "bg-sunrise/20 text-sunrise-foreground" },
  { to: "/cash", icon: Banknote, label: "Deposit", tint: "bg-mint/20 text-mint-foreground" },
  { to: "/topup", icon: Smartphone, label: "Top-up", tint: "bg-aqua/20 text-aqua-foreground" },
  { to: "/international", icon: Globe2, label: "Global", tint: "bg-coral/15 text-coral" },
  { to: "/pi", icon: Sparkles, label: "Pi Wallet", tint: "bg-pi/15 text-pi" },
] as const;

const PILLARS = [
  {
    icon: Users,
    title: "Universal Financial Access",
    body: "Open to everyone — no minimum balance, no exclusion. Aligned with the World Bank's financial-inclusion agenda.",
    tint: "from-mint/25 to-aqua/20",
  },
  {
    icon: Landmark,
    title: "Central-bank aligned",
    body: "Every country module follows its own central bank's limits, KYC tiers and reporting thresholds.",
    tint: "from-sunrise/30 to-coral/15",
  },
  {
    icon: ShieldCheck,
    title: "Open payment rails",
    body: "ISO 20022 messaging, interoperable domestic rails and SWIFT/SEPA corridors for cross-border value.",
    tint: "from-pi/25 to-aqua/20",
  },
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
      <div className="bg-aurora">
        <PageHeader
          title="Pi Bank"
          subtitle={`Welcome Alex · Banking with ${country.centralBank}`}
          right={
            <div className="flex items-center gap-2">
              <CountrySwitcher />
              <Link
                to="/settings"
                aria-label="Open settings"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-primary"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          }
        />
        <SimBanner />
        <PiSignInBar />

        {/* Balance hero */}
        <section className="mx-5 mt-2 overflow-hidden rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-lift">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-85">
              Total balance · {country.currency}
            </span>
            <button
              onClick={() => setHide((h) => !h)}
              aria-label="Toggle balance visibility"
              className="rounded-full bg-white/15 p-1.5 opacity-90 transition hover:opacity-100"
            >
              {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-3 text-4xl font-semibold tracking-tight">
            {hide ? "•••••••" : formatMoney(totalLocal, country.currency)}
          </div>
          <div className="mt-1.5 text-xs opacity-85">
            {countryAccounts.length} account{countryAccounts.length === 1 ? "" : "s"} • {country.flag} {country.name}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 text-[10px]">
            {country.rails.slice(0, 3).map((r) => (
              <span key={r} className="rounded-full bg-white/18 px-2 py-1 font-medium tracking-wide">
                {r}
              </span>
            ))}
            <span className="rounded-full bg-white/18 px-2 py-1 font-medium tracking-wide">ISO 20022</span>
          </div>

          {piWallet ? (
            <Link
              to="/pi"
              className="mt-4 flex items-center justify-between rounded-2xl bg-black/20 px-3.5 py-3 text-sm backdrop-blur transition hover:bg-black/30"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Pi Wallet
              </span>
              <span className="flex items-center gap-1 font-semibold">
                {hide ? "•••" : `π ${piWallet.balance.toFixed(2)}`}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-80" />
              </span>
            </Link>
          ) : null}
        </section>

        {/* Quick actions */}
        <section className="mx-5 mt-5 grid grid-cols-3 gap-3">
          {QUICK.map(({ to, icon: Icon, label, tint }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-[11px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          ))}
        </section>
      </div>

      {/* World Bank aligned pillars */}
      <section className="mx-5 mt-7">
        <h2 className="text-sm font-semibold">Built on open, inclusive infrastructure</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Public services for everyone in the Pi ecosystem, modelled on World Bank principles for payment systems.
        </p>
        <div className="mt-3 space-y-2.5">
          {PILLARS.map(({ icon: Icon, title, body, tint }) => (
            <div
              key={title}
              className={`rounded-2xl border border-border bg-gradient-to-br ${tint} p-3.5`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold">{title}</h3>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-foreground/75">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Accounts */}
      <section className="mx-5 mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your accounts</h2>
          <Link to="/more" className="text-xs font-medium text-primary">View all</Link>
        </div>
        <div className="space-y-2">
          {countryAccounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-aqua/20 text-base">
                  {country.flag}
                </span>
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-[11px] text-muted-foreground">{a.number} · {a.type}</div>
                </div>
              </div>
              <div className="text-sm font-semibold">{hide ? "•••" : formatMoney(a.balance, a.currency)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="mx-5 mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link to="/more" className="text-xs font-medium text-primary">History</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {recent.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No transactions yet.</div>
          ) : (
            recent.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-3.5 py-3 ${i ? "border-t border-border" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      t.amount < 0 ? "bg-coral/15 text-coral" : "bg-mint/25 text-mint-foreground"
                    }`}
                  >
                    <ArrowUpRight className={`h-4 w-4 ${t.amount < 0 ? "" : "rotate-180"}`} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.description}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.date} · {t.category}{t.channel ? ` · ${t.channel}` : ""}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-semibold ${t.amount < 0 ? "text-foreground" : "text-mint-foreground"}`}>
                  {t.amount < 0 ? "-" : "+"}{formatMoney(Math.abs(t.amount), t.currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Guide CTA */}
      <section className="mx-5 mt-7">
        <Link
          to="/guide"
          className="flex items-center justify-between rounded-2xl bg-hero-gradient p-4 text-primary-foreground shadow-lift"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="h-5 w-5" />
            <span>
              <span className="block text-sm font-semibold">Banking &amp; compliance guide</span>
              <span className="block text-[11px] opacity-85">KYC, central-bank reporting, SWIFT &amp; SEPA</span>
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    </AppShell>
  );
}
