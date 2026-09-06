import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, SceneSpec } from "./theme";
import { Screen } from "./Screens";

export const Scene: React.FC<{ spec: SceneSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleSpring = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ padding: "0 96px", flexDirection: "row", alignItems: "center", gap: 80 }}>
      {/* Left copy */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            alignSelf: "flex-start",
            padding: "8px 18px",
            borderRadius: 999,
            border: `1px solid ${spec.accent}66`,
            background: `${spec.accent}1F`,
            color: spec.accent,
            fontSize: 20,
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: inSpring,
            transform: `translateX(${interpolate(inSpring, [0, 1], [-40, 0])}px)`,
          }}
        >
          {spec.kicker}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 76,
            lineHeight: 1.02,
            fontWeight: 800,
            color: COLORS.cream,
            letterSpacing: -2,
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
          }}
        >
          {spec.title}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 10 }}>
          {spec.bullets.map((b, i) => {
            const s = spring({ frame: frame - 16 - i * 8, fps, config: { damping: 18, stiffness: 130 } });
            return (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: 999, background: spec.accent, boxShadow: `0 0 24px ${spec.accent}` }} />
                <span style={{ color: COLORS.muted, fontSize: 30 }}>{b}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone mock */}
      <div
        style={{
          width: 430,
          height: 860,
          borderRadius: 54,
          padding: 16,
          background: "linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: `0 60px 120px -40px ${spec.accent}88`,
          opacity: inSpring,
          transform: `translateY(${interpolate(inSpring, [0, 1], [70, 0])}px) rotate(${interpolate(inSpring, [0, 1], [3, 0])}deg)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 42,
            background: "linear-gradient(180deg, #140B2A, #0B0718)",
            padding: 22,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.muted, fontSize: 13 }}>
            <span>Pi Browser</span>
            <span>π Mainnet</span>
          </div>
          <Screen kind={spec.screen} accent={spec.accent} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
