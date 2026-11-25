import { defineEventHandler, setHeader } from "h3";
import { getPublicLinks, siteOrigin } from "#server/utils/publicLinks";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\u0022", "&quot;")
    .replaceAll("'", "&apos;");

export default defineEventHandler(async (event) => {
  const origin = siteOrigin(event);
  const links = await getPublicLinks();

  const urls = links.map(({ slug, updated }) =>
    [
      "  <url>",
      `    <loc>${escapeXml(`${origin}/${slug}`)}</loc>`,
      `    <lastmod>${updated.toISOString()}</lastmod>`,
      "  </url>",
    ].join("\n"),
  );

  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");

  return [
    "<?xml version='1.0' encoding='UTF-8'?>",
    "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>",
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
});
