<script setup lang="ts">
import { useUserSession, useToast } from "#imports";
import { useRoute, useRuntimeConfig, navigateTo, useSeoMeta } from "#app";
import { definePageMeta } from "#app/composables/pages";
import { reactive, ref } from "vue";
import { $fetch } from "#build/fetch";
import { NuxtLink, UInput, UFormField, UButton, UCard } from "#components";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Login",
});

const config = useRuntimeConfig();
const { loggedIn, fetch: refreshSession } = useUserSession();
const route = useRoute();
const toast = useToast();

// Only follow same-origin relative paths to prevent open redirects
const redirectTarget = () => {
  const redirect = route.query.redirect;

  return typeof redirect === "string" &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//")
    ? redirect
    : "/links";
};

if (loggedIn.value) {
  await navigateTo(redirectTarget());
}

const state = reactive({ emailAddress: "", password: "" });
const loading = ref(false);

async function onSubmit() {
  loading.value = true;

  try {
    await $fetch("/api/auth/login", { body: state, method: "POST" });

    await refreshSession();
    await navigateTo(redirectTarget());
  } catch (error) {
    const statusMessage = (error as { data?: { statusMessage?: string } }).data
      ?.statusMessage;

    toast.add({
      color: "error",
      description: statusMessage ?? "Request failed",
      icon: "i-lucide-circle-alert",
      title: "Could not log in",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <h1 class="font-mono text-xl font-bold">sjy.so</h1>

        <p v-if="config.public.enableSignup" class="text-muted text-sm">
          No account?
          <NuxtLink to="/signup" class="text-primary font-medium">
            Sign up
          </NuxtLink>
        </p>
      </div>

      <UFormField label="Email address" name="emailAddress">
        <UInput
          v-model="state.emailAddress"
          type="email"
          autocomplete="email"
          autofocus
          required
        />
      </UFormField>

      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          required
        />
      </UFormField>

      <UButton type="submit" block :loading="loading"> Log in </UButton>
    </form>
  </UCard>
</template>
