<script setup lang="ts">
import type { NuxtError } from "#app";
import { computed } from "vue";
import { useRequestURL, useSeoMeta } from "#app";
import { UApp, UButton, UIcon } from "#components";
import { SHORT_DOMAIN } from "#shared/utils/slug";

const props = defineProps<{ error: NuxtError }>();

const HOME_URL = "https://sanjaysoundarajan.dev";

const isNotFound = computed(() => props.error.statusCode === 404);

// What the visitor tried to open, shown as e.g. "sjy.so/gh"
const requestedPath = computed(() => {
  const { pathname } = useRequestURL();
  let path = pathname;

  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Malformed escapes like "/%E0": show the raw path instead
  }

  return `${SHORT_DOMAIN}${path.replace(/\/$/, "")}`;
});

useSeoMeta({
  title: isNotFound.value ? "Link not found" : "Error",
});
</script>

<template>
  <UApp>
    <main
      class="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div
        class="bg-primary/10 text-primary mb-6 flex size-16 items-center justify-center rounded-2xl"
      >
        <UIcon
          :name="isNotFound ? 'i-lucide-unlink' : 'i-lucide-triangle-alert'"
          class="size-8"
        />
      </div>

      <p class="text-primary font-mono text-sm font-semibold">
        {{ error.statusCode }}
      </p>

      <h1 class="text-highlighted mt-2 text-3xl font-bold tracking-tight">
        {{
          isNotFound ? "This link doesn't go anywhere" : "Something went wrong"
        }}
      </h1>

      <template v-if="isNotFound">
        <p
          class="bg-elevated text-default mt-5 max-w-full truncate rounded-lg px-3 py-1.5 font-mono text-sm"
        >
          {{ requestedPath }}
        </p>

        <p class="text-muted mt-4 max-w-md">
          The short link may be mistyped, or it has been disabled or removed.
          Double-check the address, or head over to the main site.
        </p>
      </template>

      <p v-else class="text-muted mt-4 max-w-md">
        {{ error.statusMessage || "An unexpected error occurred." }} Try again
        in a moment.
      </p>

      <UButton
        :to="HOME_URL"
        external
        trailing-icon="i-lucide-arrow-right"
        class="mt-8"
      >
        Go to sanjaysoundarajan.dev
      </UButton>
    </main>
  </UApp>
</template>
