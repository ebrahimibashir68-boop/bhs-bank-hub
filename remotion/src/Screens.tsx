import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "./theme";

const Bar: React.FC<{ w: number; h?: number; c?: string; r?: number }> = ({ w, h = 10, c = "#2A2044", r = 6 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: c }} />
);

const Card: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 18,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      ...style,
    }}
  >
    {children}
  </div>
);

const Row: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ color: COLORS.muted, fontSize: 15 }}>{label}</span>
    <span style={{ color: accent ?? COLORS.cream, fontSize: 16, fontWeight: 600 }}>{value}</span>
  </div>
);

export const Screen: React.FC<{ kind: string; accent: string }> = ({ kind, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });

  const item = (i: number): React.CSSProperties => ({
    opacity: rise(10 + i * 6),
    transform: `translateY(${interpolate(rise(10 + i * 6), [0, 1], [26, 0])}px)`,
  });

  const pulse = 1 + Math.sin(frame / 16) * 0.012;

  if (kind === "home") {
    return (
      <>
        <div style={item(0)}>
          <Card style={{ background: `linear-gradient(135deg, ${accent}33, ${COLORS.violet}44)` }}>
            <span style={{ color: COLORS.muted, fontSize: 13, letterSpacing: 1 }}>TOTAL BALANCE</span>
            <span style={{ color: COLORS.cream, fontSize: 40, fontWeight: 700 }}>π 4,182.60</span>
            <span style={{ color: accent, fontSize: 15 }}>≈ $12,547.80 USD</span>
          </Card>
        </div>
        <div style={{ ...item(1), display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {["Transfer", "Bills", "Top up", "Global"].map((t) => (
            <Card key={t} style={{ alignItems: "center", padding: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, background: accent, opacity: 0.85 }} />
              <span style={{ color: COLORS.cream, fontSize: 15 }}>{t}</span>
            </Card>
          ))}
        </div>
        <div style={item(2)}>
          <Card>
            <Row label="Salary · SEPA" value="+ π 240.00" accent={COLORS.mint} />
            <Row label="Electric bill" value="− π 18.40" />
          </Card>
        </div>
      </>
    );
  }

  if (kind === "wallet") {
    return (
      <>
        <div style={{ ...item(0), transform: `scale(${pulse})` }}>
          <Card style={{ alignItems: "center", gap: 14, padding: 22, background: `linear-gradient(160deg, ${COLORS.violet}55, ${COLORS.fuchsia}33)` }}>
            <div style={{ width: 74, height: 74, borderRadius: 999, background: `linear-gradient(135deg, ${COLORS.fuchsia}, ${COLORS.violet})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 36, fontWeight: 800 }}>
              π
            </div>
            <span style={{ color: COLORS.cream, fontSize: 20, fontWeight: 700 }}>Connect Pi Wallet</span>
            <span style={{ color: COLORS.muted, fontSize: 14, textAlign: "center" }}>Sign in with your Pi Network account</span>
          </Card>
        </div>
        <div style={item(1)}>
          <Card>
            {["username", "payments", "wallet_address"].map((s, i) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", opacity: rise(30 + i * 10) }}>
                <span style={{ color: COLORS.cream, fontSize: 15, fontFamily: "monospace" }}>{s}</span>
                <span style={{ color: COLORS.mint, fontSize: 15 }}>granted ✓</span>
              </div>
            ))}
          </Card>
        </div>
        <div style={item(3)}>
          <Card>
            <span style={{ color: COLORS.muted, fontSize: 12, letterSpacing: 1 }}>PI ECOSYSTEM WALLET</span>
            <span style={{ color: COLORS.cream, fontFamily: "monospace", fontSize: 14 }}>GDPI…7QK4XZ</span>
          </Card>
        </div>
      </>
    );
  }

  if (kind === "transfer") {
    return (
      <>
        <div style={item(0)}>
          <Card>
            <Row label="From" value="Everyday · ••4821" />
            <Row label="To" value="A. Rahimi" />
          </Card>
        </div>
        <div style={{ ...item(1), transform: `scale(${pulse})` }}>
          <Card style={{ alignItems: "center", background: `linear-gradient(135deg, ${accent}33, transparent)` }}>
            <span style={{ color: COLORS.muted, fontSize: 13 }}>AMOUNT</span>
            <span style={{ color: COLORS.cream, fontSize: 44, fontWeight: 700 }}>$250.00</span>
            <span style={{ color: accent, fontSize: 18, fontWeight: 600 }}>= π 83.33</span>
          </Card>
        </div>
        <div style={item(2)}>
          <div style={{ background: accent, color: "#0B0718", borderRadius: 14, padding: "14px 0", textAlign: "center", fontSize: 17, fontWeight: 700 }}>
            Pay with Pi
          </div>
        </div>
      </>
    );
  }

  if (kind === "bills") {
    return (
      <>
        <div style={item(0)}>
          <Card>
            <span style={{ color: COLORS.muted, fontSize: 13, letterSpacing: 1 }}>BILLERS</span>
            {[["Electricity", "π 18.40"], ["Mobile top-up", "π 6.00"], ["Internet", "π 12.10"]].map(([a, b], i) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", opacity: rise(18 + i * 8) }}>
                <span style={{ color: COLORS.cream, fontSize: 16 }}>{a}</span>
                <span style={{ color: accent, fontSize: 16, fontWeight: 600 }}>{b}</span>
              </div>
            ))}
          </Card>
        </div>
        <div style={item(2)}>
          <Card>
            <Row label="Account no." value="8842 0193" />
            <Row label="Settles in" value="π 18.40" accent={accent} />
          </Card>
        </div>
        <div style={item(3)}>
          <div style={{ background: accent, color: "#0B0718", borderRadius: 14, padding: "14px 0", textAlign: "center", fontSize: 17, fontWeight: 700 }}>
            Confirm payment
          </div>
        </div>
      </>
    );
  }

  if (kind === "global") {
    return (
      <>
        <div style={item(0)}>
          <Card>
            <span style={{ color: COLORS.muted, fontSize: 12, letterSpacing: 1 }}>IBAN</span>
            <span style={{ color: COLORS.cream, fontFamily: "monospace", fontSize: 15 }}>DE89 3704 0044 0532 0130 00</span>
            <span style={{ color: COLORS.mint, fontSize: 14 }}>valid ✓ ISO 13616</span>
          </Card>
        </div>
        <div style={item(1)}>
          <Card>
            <Row label="BIC" value="COBADEFFXXX" />
            <Row label="Rail" value="SEPA / SWIFT" accent={accent} />
            <Row label="Charges" value="SHA" />
          </Card>
        </div>
        <div style={item(2)}>
          <Card style={{ background: "rgba(52,211,153,0.10)" }}>
            <span style={{ color: COLORS.mint, fontSize: 15 }}>Screening passed · UETR issued</span>
            <span style={{ color: COLORS.muted, fontFamily: "monospace", fontSize: 13 }}>pacs.008 · MT103</span>
          </Card>
        </div>
      </>
    );
  }

  if (kind === "assist") {
    return (
      <>
        {[["Pi Assist", COLORS.fuchsia], ["OpenMind", COLORS.aqua], ["RoboPay", COLORS.mint]].map(([n, c], i) => (
          <div key={n} style={item(i)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, borderColor: `${c}66` }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: c as string }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ color: COLORS.cream, fontSize: 17, fontWeight: 600 }}>{n}</span>
                <Bar w={150} h={8} />
              </div>
            </Card>
          </div>
        ))}
        <div style={item(3)}>
          <Card style={{ background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: COLORS.muted, fontSize: 14 }}>“Pay my electricity bill”</span>
            <span style={{ color: COLORS.cream, fontSize: 15 }}>Confirm before I continue?</span>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={item(0)}>
        <Card>
          <Row label="Theme" value="System" />
          <Row label="Language" value="English" />
          <Row label="Desktop site" value="Off" accent={accent} />
        </Card>
      </div>
      <div style={item(1)}>
        <Card>
          <Row label="Pi Wallet" value="Connected" accent={COLORS.mint} />
          <Row label="Scopes" value="3 granted" />
        </Card>
      </div>
      <div style={item(2)}>
        <Card style={{ alignItems: "center", background: `linear-gradient(135deg, ${COLORS.violet}44, ${COLORS.fuchsia}33)` }}>
          <span style={{ color: COLORS.cream, fontSize: 18, fontWeight: 700 }}>You're all set</span>
        </Card>
      </div>
    </>
  );
};
