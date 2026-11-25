import { defineEventHandler, setHeader } from "h3";
import { SHORT_DOMAIN } from "#shared/utils/slug";
import { getPublicLinks, siteOrigin } from "#server/utils/publicLinks";

export default defineEventHandler(async (event) => {
  const origin = siteOrigin(event);
  const links = await getPublicLinks();

  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");

  return [
    `# ${SHORT_DOMAIN}`,
    "",
    "> Personal short links. Each URL below redirects to the linked app, repo or page.",
    "",
    "## Links",
    "",
    ...links.map(({ description, slug }) => {
      const line = `- [${slug}](${origin}/${slug})`;
      const text = description.replace(/\s+/g, " ").trim();

      return text ? `${line}: ${text}` : line;
    }),
    "",
  ].join("\n");
});
