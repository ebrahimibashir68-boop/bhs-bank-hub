import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { COUNTRY_LIST, COUNTRIES } from "@/lib/banking";
import { ShieldCheck, Globe2, Landmark, Sparkles } from "lucide-react";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Pi Network Banking & Compliance Guide — Pi Bank" },
      {
        name: "description",
        content:
          "How Pi Network integrates with regulated banking: KYC, central-bank reporting thresholds, SWIFT & SEPA rails, and what makes Pi legit as a real-world currency.",
      },
      { property: "og:title", content: "Pi Network Banking & Compliance Guide — Pi Bank" },
      {
        property: "og:description",
        content:
          "A plain-English guide to Pi's role in regulated banking, KYC, and cross-border payments.",
      },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/guide" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/guide" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Pi Network Banking & Compliance Guide",
          description:
            "How Pi Network integrates with regulated banking: KYC, central-bank reporting, SWIFT & SEPA, and Pi coin value in the real economy.",
          author: { "@type": "Organization", name: "Pi Bank" },
          mainEntityOfPage: "https://bhs-bank-hub.lovable.app/guide",
        }),
      },
    ],
  }),
  component: Guide,
});

function Guide() {
  return (
    <AppShell>
      <PageHeader
        title="Pi Network Banking & Compliance Guide"
        subtitle="How Pi bridges the Pi ecosystem and regulated banking"
      />

      <article className="mx-5 mt-2 space-y-6 pb-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Is Pi Network legit?
          </h2>
          <p className="text-muted-foreground">
            Pi Network is a mobile-first cryptocurrency ecosystem with millions of verified
            Pioneers. Legitimacy in a real-world banking sense comes from two things: (1) users
            completing KYC through the Pi app, and (2) apps like Pi Bank connecting the Pi wallet
            to regulated fiat rails so Pi can be paid, received, and reported alongside traditional
            money. This guide explains exactly how that bridge works.
          </p>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> KYC and identity
          </h2>
          <p className="text-muted-foreground">
            Every Pi Bank customer authenticates with Pi Network first (the{" "}
            <Link to="/pi" className="text-primary underline">
              Pi Wallet page
            </Link>{" "}
            triggers the standard Pi sign-in and username scope). Fiat accounts require additional
            KYC — government ID, proof of address — matching the standard used by each country's
            central bank. This is what turns a Pi identity into a bankable customer.
          </p>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <Landmark className="h-4 w-4 text-primary" /> Central-bank reporting thresholds
          </h2>
          <p className="text-muted-foreground">
            Every jurisdiction sets a threshold above which transactions are automatically reported
            to the central bank or financial-intelligence unit. Pi Bank applies these rules per
            country:
          </p>
          <ul className="mt-3 space-y-2">
            {COUNTRY_LIST.map((c) => {
              const country = COUNTRIES[c.code];
              return (
                <li
                  key={c.code}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {country.flag} {country.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {country.centralBank} · reports above{" "}
                      {country.reportingThreshold.toLocaleString()} {country.currency}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <Globe2 className="h-4 w-4 text-primary" /> SWIFT, SEPA, and cross-border Pi
          </h2>
          <p className="text-muted-foreground">
            Pi itself moves on the Pi blockchain. To pay a supplier in euros or receive a salary in
            pounds, Pi Bank routes the fiat leg over the same rails traditional banks use — SWIFT
            for global wires, SEPA for the euro area, ACH and Faster Payments domestically. The Pi
            leg and the fiat leg are recorded against the same customer, so reporting stays clean.
            See{" "}
            <Link to="/international" className="text-primary underline">
              International transfers
            </Link>{" "}
            for the live rails.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">What gives Pi coin real-world value?</h2>
          <p className="text-muted-foreground">
            Value comes from utility: merchants accepting Pi, apps letting Pioneers pay bills with
            Pi, and regulated bridges converting Pi to local currency. Pi Bank contributes on all
            three fronts — Pi wallet management, bill pay across six countries, and compliant
            fiat-Pi settlement. The more real transactions clear, the more anchored Pi becomes to
            everyday commerce.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Try it</h2>
          <ul className="space-y-1 text-sm">
            <li>
              →{" "}
              <Link to="/pi" className="text-primary underline">
                Sign in with Pi and view your wallet
              </Link>
            </li>
            <li>
              →{" "}
              <Link to="/international" className="text-primary underline">
                Send a cross-border payment
              </Link>
            </li>
            <li>
              →{" "}
              <Link to="/bills" className="text-primary underline">
                Pay a utility bill
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </AppShell>
  );
}
