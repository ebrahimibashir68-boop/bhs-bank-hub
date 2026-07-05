// PiNet backend metadata endpoint.
// Docs: pinet.md — PiNet sends GET /pinet/meta?pathname=<encoded-pathname>
// and expects a PiNetMetadataDTO JSON response with HTTP 200.
import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://bhs-bank-hub.lovable.app";
const APP_NAME = "Pi Bank";
const DEFAULT_DESC =
  "Pi Bank — a Pi-powered banking hub for transfers, bills, cash, top-ups, international remittance and Pi wallet payments.";
const DEFAULT_IMAGE = `${SITE_URL}/favicon.svg`;

interface RouteMeta {
  title: string;
  description: string;
  keywords?: string[];
}

const ROUTES: Record<string, RouteMeta> = {
  "/": {
    title: `${APP_NAME} — Pi-powered banking hub`,
    description: DEFAULT_DESC,
    keywords: ["Pi Network", "banking", "Pi wallet", "remittance", "bills"],
  },
  "/transfer": {
    title: `Send money · ${APP_NAME}`,
    description: "Transfer funds to any account or Pi user, quickly and securely.",
  },
  "/bills": {
    title: `Pay bills · ${APP_NAME}`,
    description: "Pay utilities, taxes and services from your Pi Bank account.",
  },
  "/cash": {
    title: `Cash in / Cash out · ${APP_NAME}`,
    description: "Deposit or withdraw cash at supported agents.",
  },
  "/topup": {
    title: `Mobile top-up · ${APP_NAME}`,
    description: "Recharge mobile airtime and data in supported countries.",
  },
  "/international": {
    title: `International transfer · ${APP_NAME}`,
    description: "Send money across borders with transparent rates.",
  },
  "/pi": {
    title: `Pi wallet · ${APP_NAME}`,
    description: "Connect your Pi wallet and pay with Pi inside the Pi Browser.",
  },
  "/settings": {
    title: `Settings · ${APP_NAME}`,
    description: "Manage your Pi Bank preferences and Pi wallet connection.",
  },
  "/more": {
    title: `More · ${APP_NAME}`,
    description: "Additional Pi Bank features and shortcuts.",
  },
  "/guide": {
    title: `Guide & compliance · ${APP_NAME}`,
    description: "Learn how Pi Bank works and review compliance information.",
  },
};

function pickMeta(pathname: string): RouteMeta {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return ROUTES[clean] ?? ROUTES["/"];
}

export const Route = createFileRoute("/pinet/meta")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const pathname = url.searchParams.get("pathname") ?? "/";
        const meta = pickMeta(pathname);
        const canonical = `${SITE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;

        const dto = {
          title: meta.title,
          description: meta.description,
          keywords: meta.keywords ?? null,
          creator: APP_NAME,
          publisher: APP_NAME,
          category: "finance",
          openGraph: {
            type: "website",
            title: meta.title,
            description: meta.description,
            locale: "en_US",
            images: [{ url: DEFAULT_IMAGE, alt: APP_NAME }],
          },
          twitter: {
            card: "summary",
            title: meta.title,
            description: meta.description,
            images: [DEFAULT_IMAGE],
          },
          icons: { icon: [{ url: `${SITE_URL}/favicon.svg`, type: "image/svg+xml" }] },
        };

        return new Response(JSON.stringify(dto), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Canonical-Url": canonical,
          },
        });
      },
    },
  },
});
