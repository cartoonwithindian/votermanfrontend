"use client";

// Finalizes the Google (OAuth) redirect for BOTH new and returning users.
//
// signIn.sso() sends every Google user here, but when the Google account has
// no user in this Clerk instance yet, Clerk creates a *sign-up* (dashboard
// event `sign_up.external_account.connected`) instead of a session — so there
// is nothing to "sign in" yet and the old page died with
// `external_account_not_found`. Clerk's <AuthenticateWithRedirectCallback />
// completes whichever flow the redirect carries (sign-in OR sign-up) and then
// sends the browser to the finish step, which exchanges the session with the
// backend exactly as before.

import { useEffect, useState } from "react";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

function finishUrl(): string {
  const role = new URLSearchParams(window.location.search).get("role") || "student";
  return `/auth/clerk-finish?role=${encodeURIComponent(role)}`;
}

export default function SsoCallbackContent() {
  const { isLoaded, isSignedIn } = useAuth();
  // Client-only route (dynamically imported with ssr:false), so reading
  // window here is safe and avoids a setState-in-effect lint error.
  const [target] = useState<string | null>(
    () => (typeof window === "undefined" ? null : finishUrl())
  );

  // Already signed in (e.g. forwarded here with an active session):
  // skip finalization and go straight to the backend exchange.
  useEffect(() => {
    if (isLoaded && isSignedIn && target) window.location.replace(target);
  }, [isLoaded, isSignedIn, target]);

  if (!isLoaded || !target || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Completing secure sign in…</p>
        </div>
      </div>
    );
  }

  return <AuthenticateWithRedirectCallback signInForceRedirectUrl={target} signUpForceRedirectUrl={target} />;
}
