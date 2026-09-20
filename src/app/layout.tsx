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
const builtinAllowedRedirectOrigins = [
  "https://students.made-a.tech",
  "https://s1.students.made-a.tech",
  "https://clerk.students.made-a.tech",
  "https://clerk.s1.students.made-a.tech",
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
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Guarded: the app falls back to backend email-OTP auth when no Clerk
            key is configured (e.g. fresh clones before `clerk env pull`). */}
        {clerkKey ? (
          <ClerkProvider allowedRedirectOrigins={allowedRedirectOrigins}>{children}</ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
