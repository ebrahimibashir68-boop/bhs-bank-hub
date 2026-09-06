import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "./theme";

export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, c: string, size: number, speed: number, phase: number) => ({
    position: "absolute" as const,
    left: x + Math.sin((f + phase) / speed) * 90,
    top: y + Math.cos((f + phase) / (speed * 1.3)) * 70,
    width: size,
    height: size,
    borderRadius: 999,
    background: c,
    filter: "blur(120px)",
    opacity: 0.42,
  });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${COLORS.bg2}, ${COLORS.bg} 60%)` }}>
      <div style={blob(-160, -140, COLORS.violet, 760, 70, 0)} />
      <div style={blob(1220, 520, COLORS.fuchsia, 700, 90, 40)} />
      <div style={blob(560, 780, COLORS.aqua, 520, 110, 80)} />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
    </AbsoluteFill>
  );
};
