import prisma from "#server/utils/prisma";
import { defineEventHandler, createError, getRouterParam } from "h3";
import { requireUserSession } from "#imports";

const DAYS = 30;

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const id = getRouterParam(event, "id")!;

  const link = await prisma.link.findFirst({
    where: { id, userId: user.id },
  });

  if (!link) {
    throw createError({ statusCode: 404, statusMessage: "Link not found" });
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const [total, uniqueVisitors, recentClicks, topReferrers, windowClicks] =
    await Promise.all([
      prisma.click.count({ where: { linkId: id } }),
      prisma.click
        .groupBy({
          by: ["ipHash"],
          where: { ipHash: { not: null }, linkId: id },
        })
        .then((rows) => rows.length),
      prisma.click.findMany({
        orderBy: { created: "desc" },
        take: 50,
        where: { linkId: id },
      }),
      prisma.click.groupBy({
        _count: { _all: true },
        by: ["referrer"],
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
        where: { linkId: id, referrer: { not: null } },
      }),
      prisma.click.findMany({
        select: { created: true },
        where: { created: { gte: since }, linkId: id },
      }),
    ]);

  // Clicks per UTC day for the last DAYS days, zero-filled
  const daily = new Map<string, number>();

  for (let i = 0; i < DAYS; i++) {
    const day = new Date(since);
    day.setUTCDate(since.getUTCDate() + i);
    daily.set(day.toISOString().slice(0, 10), 0);
  }

  for (const { created } of windowClicks) {
    const key = created.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + 1);
  }

  return {
    daily: [...daily].map(([date, count]) => ({ count, date })),
    link,
    recentClicks,
    topReferrers: topReferrers.map((r) => ({
      count: r._count._all,
      referrer: r.referrer!,
    })),
    total,
    uniqueVisitors,
  };
});
