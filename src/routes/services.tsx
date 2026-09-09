import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { SERVICES, SERVICE_GROUPS } from "@/lib/services";
import { head } from "@/components/ServiceUi";

export const Route = createFileRoute("/services")({
  head: () =>
    head(
      "/services",
      "All banking services",
      "Every Pi Bank service: payments, deposits, lending, cards, FX, SWIFT correspondent banking, trade finance and Pi digital assets.",
    ),
  component: Services,
});

function Services() {
  return (
    <AppShell>
      <PageHeader
        title="All services"
        subtitle="Traditional banking, SWIFT and Pi-native, in one place"
        right={<CountrySwitcher />}
      />

      <div className="mx-5 mt-2 space-y-6 pb-6">
        {SERVICE_GROUPS.map((group) => (
          <section key={group}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h2>
            <div className="space-y-2">
              {SERVICES.filter((s) => s.group === group).map((s) => (
                <Link
                  key={s.id}
                  to={s.to}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${s.tint}`}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{s.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">{s.blurb}</span>
                    {s.messages ? (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {s.messages.map((m) => (
                          <span key={m} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {m}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
