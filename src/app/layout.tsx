import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ClerkProvider } from "@clerk/nextjs";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Primary-domain deployments allow visible satellite origins to redirect back
// after auth (multi-domain, e.g. students.made-a.tech -> made-a.tech).
// s1.students.made-a.tech is Clerk's satellite/JWKS host (clerk.s1...) but users
// mistakenly open https://s1.students.made-a.tech/admin/... as the app. Allow
// it explicitly so Clerk doesn't reject the origin when the request Host is s1.
// Env NEXT_PUBLIC_CLERK_ALLOWED_REDIRECT_ORIGINS adds more hosts.
//
// The Clerk custom domain comes from NEXT_PUBLIC_CLERK_APP_DOMAIN (set in the
// env file); the satellite clerk.s1.<host> is derived from it. Defaults keep
// clerk.students.made-a.tech for existing deployments.
const clerkAppDomain = process.env.NEXT_PUBLIC_CLERK_APP_DOMAIN || "clerk.students.made-a.tech";
const clerkS1Domain =
  process.env.NEXT_PUBLIC_CLERK_APP_DOMAIN_S1 ||
  `clerk.s1.${clerkAppDomain.split(".").slice(1).join(".")}`;
const builtinAllowedRedirectOrigins = [
  "https://students.made-a.tech",
  "https://s1.students.made-a.tech",
  `https://${clerkAppDomain}`,
  `https://${clerkS1Domain}`,
  "https://votermanfrontend.onrender.com",
  "https://votermanbackend.onrender.com",
];
const allowedRedirectOrigins = Array.from(
  new Set(
    [
      ...builtinAllowedRedirectOrigins,
      ...(process.env.NEXT_PUBLIC_CLERK_ALLOWED_REDIRECT_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ].flatMap((origin) => {
      // Clerk's allowedRedirectOrigins accepts hosts with scheme; also accept
      // host-only values from env (e.g. "s1.students.made-a.tech") by adding
      // https:// prefix.
      if (/^https?:\/\//.test(origin)) return [origin];
      return [`https://${origin}`, `http://${origin}`];
    })
  )
);

export const metadata: Metadata = {
  title: "Don Bosco Institute of Technology - Secure & Neutral Student Elections",
  description: "Secure, transparent, and neutral online election platform for student council voting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isSatellite = process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === 'true';
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Guarded: the app falls back to backend email-OTP auth when no Clerk
            key is configured (e.g. fresh clones before `clerk env pull`). */}
        {clerkKey ? (
          <ClerkProvider allowedRedirectOrigins={allowedRedirectOrigins} isSatellite={isSatellite || undefined}>{children}</ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
