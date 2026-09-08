import type { ReactNode } from "react";
import { Check } from "lucide-react";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}

export function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div className="mx-5 mt-2 flex gap-1 rounded-xl bg-muted/50 p-1">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onChange(it.id)}
          className={`flex-1 rounded-lg px-2 py-2 text-[11.5px] font-medium transition ${
            value === it.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function SwiftPreview({ title, body }: { title: string; body: string }) {
  return (
    <details className="rounded-xl border border-border bg-muted/30">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium">{title}</summary>
      <pre className="overflow-x-auto px-3 pb-3 font-mono text-[10.5px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{body}</pre>
    </details>
  );
}

export function Success({ title, lines, onDone, cta = "Done" }: { title: string; lines: string[]; onDone: () => void; cta?: string }) {
  return (
    <div className="mx-5 mt-6 rounded-2xl border border-border bg-card p-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <Check className="h-7 w-7" />
      </div>
      <div className="text-lg font-semibold">{title}</div>
      {lines.map((l) => (
        <div key={l} className="mt-1 text-sm text-muted-foreground">{l}</div>
      ))}
      <button onClick={onDone} className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">{cta}</button>
    </div>
  );
}

export function Primary({ children, disabled, onClick, type = "submit" }: { children: ReactNode; disabled?: boolean; onClick?: () => void; type?: "submit" | "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
      {children}
    </button>
  );
}

export function head(path: string, title: string, description: string) {
  return {
    meta: [
      { title: `${title} — Pi Bank` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — Pi Bank` },
      { property: "og:description", content: description },
      { property: "og:url", content: `https://bhs-bank-hub.lovable.app${path}` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `https://bhs-bank-hub.lovable.app${path}` }],
  };
}
