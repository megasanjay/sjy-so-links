// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-16",

  css: ["~/assets/css/main.css"],

  devtools: { enabled: true },

  explicitImports: {
    mode: { imports: "strict", components: "strict", server: "strict" },
  },

  modules: [
    "@nuxt/ui",
    "nuxt-auth-utils",
    "dayjs-nuxt",
    "@nuxt/eslint",
    "nuxt-explicit-imports",
  ],

  // Do NOT read process.env here: values would be frozen into the build output.
  // Values here can be overridden at runtime with NUXT_* env vars.
  runtimeConfig: {
    public: {
      // Allow new accounts at /signup. Off by default so strangers can't
      // create redirects on the domain.
      enableSignup: true,
    },
  },

  // The homepage goes to the personal site in production, and to the admin
  // page in `nuxt dev`
  $development: {
    routeRules: {
      "/": { redirect: { statusCode: 302, to: "/links" } },
    },
  },

  $production: {
    routeRules: {
      "/": {
        redirect: { statusCode: 302, to: "https://sanjaysoundarajan.dev" },
      },
    },
  },

  routeRules: {
    "/**": {
      headers: {
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    },
  },

  eslint: {},

  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "dayjs", // CJS
        "dayjs/plugin/updateLocale", // CJS
        "dayjs/plugin/relativeTime", // CJS
        "dayjs/plugin/utc", // CJS
      ],
    },
  },
});
