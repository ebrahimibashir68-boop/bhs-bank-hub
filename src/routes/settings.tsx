import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { usePiAuth } from "@/components/PiAuthProvider";
import {
  Monitor, Moon, Sun, Bell, Languages, EyeOff, Sparkles, LogOut, Loader2,
  ShieldCheck, Trash2, Info, ChevronRight, Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pi Bank" },
      { name: "description", content: "Manage app settings: desktop site, theme, notifications, language, privacy, and connect your Pi wallet." },
      { property: "og:title", content: "Settings — Pi Bank" },
      { property: "og:description", content: "Manage app settings and connect your Pi wallet." },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/settings" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/settings" }],
  }),
  component: SettingsPage,
});

type Prefs = {
  desktopSite: boolean;
  theme: "light" | "dark" | "system";
  notifications: boolean;
  hideBalances: boolean;
  language: string;
  biometric: boolean;
  analytics: boolean;
};

const DEFAULTS: Prefs = {
  desktopSite: false,
  theme: "system",
  notifications: true,
  hideBalances: false,
  language: "en",
  biometric: false,
  analytics: true,
};

const KEY = "pi-bank:prefs";

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function applyDesktopSite(enabled: boolean) {
  if (typeof document === "undefined") return;
  const el = document.querySelector('meta[name="viewport"]');
  const content = enabled
    ? "width=1280"
    : "width=device-width, initial-scale=1";
  if (el) el.setAttribute("content", content);
  else {
    const m = document.createElement("meta");
    m.name = "viewport";
    m.content = content;
    document.head.appendChild(m);
  }
}

function applyTheme(theme: Prefs["theme"]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const { session, status, scopes, signIn, signOut } = usePiAuth();

  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    applyDesktopSite(p.desktopSite);
    applyTheme(p.theme);
  }, []);

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
    if (key === "desktopSite") applyDesktopSite(value as boolean);
    if (key === "theme") applyTheme(value as Prefs["theme"]);
  }

  function resetAll() {
    if (!confirm("Reset all app settings to defaults?")) return;
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
    setPrefs(DEFAULTS);
    applyDesktopSite(false);
    applyTheme("system");
  }

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="App preferences & Pi wallet" />

      {/* Pi wallet connection */}
      <section className="mx-5 mt-2 rounded-2xl border border-violet-300/40 bg-gradient-to-br from-violet-600/10 to-fuchsia-500/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-violet-600" /> Pi Wallet Connection
        </div>
        {session ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">@{session.username}</div>
                  <div className="text-[11px] text-muted-foreground">uid: {session.uid.slice(0, 12)}…</div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  Connected
                </span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Scopes: {scopes.length ? scopes.join(", ") : "—"}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/pi" className="flex-1 rounded-md bg-violet-600 px-3 py-2 text-center text-xs font-medium text-white">
                Open Pi Wallet
              </Link>
              <button
                onClick={() => void signIn(["username", "payments"])}
                className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-medium"
              >
                Re-authorize
              </button>
              <button
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-medium text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Connect your Pi wallet to send/receive Pi and pay app fees. Open this app inside the Pi Browser.
            </p>
            <button
              onClick={() => void signIn(["username", "payments"])}
              disabled={status === "loading"}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Connect Pi Wallet
            </button>
          </div>
        )}
      </section>

      {/* Display */}
      <Group title="Display">
        <ToggleRow
          icon={Monitor}
          label="Desktop site"
          hint="Request the desktop layout at 1280px wide"
          value={prefs.desktopSite}
          onChange={(v) => update("desktopSite", v)}
        />
        <SelectRow
          icon={prefs.theme === "dark" ? Moon : Sun}
          label="Theme"
          value={prefs.theme}
          onChange={(v) => update("theme", v as Prefs["theme"])}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <ToggleRow
          icon={EyeOff}
          label="Hide balances by default"
          value={prefs.hideBalances}
          onChange={(v) => update("hideBalances", v)}
        />
      </Group>

      {/* App */}
      <Group title="Application">
        <ToggleRow
          icon={Bell}
          label="Push notifications"
          hint="Transaction alerts & security notices"
          value={prefs.notifications}
          onChange={(v) => update("notifications", v)}
        />
        <SelectRow
          icon={Languages}
          label="Language"
          value={prefs.language}
          onChange={(v) => update("language", v)}
          options={[
            { value: "en", label: "English" },
            { value: "es", label: "Español" },
            { value: "fr", label: "Français" },
            { value: "de", label: "Deutsch" },
            { value: "ar", label: "العربية" },
            { value: "hi", label: "हिन्दी" },
            { value: "zh", label: "中文" },
          ]}
        />
        <ToggleRow
          icon={Smartphone}
          label="Biometric unlock"
          hint="Use Face ID / fingerprint on capable devices"
          value={prefs.biometric}
          onChange={(v) => update("biometric", v)}
        />
      </Group>

      {/* Privacy */}
      <Group title="Privacy & Security">
        <ToggleRow
          icon={ShieldCheck}
          label="Anonymous analytics"
          hint="Help improve the app with usage stats"
          value={prefs.analytics}
          onChange={(v) => update("analytics", v)}
        />
        <LinkRow icon={Info} to="/guide">About Pi Bank & compliance</LinkRow>
      </Group>

      <section className="mx-5 mt-5 mb-8">
        <button
          onClick={resetAll}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Reset all settings
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Pi Bank simulation · v1.0.0
        </p>
      </section>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-5 mt-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>
    </section>
  );
}

function ToggleRow({
  icon: Icon, label, hint, value, onChange,
}: { icon: any; label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm">{label}</div>
          {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SelectRow({
  icon: Icon, label, value, onChange, options,
}: { icon: any; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function LinkRow({ icon: Icon, children, to }: { icon: any; children: React.ReactNode; to: string }) {
  return (
    <Link to={to} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0 hover:bg-accent">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{children}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
