<script setup lang="ts">
import { useUserSession } from "#imports";
import { navigateTo } from "#app";
import {
  NuxtLink,
  UColorModeButton,
  UButton,
  UHeader,
  UMain,
} from "#components";

const { clear, loggedIn } = useUserSession();

const logout = async () => {
  await clear();
  await navigateTo("/login");
};
</script>

<template>
  <div>
    <UHeader :toggle="false">
      <template #title>
        <NuxtLink to="/links" class="font-mono"> sjy.so </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          v-if="loggedIn"
          color="neutral"
          variant="outline"
          icon="i-lucide-log-out"
          @click="logout"
        >
          Logout
        </UButton>
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>
  </div>
</template>
