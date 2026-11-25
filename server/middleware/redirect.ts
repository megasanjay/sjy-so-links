import { createHash } from "node:crypto";
import {
  defineEventHandler,
  getRequestHeader,
  getRequestIP,
  getRequestURL,
  sendRedirect,
} from "h3";
import { useRuntimeConfig } from "nitropack/runtime";
import prisma from "#server/utils/prisma";
import { isValidSlug } from "#shared/utils/slug";

const truncate = (value: string | undefined, max: number) =>
  value ? value.slice(0, max) : null;

/**
 * Serves short links: GET /<slug> -> 302 to the link's URL, recording a click.
 * Anything that isn't a single-segment path matching an enabled link falls
 * through to the Nuxt app (which renders a 404 for unknown paths).
 */
export default defineEventHandler(async (event) => {
  if (event.method !== "GET" && event.method !== "HEAD") return;

  const { pathname } = getRequestURL(event);
  const match = /^\/([^/]+)\/?$/.exec(pathname);

  if (!match) return;

  // Valid slugs are plain ASCII, so no decoding is needed
  const slug = match[1]!.toLowerCase();

  if (!isValidSlug(slug)) return;

  const link = await prisma.link.findUnique({
    select: { id: true, url: true, enabled: true },
    where: { slug },
  });

  if (!link || !link.enabled) return;

  if (event.method === "GET") {
    const ip = getRequestIP(event, { xForwardedFor: true });
    // The app secret (NUXT_APP_SECRET) doubles as the IP-hash salt
    const salt = String(useRuntimeConfig().appSecret ?? "");

    // Awaited so the write finishes before the response is sent: serverless
    // hosts (e.g. Vercel) can freeze the function once it responds, dropping
    // un-awaited work. Errors are still caught so tracking never breaks the
    // redirect.
    await prisma.click
      .create({
        data: {
          country: truncate(
            getRequestHeader(event, "cf-ipcountry") ??
              getRequestHeader(event, "x-vercel-ip-country"),
            8,
          ),
          ipHash: ip
            ? createHash("sha256").update(`${salt}:${ip}`).digest("hex")
            : null,
          linkId: link.id,
          referrer: truncate(getRequestHeader(event, "referer"), 2048),
          userAgent: truncate(getRequestHeader(event, "user-agent"), 512),
        },
      })
      .catch((error) => console.error("Failed to record click", error));
  }

  // 302 (not 301) so browsers don't cache the redirect and every visit is tracked
  return sendRedirect(event, link.url, 302);
});
