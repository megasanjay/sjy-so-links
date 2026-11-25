<script setup lang="ts">
import type { NuxtError } from "#app";
import { useSeoMeta } from "#app";
import { UApp, UError } from "#components";

const props = defineProps<{ error: NuxtError }>();

useSeoMeta({
  title: props.error.statusCode === 404 ? "Not found" : "Error",
});
</script>

<template>
  <UApp>
    <UError
      :error="error"
      :clear="{ label: 'Go to sanjaysoundarajan.dev', to: '/' }"
    />
  </UApp>
</template>
