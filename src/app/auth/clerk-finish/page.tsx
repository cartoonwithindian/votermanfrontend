"use client";

// This page uses dynamic import to prevent static generation
// because Clerk's useAuth hook requires ClerkProvider context
import dynamic from 'next/dynamic';

const FinishContent = dynamic(
  () => import('./FinishContent').then((mod) => mod.default),
  { ssr: false, loading: () => <LoadingSpinner /> }
);

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function ClerkFinishPage() {
  return <FinishContent />;
}
