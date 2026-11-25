import prisma from "#server/utils/prisma";
import { defineEventHandler, createError, getRouterParam } from "h3";
import { requireUserSession } from "#imports";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const id = getRouterParam(event, "id")!;

  const { count } = await prisma.link.deleteMany({
    where: { id, userId: user.id },
  });

  if (count === 0) {
    throw createError({ statusCode: 404, statusMessage: "Link not found" });
  }

  return { ok: true };
});
