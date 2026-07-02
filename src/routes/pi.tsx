import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { formatMoney, convert } from "@/lib/banking";
import { Sparkles, ArrowDownLeft, ArrowUpRight, Pickaxe, QrCode, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePiAuth } from "@/components/PiAuthProvider";
import { getPi } from "@/lib/pi-sdk";
import { approvePiPayment, completePiPayment } from "@/lib/pi-auth.functions";

export const Route = createFileRoute("/pi")({
  head: () => ({
    meta: [
      { title: "Pi Wallet — Pi Bank" },
      { name: "description", content: "Sign in with Pi Network, send and receive Pi, and manage your Pi wallet alongside your fiat bank accounts." },
      { property: "og:title", content: "Pi Wallet — Pi Bank" },
      { property: "og:description", content: "Sign in with Pi Network and manage Pi alongside your fiat accounts." },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/pi" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/pi" }],
  }),
  component: Pi,
});

function Pi() {
  const { accounts, txns, addTxn, adjustBalance } = useBank();
  const wallet = accounts.find((a) => a.type === "pi-wallet");
  const piTxns = txns.filter((t) => wallet && t.accountId === wallet.id);
  const [mode, setMode] = useState<"none" | "send" | "receive">("none");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const { session, scopes, hasScope, signIn } = usePiAuth();
  const approve = useServerFn(approvePiPayment);
  const complete = useServerFn(completePiPayment);
  const needsPaymentsScope = !!session && !hasScope("payments");

  if (!wallet) return null;


  const usdValue = convert(wallet.balance, "PI", "USD");

  function send(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (!wallet || amt <= 0 || amt > wallet.balance) return;
    adjustBalance(wallet.id, -amt);
    addTxn({
      accountId: wallet.id,
      description: `Sent to @${to || "user"}`,
      category: "Transfer",
      amount: -amt,
      currency: "PI",
      channel: "Pi Network",
    });
    setMode("none");
    setAmount("");
    setTo("");
  }

  async function payApp() {
    setPayStatus(null);
    let active = session;
    if (!active) {
      await signIn();
      // session won't be updated until next render — bail and let user retry
      setPayStatus("Sign in completed — tap Pay App again.");
      return;
    }
    setPaying(true);
    try {
      const Pi = await getPi();
      await new Promise<void>((resolve, reject) => {
        Pi.createPayment(
          {
            amount: 1,
            memo: "Pi Bank — ecosystem setup verification",
            metadata: { kind: "setup_verification", uid: active!.uid },
          },
          {
            onReadyForServerApproval: async (paymentId) => {
              setPayStatus(`Approving ${paymentId}…`);
              await approve({ data: { paymentId } });
            },
            onReadyForServerCompletion: async (paymentId, txid) => {
              setPayStatus(`Completing ${paymentId}…`);
              await complete({ data: { paymentId, txid } });
              addTxn({
                accountId: wallet!.id,
                description: "Paid Pi Bank app fee",
                category: "Payment",
                amount: -1,
                currency: "PI",
                channel: "Pi Network",
              });
              adjustBalance(wallet!.id, -1);
              setPayStatus(`Payment complete · txid ${txid.slice(0, 10)}…`);
              resolve();
            },
            onCancel: (paymentId) => {
              setPayStatus(`Payment cancelled (${paymentId})`);
              resolve();
            },
            onError: (error) => {
              setPayStatus(`Error: ${error.message}`);
              reject(error);
            },
          },
        );
      });
    } catch (e) {
      setPayStatus(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Pi Wallet" subtitle="Pi Network · Mainnet (mock)" />
      <SimBanner />

      <section className="mx-5 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
          <Sparkles className="h-4 w-4" /> Pi Balance
        </div>
        <div className="mt-2 text-3xl font-semibold">π {wallet.balance.toFixed(2)}</div>
        <div className="text-xs opacity-90">≈ {formatMoney(usdValue, "USD")}</div>
        <div className="mt-4 text-[11px] opacity-80 break-all">{wallet.number}</div>
      </section>

      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        <Action icon={ArrowUpRight} label="Send" onClick={() => setMode("send")} />
        <Action icon={ArrowDownLeft} label="Receive" onClick={() => setMode("receive")} />
        <Action icon={Pickaxe} label="Mining" />
      </div>

      {mode === "send" ? (
        <form onSubmit={send} className="mx-5 mt-5 space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Send Pi</h2>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@username or wallet address" className="input" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0.00 π" className="input text-lg" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("none")} className="flex-1 rounded-md border border-border py-2 text-sm">Cancel</button>
            <button className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground">Send Pi</button>
          </div>
        </form>
      ) : null}

      {mode === "receive" ? (
        <div className="mx-5 mt-5 rounded-xl border border-border bg-card p-4 text-center">
          <h2 className="mb-3 text-sm font-semibold">Receive Pi</h2>
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <QrCode className="h-24 w-24" />
          </div>
          <div className="mt-3 break-all text-xs">{wallet.number}</div>
          <button onClick={() => setMode("none")} className="mt-4 rounded-md border border-border px-4 py-2 text-sm">Close</button>
        </div>
      ) : null}

      <section className="mx-5 mt-5 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Pay Pi Bank app fee</h2>
        <p className="text-[11px] text-muted-foreground">Sends a 1 π payment to confirm Pi ecosystem setup.</p>
        <button
          onClick={() => void payApp()}
          disabled={paying}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Pay 1 π
        </button>
        {payStatus ? <div className="mt-2 text-[11px] text-muted-foreground">{payStatus}</div> : null}
      </section>

      <section className="mx-5 mt-6">
        <h2 className="mb-2 text-sm font-semibold">Pi activity</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {piTxns.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No Pi activity yet.</div>
          ) : piTxns.map((t, i) => (
            <div key={t.id} className={`flex items-center justify-between px-3 py-2.5 ${i ? "border-t border-border" : ""}`}>
              <div>
                <div className="text-sm font-medium">{t.description}</div>
                <div className="text-[11px] text-muted-foreground">{t.date}</div>
              </div>
              <div className={`text-sm font-semibold ${t.amount < 0 ? "" : "text-emerald-600"}`}>
                {t.amount < 0 ? "-" : "+"}π {Math.abs(t.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>
      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}`}</style>
    </AppShell>
  );
}

function Action({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-xs font-medium">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
        <Icon className="h-4.5 w-4.5" />
      </div>
      {label}
    </button>
  );
}
