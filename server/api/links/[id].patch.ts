import prisma from "#server/utils/prisma";
import {
  defineEventHandler,
  readValidatedBody,
  createError,
  getRouterParam,
} from "h3";
import { requireUserSession } from "#imports";
import { linkUpdateSchema } from "#server/utils/linkSchema";
import { checkUrl } from "#server/utils/checkUrl";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const id = getRouterParam(event, "id")!;

  const body = await readValidatedBody(event, (b) =>
    linkUpdateSchema.safeParse(b),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues[0]?.message ?? "Invalid link",
    });
  }

  if (body.data.slug) {
    const existing = await prisma.link.findUnique({
      where: { slug: body.data.slug },
    });

    if (existing && existing.id !== id) {
      throw createError({
        statusCode: 409,
        statusMessage: `/${body.data.slug} is already taken`,
      });
    }
  }

  if (body.data.url) {
    // Only re-check when the destination actually changes, so editing the
    // description of a link whose site is down still works
    const current = await prisma.link.findFirst({
      select: { url: true },
      where: { id, userId: user.id },
    });

    if (current && current.url !== body.data.url) {
      const check = await checkUrl(body.data.url);

      if (check.status === "error") {
        throw createError({
          statusCode: 400,
          statusMessage: `Destination does not resolve: ${check.message}`,
        });
      }
    }
  }

  const { count } = await prisma.link.updateMany({
    data: body.data,
    where: { id, userId: user.id },
  });

  if (count === 0) {
    throw createError({ statusCode: 404, statusMessage: "Link not found" });
  }

  return { ok: true };
});
