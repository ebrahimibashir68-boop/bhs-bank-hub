import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Background } from "./Background";
import { Scene } from "./Scene";
import { COLORS, SCENES, sceneFrames } from "./theme";

const TRANSITION = 16;

export const totalFrames =
  SCENES.reduce((sum, s) => sum + sceneFrames(s), 0) - TRANSITION * (SCENES.length - 1);

const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 200 } });
  const progress = interpolate(frame, [0, durationInFrames], [0, 1]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 96,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: inS,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${COLORS.fuchsia}, ${COLORS.violet})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 24,
          }}
        >
          π
        </div>
        <span style={{ color: COLORS.cream, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Pi Bank</span>
        <span style={{ color: COLORS.muted, fontSize: 20 }}>· How it works</span>
      </div>

      <div style={{ position: "absolute", bottom: 40, left: 96, right: 96, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.10)" }}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.fuchsia}, ${COLORS.aqua})`,
          }}
        />
      </div>
      <span style={{ position: "absolute", bottom: 58, right: 96, color: COLORS.muted, fontSize: 17 }}>
        Simulation · no real money moves
      </span>
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, Arial, sans-serif", backgroundColor: COLORS.bg }}>
      <Background />
      <TransitionSeries>
        {SCENES.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 ? (
              <TransitionSeries.Transition
                presentation={i % 2 === 0 ? slide({ direction: "from-right" }) : fade()}
                timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })}
              />
            ) : null}
            <TransitionSeries.Sequence durationInFrames={sceneFrames(s)}>
              <Scene spec={s} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
      <Sequence>
        <Chrome />
      </Sequence>
    </AbsoluteFill>
  );
};
