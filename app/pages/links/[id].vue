<script setup lang="ts">
import { useDayjs } from "#imports";
import { useSeoMeta, useFetch, useRoute, createError } from "#app";
import { definePageMeta } from "#app/composables/pages";
import { computed } from "vue";
import {
  UBadge,
  UButton,
  UCard,
  UContainer,
  UPageHeader,
  UTable,
} from "#components";
import { SHORT_DOMAIN } from "#shared/utils/slug";

definePageMeta({
  middleware: ["auth"],
});

const route = useRoute();
const dayjs = useDayjs();

const { data, error } = await useFetch(
  `/api/links/${route.params.id as string}/stats`,
);

if (error.value || !data.value) {
  throw createError({
    fatal: true,
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: "Link not found",
  });
}

const stats = computed(() => data.value!);

useSeoMeta({
  title: () => `/${stats.value.link.slug}`,
});

const maxDaily = computed(() =>
  Math.max(1, ...stats.value.daily.map((d) => d.count)),
);

const last30 = computed(() =>
  stats.value.daily.reduce((sum, d) => sum + d.count, 0),
);

const clickColumns = [
  { accessorKey: "created", header: "When" },
  { accessorKey: "referrer", header: "Referrer" },
  { accessorKey: "country", header: "Country" },
  { accessorKey: "userAgent", header: "User agent" },
];
</script>

<template>
  <UContainer class="pb-16">
    <UPageHeader
      :title="`${SHORT_DOMAIN}/${stats.link.slug}`"
      :description="stats.link.description || stats.link.url"
    >
      <template #headline>
        <UButton
          to="/links"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="link"
          size="sm"
          class="px-0"
        >
          All links
        </UButton>
      </template>

      <template #links>
        <UBadge v-if="!stats.link.enabled" color="warning" variant="subtle">
          Disabled
        </UBadge>

        <UButton
          :to="stats.link.url"
          target="_blank"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-external-link"
        >
          Destination
        </UButton>
      </template>
    </UPageHeader>

    <div class="grid gap-4 py-6 sm:grid-cols-3">
      <UCard>
        <p class="text-muted text-sm">Total clicks</p>

        <p class="text-3xl font-semibold tabular-nums">{{ stats.total }}</p>
      </UCard>

      <UCard>
        <p class="text-muted text-sm">Unique visitors</p>

        <p class="text-3xl font-semibold tabular-nums">
          {{ stats.uniqueVisitors }}
        </p>
      </UCard>

      <UCard>
        <p class="text-muted text-sm">Last 30 days</p>

        <p class="text-3xl font-semibold tabular-nums">{{ last30 }}</p>
      </UCard>
    </div>

    <UCard class="mb-6">
      <template #header>
        <h2 class="font-semibold">Clicks per day (UTC, last 30 days)</h2>
      </template>

      <div class="flex h-32 items-end gap-1">
        <div
          v-for="day in stats.daily"
          :key="day.date"
          class="group relative flex h-full flex-1 items-end"
          :title="`${day.date}: ${day.count}`"
        >
          <div
            class="w-full rounded-t-sm"
            :class="day.count === 0 ? 'bg-accented' : 'bg-primary'"
            :style="{
              height: `${Math.max(2, (day.count / maxDaily) * 100)}%`,
            }"
          />
        </div>
      </div>

      <div class="text-muted mt-2 flex justify-between text-xs">
        <span>{{ dayjs(stats.daily[0]?.date).format("MMM D") }}</span>

        <span>{{ dayjs(stats.daily.at(-1)?.date).format("MMM D") }}</span>
      </div>
    </UCard>

    <div class="grid gap-6 lg:grid-cols-3">
      <UCard>
        <template #header>
          <h2 class="font-semibold">Top referrers</h2>
        </template>

        <ul v-if="stats.topReferrers.length" class="space-y-2 text-sm">
          <li
            v-for="r in stats.topReferrers"
            :key="r.referrer"
            class="flex justify-between gap-4"
          >
            <span class="truncate">{{ r.referrer }}</span>

            <span class="tabular-nums">{{ r.count }}</span>
          </li>
        </ul>

        <p v-else class="text-muted text-sm">No referrers recorded yet.</p>
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <h2 class="font-semibold">Recent clicks</h2>
        </template>

        <UTable
          :data="stats.recentClicks"
          :columns="clickColumns"
          empty="No clicks yet."
        >
          <template #created-cell="{ row }">
            <span :title="dayjs(row.original.created).format()">
              {{ dayjs(row.original.created).fromNow() }}
            </span>
          </template>

          <template #referrer-cell="{ row }">
            <span class="block max-w-48 truncate">
              {{ row.original.referrer ?? "—" }}
            </span>
          </template>

          <template #country-cell="{ row }">
            {{ row.original.country ?? "—" }}
          </template>

          <template #userAgent-cell="{ row }">
            <span class="text-muted block max-w-64 truncate text-xs">
              {{ row.original.userAgent ?? "—" }}
            </span>
          </template>
        </UTable>
      </UCard>
    </div>
  </UContainer>
</template>
