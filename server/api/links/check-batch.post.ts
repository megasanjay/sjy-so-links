import prisma from "#server/utils/prisma";
import { defineEventHandler, readValidatedBody, createError } from "h3";
import { z } from "zod";
import { requireUserSession } from "#imports";
import { checkUrl } from "#server/utils/checkUrl";
import { rateLimit } from "#server/utils/rateLimit";
import { checkSpacedByHost } from "#shared/utils/spacedByHost";

const bodySchema = z.object({ ids: z.array(z.string()).min(1).max(500) });

/**
 * Checks the destination URLs of the given links (the current user's only),
 * keyed by id. The links page sends the ones that failed its browser check.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  rateLimit(event, {
    extra: user.id,
    limit: 10,
    name: "link-check-batch",
    windowMs: 60_000,
  });

  const body = await readValidatedBody(event, (b) => bodySchema.safeParse(b));

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid link ids" });
  }

  const links = await prisma.link.findMany({
    select: { id: true, url: true },
    where: { id: { in: body.data.ids }, userId: user.id },
  });

  const resultsByUrl = await checkSpacedByHost(
    links.map((link) => link.url),
    checkUrl,
  );

  return Object.fromEntries(
    links.map((link) => [link.id, resultsByUrl.get(link.url)!]),
  );
});
