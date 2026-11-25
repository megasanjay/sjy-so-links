import prisma from "#server/utils/prisma";
import { defineEventHandler } from "h3";
import { requireUserSession } from "#imports";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const links = await prisma.link.findMany({
    include: {
      _count: { select: { clicks: true } },
      clicks: {
        orderBy: { created: "desc" },
        select: { created: true },
        take: 1,
      },
    },
    orderBy: { created: "desc" },
    where: { userId: user.id },
  });

  return links.map(({ _count, clicks, ...link }) => ({
    ...link,
    clickCount: _count.clicks,
    lastClicked: clicks[0]?.created ?? null,
  }));
});
