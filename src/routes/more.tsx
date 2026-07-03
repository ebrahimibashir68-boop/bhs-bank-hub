import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney } from "@/lib/banking";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import {
  Sparkles, ShieldCheck, Banknote, Receipt, ArrowLeftRight, FileText, Settings, LogOut, ChevronRight, Globe2,
} from "lucide-react";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "Accounts & Services — Pi Bank" },
      { name: "description", content: "View all your accounts, services, and country-specific central-bank compliance details in one place." },
      { property: "og:title", content: "Accounts & Services — Pi Bank" },
      { property: "og:description", content: "All accounts, services, and central-bank compliance in one place." },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/more" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/more" }],
  }),
  component: More,
});

function More() {
  const { accounts, activeCountry, txns } = useBank();
  const country = COUNTRIES[activeCountry];

  return (
    <AppShell>
      <PageHeader title="More" subtitle="Accounts, services, regulation" right={<CountrySwitcher />} />

      <section className="mx-5 mt-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">A</div>
          <div>
            <div className="text-sm font-semibold">Alex Citizen</div>
            <div className="text-[11px] text-muted-foreground">KYC verified · Pi Pioneer since 2021</div>
          </div>
        </div>
      </section>

      <section className="mx-5 mt-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">All accounts</h2>
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{a.type === "pi-wallet" ? "🟣" : COUNTRIES[a.country].flag}</span>
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-[11px] text-muted-foreground">{a.number} · {a.type}</div>
                </div>
              </div>
              <div className="text-sm font-semibold">{formatMoney(a.balance, a.currency)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Row to="/transfer" icon={ArrowLeftRight}>Transfer money</Row>
          <Row to="/bills" icon={Receipt}>Pay utility bills</Row>
          <Row to="/cash" icon={Banknote}>Deposit / withdraw</Row>
          <Row to="/international" icon={Globe2}>International transfer</Row>
          <Row to="/pi" icon={Sparkles}>Pi Wallet</Row>
        </div>
      </section>

      <section className="mx-5 mt-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Regulation — {country.flag} {country.name}
        </h2>
        <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-xs">
          <Info label="Central Bank" value={country.centralBank} />
          <Info label="Currency" value={country.currency} />
          <Info label="Domestic rails" value={country.rails.join(", ")} />
          <Info label="International rails" value={country.intlRails.join(", ")} />
          <Info label="Single-txn limit" value={formatMoney(country.singleTxnLimit, country.currency)} />
          <Info label="Daily limit" value={formatMoney(country.dailyLimit, country.currency)} />
          <Info label="Reporting threshold" value={formatMoney(country.reportingThreshold, country.currency)} />
          <Info label="KYC requires" value={country.kycRequired.join(", ")} />
          <div className="rounded-md bg-muted/40 px-2 py-2 text-[11px] text-muted-foreground">{country.amlNotes}</div>
        </div>
      </section>

      <section className="mx-5 mt-5 mb-8">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Row icon={ShieldCheck}>Security & 2FA</Row>
          <Row icon={FileText}>Statements ({txns.length} txns)</Row>
          <Row to="/settings" icon={Settings}>Settings</Row>
          <Row icon={LogOut}>Sign out</Row>
        </div>
      </section>
    </AppShell>
  );
}

function Row({ icon: Icon, children, to }: { icon: any; children: React.ReactNode; to?: string }) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{children}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </>
  );
  const className = "flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0 hover:bg-accent";
  return to ? (
    <Link to={to} className={className}>{inner}</Link>
  ) : (
    <button className={`${className} w-full text-left`}>{inner}</button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
