import { defineEventHandler, readValidatedBody, createError } from "h3";
import { z } from "zod";
import { requireUserSession } from "#imports";
import { checkUrl } from "#server/utils/checkUrl";
import { rateLimit } from "#server/utils/rateLimit";

const bodySchema = z.object({ url: z.string().max(2048) });

/** Checks a single destination URL (used live by the link form). */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  rateLimit(event, {
    extra: user.id,
    limit: 60,
    name: "link-check",
    windowMs: 60_000,
  });

  const body = await readValidatedBody(event, (b) => bodySchema.safeParse(b));

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid URL" });
  }

  return await checkUrl(body.data.url);
});
