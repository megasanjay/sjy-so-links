import { defineEventHandler, setHeader } from "h3";
import { siteOrigin } from "#server/utils/publicLinks";

export default defineEventHandler((event) => {
  const origin = siteOrigin(event);

  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");

  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /links",
    "Disallow: /login",
    "Disallow: /signup",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
});
