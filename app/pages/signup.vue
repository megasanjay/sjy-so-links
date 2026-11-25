<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { useRuntimeConfig, navigateTo, useSeoMeta } from "#app";
import { useUserSession, useToast } from "#imports";
import { definePageMeta } from "#app/composables/pages";
import { ref, reactive } from "vue";
import { $fetch } from "#build/fetch";
import {
  NuxtLink,
  UInput,
  UFormField,
  UButton,
  UForm,
  UCard,
} from "#components";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Sign up",
});

const config = useRuntimeConfig();
const { loggedIn } = useUserSession();

if (loggedIn.value) {
  await navigateTo("/links");
}

const toast = useToast();
const loading = ref(false);

const schema = z.object({
  emailAddress: z.email(),
  familyName: z.string().max(100),
  givenName: z.string().max(100),
  password: z
    .string()
    .min(12, "Must be at least 12 characters")
    .max(128, "Must be at most 128 characters"),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  emailAddress: "",
  familyName: "",
  givenName: "",
  password: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    await $fetch("/api/auth/signup", { body: event.data, method: "POST" });

    toast.add({
      color: "success",
      icon: "i-lucide-check",
      title: "Account created. You can now log in.",
    });
    await navigateTo("/login");
  } catch (error) {
    toast.add({
      color: "error",
      description:
        (error as { data?: { statusMessage?: string } }).data?.statusMessage ??
        "Request failed",
      icon: "i-lucide-circle-alert",
      title: "Could not create account",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <div class="space-y-4">
      <div>
        <h1 class="font-mono text-xl font-bold">sjy.so</h1>

        <p class="text-muted text-sm">
          Already have an account?
          <NuxtLink to="/login" class="text-primary font-medium">
            Log in
          </NuxtLink>
        </p>
      </div>

      <p v-if="!config.public.enableSignup" class="text-muted">
        Sign up is currently disabled.
      </p>

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="First name" name="givenName">
            <UInput v-model="state.givenName" autocomplete="given-name" />
          </UFormField>

          <UFormField label="Last name" name="familyName">
            <UInput v-model="state.familyName" autocomplete="family-name" />
          </UFormField>
        </div>

        <UFormField label="Email address" name="emailAddress">
          <UInput
            v-model="state.emailAddress"
            type="email"
            autocomplete="email"
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
          />
        </UFormField>

        <UButton type="submit" block :loading="loading">
          Create account
        </UButton>
      </UForm>
    </div>
  </UCard>
</template>
