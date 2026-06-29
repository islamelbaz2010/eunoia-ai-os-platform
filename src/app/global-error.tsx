// Root-level error boundary — catches errors in src/app/layout.tsx itself.
// Must render a complete <html><body> because the root layout may be broken.
// Separate from error.tsx which catches errors within individual route segments.

"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.6 }}>
            A critical error occurred. Please refresh the page.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "0.25rem",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                opacity: 0.3,
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
