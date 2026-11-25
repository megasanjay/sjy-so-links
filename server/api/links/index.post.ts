import prisma from "#server/utils/prisma";
import { defineEventHandler, readValidatedBody, createError } from "h3";
import { requireUserSession } from "#imports";
import { linkSchema } from "#server/utils/linkSchema";
import { checkUrl } from "#server/utils/checkUrl";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const body = await readValidatedBody(event, (b) => linkSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues[0]?.message ?? "Invalid link",
    });
  }

  const existing = await prisma.link.findUnique({
    where: { slug: body.data.slug },
  });

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `/${body.data.slug} is already taken`,
    });
  }

  const check = await checkUrl(body.data.url);

  if (check.status === "error") {
    throw createError({
      statusCode: 400,
      statusMessage: `Destination does not resolve: ${check.message}`,
    });
  }

  return await prisma.link.create({
    data: { ...body.data, userId: user.id },
  });
});
