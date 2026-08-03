import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import { useBank } from "@/lib/store";
import { COUNTRIES, COUNTRY_LIST, formatMoney, convert, type CountryCode } from "@/lib/banking";
import {
  BANK_IDENTITY,
  CHARGE_BEARERS,
  PURPOSE_CODES,
  addBusinessDays,
  buildMt103,
  buildPacs008,
  chargesFor,
  formatIban,
  generateEndToEndId,
  generateMessageId,
  generateUetr,
  isoDate,
  messageTypeForRail,
  screenPayment,
  validateAccountIdentifier,
  validateBic,
  type ChargeBearer,
  type PaymentInstruction,
  type PurposeCode,
} from "@/lib/iso20022";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Globe2, ShieldCheck, ShieldAlert, FileCode2 } from "lucide-react";

export const Route = createFileRoute("/international")({
  head: () => ({
    meta: [
      { title: "SWIFT & ISO 20022 Transfers — Pi Bank" },
      { name: "description", content: "Send cross-border payments on SWIFT gpi, SEPA and TARGET2 with IBAN/BIC validation, UETR tracking, charge bearers and pacs.008 / MT103 messages." },
      { property: "og:title", content: "SWIFT & ISO 20022 Transfers — Pi Bank" },
      { property: "og:description", content: "Standards-compliant cross-border payments with IBAN/BIC validation, UETR tracking and pacs.008 / MT103 message generation." },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/international" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/international" }],
  }),
  component: Intl,
});

function Intl() {
  const { accounts, activeCountry, addTxn, adjustBalance } = useBank();
  const fromCountry = COUNTRIES[activeCountry];
  const originId = BANK_IDENTITY[activeCountry];
  const own = accounts.filter((a) => a.country === activeCountry && a.type !== "pi-wallet");

  const [from, setFrom] = useState(own[0]?.id ?? "");
  const [toCountry, setToCountry] = useState<CountryCode>(
    (COUNTRY_LIST.find((c) => c.code !== activeCountry)?.code as CountryCode) ?? "GB",
  );
  const dest = COUNTRIES[toCountry];
  const destId = BANK_IDENTITY[toCountry];

  const [amount, setAmount] = useState("");
  const [rail, setRail] = useState(fromCountry.intlRails[0]!);
  const [account, setAccount] = useState("");
  const [bic, setBic] = useState(destId.bic);
  const [name, setName] = useState("");
  const [bearer, setBearer] = useState<ChargeBearer>("SHAR");
  const [purpose, setPurpose] = useState<PurposeCode>("FAMS");
  const [remittance, setRemittance] = useState("");
  const [showXml, setShowXml] = useState(false);
  const [receipt, setReceipt] = useState<PaymentInstruction | null>(null);

  const fromAcct = accounts.find((a) => a.id === from);
  const ccy = fromAcct?.currency ?? fromCountry.currency;
  const amt = parseFloat(amount) || 0;

  const rate = useMemo(() => convert(1, ccy, dest.currency), [ccy, dest.currency]);
  const converted = amt * rate;

  const acctCheck = validateAccountIdentifier(toCountry, account);
  const bicCheck = validateBic(bic);
  const msgType = messageTypeForRail(rail);
  const charges = chargesFor(amt, bearer, true);
  const valueDate = isoDate(addBusinessDays(new Date(), destId.settlementDays));

  const screening = useMemo(
    () =>
      screenPayment({
        beneficiaryName: name,
        beneficiaryBic: bic,
        amount: amt,
        currency: ccy,
        originCountry: activeCountry,
        destinationCountry: toCountry,
      }),
    [name, bic, amt, ccy, activeCountry, toCountry],
  );

  const ready =
    !!fromAcct && amt > 0 && acctCheck.valid && bicCheck.valid && name.trim().length > 1 && screening.status !== "blocked";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAcct || !ready) return;
    const instruction: PaymentInstruction = {
      uetr: generateUetr(),
      messageId: generateMessageId(),
      endToEndId: generateEndToEndId(),
      createdAt: new Date().toISOString(),
      valueDate,
      amount: amt,
      currency: ccy,
      instructedAmount: { amount: converted, currency: dest.currency },
      exchangeRate: rate,
      chargeBearer: bearer,
      purpose,
      remittanceInfo: remittance,
      debtor: { name: "Pi Bank Customer", account: fromAcct.number.replace(/\D/g, "") || "000000", bic: originId.bic, country: activeCountry },
      creditor: { name, account, bic, country: toCountry },
      intermediaryBic: originId.correspondentBic,
      rail,
    };
    adjustBalance(fromAcct.id, -(amt + charges.debtorCharges));
    addTxn({
      accountId: fromAcct.id,
      description: `${msgType.mt !== "—" ? msgType.mt : msgType.iso} → ${name} (${dest.code})`,
      category: "International",
      amount: -(amt + charges.debtorCharges),
      currency: ccy,
      channel: rail,
      status: "pending",
    });
    setReceipt(instruction);
  }

  if (receipt) {
    return (
      <AppShell>
        <PageHeader title="Payment instructed" subtitle={`${msgType.name} · ${msgType.iso}`} />
        <div className="mx-5 mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <div className="text-center text-lg font-semibold">{formatMoney(receipt.amount, receipt.currency)}</div>
          <div className="mt-1 text-center text-sm text-muted-foreground">
            → {formatMoney(receipt.instructedAmount!.amount, dest.currency)} · {dest.flag} {dest.name}
          </div>

          <dl className="mt-4 space-y-1 rounded-lg bg-muted/50 p-3 text-[11px]">
            <Row label="UETR (gpi tracker)" value={receipt.uetr} mono />
            <Row label="End-to-end ID" value={receipt.endToEndId} mono />
            <Row label="Message" value={`${receipt.rail} · ${msgType.iso}${msgType.mt !== "—" ? ` / ${msgType.mt}` : ""}`} />
            <Row label="Value date" value={receipt.valueDate} />
            <Row label="Charge bearer" value={CHARGE_BEARERS.find((c) => c.code === bearer)!.label} />
            <Row label="Debtor agent" value={originId.bic} mono />
            <Row label="Intermediary" value={receipt.intermediaryBic!} mono />
            <Row label="Creditor agent" value={receipt.creditor.bic} mono />
            <Row label="Purpose" value={`${receipt.purpose} — ${PURPOSE_CODES.find((p) => p.code === receipt.purpose)!.label}`} />
            <Row label="Settlement" value={`${originId.settlementMethod} via ${dest.centralBank}`} />
          </dl>

          <button
            onClick={() => setShowXml((v) => !v)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-xs font-medium"
          >
            <FileCode2 className="h-4 w-4" /> {showXml ? "Hide" : "View"} pacs.008 / MT103
          </button>
          {showXml ? (
            <div className="mt-3 space-y-3">
              <Pre title="pacs.008.001.08 (ISO 20022)" body={buildPacs008(receipt)} />
              <Pre title="MT103 (SWIFT FIN)" body={buildMt103(receipt)} />
            </div>
          ) : null}

          <button
            onClick={() => { setReceipt(null); setAmount(""); setShowXml(false); }}
            className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground"
          >
            New payment
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="International"
        subtitle="SWIFT gpi · ISO 20022"
        right={<Globe2 className="h-5 w-5 text-muted-foreground" />}
      />
      <SimBanner />
      <form onSubmit={submit} className="mx-5 mt-2 space-y-4 pb-4">
        <div className="rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
          <Row label="Ordering institution" value={originId.bic} mono />
          <Row label={originId.memberIdLabel} value={originId.memberId} mono />
          <Row label="Supervisor" value={fromCountry.centralBank} />
        </div>

        <Field label="Debtor account">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="select">
            {own.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatMoney(a.balance, a.currency)}</option>)}
          </select>
        </Field>

        <Field label="Beneficiary country">
          <select
            value={toCountry}
            onChange={(e) => {
              const c = e.target.value as CountryCode;
              setToCountry(c);
              setBic(BANK_IDENTITY[c].bic);
              setAccount("");
            }}
            className="select"
          >
            {COUNTRY_LIST.filter((c) => c.code !== activeCountry).map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.currency})</option>
            ))}
          </select>
        </Field>

        <Field label="Rail / scheme">
          <select value={rail} onChange={(e) => setRail(e.target.value)} className="select">
            {fromCountry.intlRails.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {msgType.name} · {msgType.iso}{msgType.mt !== "—" ? ` / ${msgType.mt}` : ""}
          </div>
        </Field>

        <Field label="Beneficiary name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Full legal name" />
        </Field>

        <Field label={destId.ibanPrefix ? "Beneficiary IBAN (ISO 13616)" : "Beneficiary account number"}>
          <input
            value={destId.ibanPrefix ? formatIban(account) : account}
            onChange={(e) => setAccount(e.target.value)}
            className="input font-mono"
            placeholder={destId.ibanPrefix ? `${destId.ibanPrefix}00 ...` : "account number"}
          />
          {account && !acctCheck.valid ? (
            <div className="mt-1 text-[11px] text-destructive">{acctCheck.reason}</div>
          ) : account ? (
            <div className="mt-1 text-[11px] text-emerald-600">Checksum valid</div>
          ) : null}
        </Field>

        <Field label="Beneficiary bank BIC (ISO 9362)">
          <input value={bic} onChange={(e) => setBic(e.target.value.toUpperCase())} className="input font-mono" placeholder="BANKGB2LXXX" />
          {bic && !bicCheck.valid ? <div className="mt-1 text-[11px] text-destructive">{bicCheck.reason}</div> : null}
        </Field>

        <Field label={`Instructed amount (${ccy})`}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="0.00" className="input text-lg" />
        </Field>

        <Field label="Charge bearer (ISO 20022 ChrgBr)">
          <select value={bearer} onChange={(e) => setBearer(e.target.value as ChargeBearer)} className="select">
            {CHARGE_BEARERS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="Purpose code">
          <select value={purpose} onChange={(e) => setPurpose(e.target.value as PurposeCode)} className="select">
            {PURPOSE_CODES.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
          </select>
        </Field>

        <Field label="Remittance information (unstructured)">
          <input value={remittance} onChange={(e) => setRemittance(e.target.value)} className="input" maxLength={140} placeholder="Invoice / reference" />
        </Field>

        <div className="rounded-xl border border-border bg-card p-3 text-xs">
          <Row label="Beneficiary receives" value={formatMoney(Math.max(converted - charges.beneficiaryDeduction * rate, 0), dest.currency)} bold />
          <Row label="Your charges" value={formatMoney(charges.debtorCharges, ccy)} />
          <Row label="FX rate" value={`1 ${ccy} = ${rate.toFixed(6)} ${dest.currency}`} />
          <Row label="Value date" value={valueDate} />
          <Row label="Correspondent" value={originId.correspondentBic} mono />
        </div>

        <div className={`rounded-xl border p-3 text-xs ${screening.status === "blocked" ? "border-destructive/40 bg-destructive/10" : "border-border bg-card"}`}>
          <div className="mb-2 flex items-center gap-2 font-medium">
            {screening.status === "blocked" ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}
            AML / sanctions screening — {screening.status}
          </div>
          {screening.checks.map((c) => (
            <div key={c.name} className="flex items-start justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">{c.name}</span>
              <span className={c.passed ? "text-right text-emerald-600" : "text-right text-destructive"}>{c.detail}</span>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={!ready}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Submit {msgType.mt !== "—" ? msgType.mt : "pacs.008"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}.select{width:100%;border:1px solid var(--color-border);background:var(--color-card);border-radius:.5rem;padding:.65rem .75rem;font-size:.875rem}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${bold ? "font-semibold" : ""} ${mono ? "font-mono break-all" : ""}`}>{value}</span>
    </div>
  );
}

function Pre({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{title}</div>
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted/60 p-3 text-[10px] leading-snug">{body}</pre>
    </div>
  );
}
