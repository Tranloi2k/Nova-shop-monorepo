import type { MetadataRoute } from "next";
import { getSiteUrl, NOINDEX_PATH_PREFIXES } from "@/app/lib/seo";

/**
 * Crawlers that bring no search traffic but render many server pages.
 * Every page they fetch runs a serverless function and costs Vercel Active CPU.
 */
const BLOCKED_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "meta-externalagent",
  "FacebookBot",
  "PerplexityBot",
  "cohere-ai",
  "Diffbot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "DataForSeoBot",
  "BLEXBot",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    ...NOINDEX_PATH_PREFIXES,
    "/account",
    "/_next/",
    // Filter/sort/search combinations each render a fresh dynamic page.
    "/products?",
  ];

  return {
    rules: [
      { userAgent: BLOCKED_BOTS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
