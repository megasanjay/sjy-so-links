import type { H3Event } from "h3";
import { getRequestURL } from "h3";
import prisma from "#server/utils/prisma";

/** The site's public origin (e.g. https://sjy.so), honoring proxy headers. */
export const siteOrigin = (event: H3Event) =>
  getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;

/** Every enabled short link, across all users, for robots/sitemap/llms.txt. */
export const getPublicLinks = () =>
  prisma.link.findMany({
    orderBy: { slug: "asc" },
    select: { description: true, slug: true, updated: true },
    where: { enabled: true },
  });
