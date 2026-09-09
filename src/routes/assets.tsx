import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { DIGITAL_ASSETS } from "@/lib/products";
import { formatMoney } from "@/lib/banking";
import { formatPi } from "@/lib/pi-settlement";
import { Card, KV, head } from "@/components/ServiceUi";
import { Coins } from "lucide-react";

export const Route = createFileRoute("/assets")({
  head: () =>
    head(
      "/assets",
      "Digital assets & CBDC",
      "Hold Pi, bank-issued tokenised deposits and bridged central-bank digital currencies side by side in one wallet view.",
    ),
  component: Assets,
});

const KIND_LABEL: Record<string, string> = {
  native: "Native crypto",
  "tokenised-deposit": "Tokenised deposit",
  cbdc: "Central bank digital currency",
};

function Assets() {
  const { accounts } = useBank();
  const piWallet = accounts.find((a) => a.type === "pi-wallet");

  return (
    <AppShell>
      <PageHeader title="Digital assets" subtitle="Pi, tokenised deposits and CBDC rails" right={<Coins className="h-5 w-5 text-muted-foreground" />} />
      <SimBanner />

      <div className="mx-5 mt-2 space-y-3 pb-6">
        {piWallet ? (
          <Card className="bg-gradient-to-br from-violet-600/15 to-fuchsia-600/10">
            <div className="text-xs text-muted-foreground">Pi Ecosystem Wallet</div>
            <div className="mt-1 text-2xl font-semibold">{formatPi(piWallet.balance)}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              ≈ {formatMoney(piWallet.balance * 25, "USD")} · settlement asset for every service in this app
            </div>
          </Card>
        ) : null}

        {DIGITAL_ASSETS.map((a) => (
          <Card key={a.symbol} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{a.name} <span className="font-mono text-xs text-muted-foreground">{a.symbol}</span></span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{KIND_LABEL[a.kind]}</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">{a.blurb}</p>
            <KV label="Network" value={a.network} />
            <KV label="Indicative value" value={formatMoney(a.priceUsd, "USD")} />
          </Card>
        ))}

        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">How on/off-ramps work</h2>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Fiat in your country accounts is tokenised 1:1 as a bank-issued deposit token, bridged to Pi Mainnet, and
            exchanged against Pi at the FX desk. CBDC legs use each central bank's own network — eNaira, e₹ and the
            Digital Dirham on mBridge — so cross-border value can move without a correspondent chain.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
