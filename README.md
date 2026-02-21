# Akiralab Storage Frontend

React + Vite (TypeScript) baseline with env profiles, path aliases, and build scripts.

**Quick start**
1. `npm install`
2. `npm run dev`

This launches the dev server with the `development` env profile.

**Scripts**
1. `npm run dev` – dev server, `development` mode
2. `npm run dev:stage` – dev server, `staging` mode
3. `npm run dev:prod` – dev server, `production` mode
4. `npm run build:dev` – build artifact with `development` mode
5. `npm run build:stage` – build artifact with `staging` mode
6. `npm run build:prod` – build artifact with `production` mode

**Env profiles**
Vite loads env files based on the selected mode. All public env vars must be prefixed with `VITE_`.
`.env` is kept empty by default to avoid cross-environment leakage.

Profiles:
1. `.env.development` – local dev defaults
2. `.env.staging` – staging defaults
3. `.env.production` – production defaults
4. `.env.local` – developer overrides (gitignored)
5. `.env.example` – template for new machines

Example usage in code:
```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
```

**Path aliases**
Use `@` as an alias for `src`.

Example:
```ts
import App from "@/App";
```

**Reproducible CI build**
1. `npm ci`
2. `npm run build:prod`

This produces `dist/` and is reproducible as long as `package-lock.json` is committed and used.
