// Paths the app itself uses. These can never be claimed by a short link.
export const RESERVED_SLUGS = new Set([
  "_nuxt",
  "__nuxt_error",
  "api",
  "favicon.ico",
  "links",
  "login",
  "robots.txt",
  "signup",
]);

// Lowercase letters, digits, dashes and underscores; must start with a letter or digit.
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const isValidSlug = (slug: string) =>
  SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);

export const SHORT_DOMAIN = "sjy.so";
