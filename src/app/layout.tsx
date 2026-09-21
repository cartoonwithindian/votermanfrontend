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

// Clerk's allowedRedirectOrigins: which origins Clerk may redirect back to
// after auth. Nothing is hardcoded — every-origin is gathered from env:
//   - NEXT_PUBLIC_APP_URL                    canonical app URL
//   - NEXT_PUBLIC_APP_URL_S1                 optional secondary app URL
//   - NEXT_PUBLIC_CLERK_APP_DOMAIN           Clerk custom front-end API domain
//   - NEXT_PUBLIC_CLERK_APP_DOMAIN_S1        optional secondary Clerk domain
//   - NEXT_PUBLIC_CLERK_ALLOWED_REDIRECT_ORIGINS  extra origins (comma-separated, host or https://host)
//   - NEXT_PUBLIC_ALT_HOSTS                  extra hosts to allow (comma-separated, host or https://host)
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
const appUrlS1 = (process.env.NEXT_PUBLIC_APP_URL_S1 || "").replace(/\/+$/, "");
const clerkAppDomain = (process.env.NEXT_PUBLIC_CLERK_APP_DOMAIN || "").replace(/^https?:\/\//, "");
const clerkS1Domain = (process.env.NEXT_PUBLIC_CLERK_APP_DOMAIN_S1 || "").replace(/^https?:\/\//, "");
const envRedirectOrigins = (process.env.NEXT_PUBLIC_CLERK_ALLOWED_REDIRECT_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const altHosts = (process.env.NEXT_PUBLIC_ALT_HOSTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const derivedOrigins = [
  appUrl,
  appUrlS1,
  clerkAppDomain && `https://${clerkAppDomain}`,
  clerkS1Domain && `https://${clerkS1Domain}`,
  ...altHosts,
  ...envRedirectOrigins,
].filter(Boolean) as string[];
const allowedRedirectOrigins = Array.from(
  new Set(
    derivedOrigins.flatMap((origin) => {
      // Clerk's allowedRedirectOrigins accepts hosts with scheme; also accept
      // host-only values from env (e.g. "app.example.com") by adding https://
      // (and http://) prefixes.
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
