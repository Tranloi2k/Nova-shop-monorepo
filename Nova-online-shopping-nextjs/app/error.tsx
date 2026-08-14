"use client";

import ErrorBoundaryUI from "@/app/ui/error-boundary";

export default function RootError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <ErrorBoundaryUI
      error={error}
      reset={reset}
      variant="full"
      title="Unexpected error"
      description="Something went wrong while loading the app. Please try again or return home."
    />
  );
}
