// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Errors only. Server/edge tracing and log forwarding run on every request
  // and count toward Vercel Active CPU, so they are disabled in production.
  tracesSampleRate: process.env.NODE_ENV === "production" ? undefined : 1,
  enableLogs: process.env.NODE_ENV !== "production",

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
