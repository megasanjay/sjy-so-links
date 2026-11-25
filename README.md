# sjy.so

Personal link shortener and redirector for my apps and repos, served at [sjy.so](https://sjy.so).

- `sjy.so/` redirects to [sanjaysoundarajan.dev](https://sanjaysoundarajan.dev)
- `sjy.so/<slug>` redirects (302) to that link's destination and records a click
- `sjy.so/links` is the logged-in admin page for creating, editing, disabling and deleting links and viewing click stats

Built with Nuxt 4, Nuxt UI, Prisma and Postgres.

## How it works

- **Redirects** are handled by [server/middleware/redirect.ts](server/middleware/redirect.ts). Single-segment paths that match an enabled link are redirected before Nuxt renders anything; everything else falls through to the app (unknown paths get a 404).
- **Reserved paths** (`links`, `login`, `api`, `_nuxt`, …) are listed in [shared/utils/slug.ts](shared/utils/slug.ts) and can't be used as slugs.
- **Click tracking** stores one `Click` row per redirect, with referrer, user agent, country (from a `CF-IPCountry` header if present) and a salted SHA-256 hash of the IP for unique-visitor counts. Raw IPs are never stored.
- **Auth** is email + password accounts (argon2 password hashes) with sessions from `nuxt-auth-utils`. Each user manages their own links; slugs are unique across everyone. Sign up is controlled by `runtimeConfig.public.enableSignup` in [nuxt.config.ts](nuxt.config.ts) (off by default).

## Development

Requires Node and pnpm (see [mise.toml](mise.toml)) and Docker for Postgres.

```bash
cp .env.example .env
docker compose -f dev-docker-compose.yaml up -d
pnpm install
pnpm prisma:db:push
pnpm dev
```

Set `enableSignup: true` in `nuxt.config.ts`, open <http://localhost:3000/signup> and create an account (then set it back to `false`), then manage links at <http://localhost:3000/links>.
