'use client';

import { useEffect } from 'react';

export default function QRMenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the actual error to console for debugging
    console.error('[QR Menu Error]', error?.message, error?.stack);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center text-3xl border border-rose-500/40">
        ⚠️
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black text-white">Something went wrong</h2>
        <p className="text-sm text-slate-400 max-w-xs">
          The menu could not be loaded. Please try refreshing the page or ask your dining captain for assistance.
        </p>
        {error?.message && (
          <p className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-2 rounded-xl max-w-sm mx-auto break-all">
            {error.message}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
