export const COLORS = {
  bg: "#0B0718",
  bg2: "#160B2E",
  violet: "#7C3AED",
  fuchsia: "#D946EF",
  aqua: "#22D3EE",
  mint: "#34D399",
  sun: "#FBBF24",
  cream: "#F5F1FF",
  muted: "#A79FC4",
};

export const FPS = 30;

export type SceneSpec = {
  id: string;
  kicker: string;
  title: string;
  bullets: string[];
  accent: string;
  screen: string;
  audio: number; // seconds
};

export const LEAD = 0.6;
export const TAIL = 1.2;

export const SCENES: SceneSpec[] = [
  {
    id: "01",
    kicker: "Pi Bank · Guide",
    title: "Banking that speaks Pi",
    bullets: ["A quick tour of the app", "Everything runs in the Pi ecosystem", "Simulation — no real money moves"],
    accent: COLORS.fuchsia,
    screen: "home",
    audio: 10.704,
  },
  {
    id: "02",
    kicker: "Step 1",
    title: "Connect your Pi Wallet",
    bullets: ["Open the app in the Pi Browser", "Tap Connect Pi Wallet", "Allow username · payments · wallet address"],
    accent: COLORS.violet,
    screen: "wallet",
    audio: 12.864,
  },
  {
    id: "03",
    kicker: "Step 2",
    title: "Your home screen",
    bullets: ["Balances in π and local currency", "Tap the eye to hide balances", "Switch country for local rules"],
    accent: COLORS.aqua,
    screen: "home",
    audio: 11.016,
  },
  {
    id: "04",
    kicker: "Step 3",
    title: "Transfer money",
    bullets: ["Pick account · amount · recipient", "See the amount quoted in π", "Settle through your Pi Wallet"],
    accent: COLORS.mint,
    screen: "transfer",
    audio: 11.016,
  },
  {
    id: "05",
    kicker: "Step 4",
    title: "Pay bills & top up",
    bullets: ["Utilities, mobile and internet", "Enter your account number", "Confirm the π amount — done"],
    accent: COLORS.sun,
    screen: "bills",
    audio: 9.048,
  },
  {
    id: "06",
    kicker: "Step 5",
    title: "Send money worldwide",
    bullets: ["IBAN & BIC checked live", "Sanctions screening built in", "SWIFT MT103 · ISO 20022 pacs.008"],
    accent: COLORS.aqua,
    screen: "global",
    audio: 13.248,
  },
  {
    id: "07",
    kicker: "Step 6",
    title: "Three helpers, one tap",
    bullets: ["Pi Assist — general questions", "OpenMind — compliance tutor", "RoboPay — payment tasks"],
    accent: COLORS.fuchsia,
    screen: "assist",
    audio: 14.448,
  },
  {
    id: "08",
    kicker: "Finish",
    title: "Make it yours",
    bullets: ["Theme, language, desktop view", "Manage your Pi Wallet link", "Explore freely — it's a simulation"],
    accent: COLORS.violet,
    screen: "settings",
    audio: 14.016,
  },
];

export const sceneFrames = (s: SceneSpec) => Math.round((LEAD + s.audio + TAIL) * FPS);
