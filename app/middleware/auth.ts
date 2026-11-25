import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useUserSession } from "#imports";

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession();

  if (!loggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
