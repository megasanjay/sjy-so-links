<script setup lang="ts">
import { useColorMode } from "#imports";
import { useHead, useSeoMeta } from "#app";
import { NuxtLoadingIndicator, NuxtPage, NuxtLayout, UApp } from "#components";

const colorMode = useColorMode();

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [{ href: "/favicon.ico", rel: "icon" }],
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "robots", content: "noindex, nofollow" },
    {
      name: "theme-color",
      content: colorMode.value === "dark" ? "#111827" : "white",
      key: "theme-color",
    },
  ],
});

const description =
  "Personal link shortener for Sanjay Soundarajan's apps and repos.";

useSeoMeta({
  titleTemplate: "%s - sjy.so",
  description,
  ogDescription: description,
  ogSiteName: "sjy.so",
  ogTitle: "sjy.so",
  ogType: "website",
  twitterCard: "summary",
  twitterDescription: description,
  twitterTitle: "sjy.so",
});
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
