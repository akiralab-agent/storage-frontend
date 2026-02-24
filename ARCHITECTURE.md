# Frontend Architecture

This project follows a strict, layered app shell. Each layer can only depend on layers below it. This keeps feature work isolated and avoids reverse dependencies.

Layers (top to bottom):
- `app`: App bootstrap, providers, routing, and global composition.
- `processes`: Multi-step flows and app-level orchestration.
- `pages`: Route-level screens that assemble widgets/features.
- `widgets`: Reusable page sections composed of features and entities.
- `features`: User-facing capabilities and interactions.
- `entities`: Domain models and entity-level UI.
- `shared`: Cross-cutting utilities, UI primitives, and config.

Dependency direction:
`app` → `processes` → `pages` → `widgets` → `features` → `entities` → `shared`

Allowed imports by layer:
- `app` can import anything below it.
- `processes` can import `pages`, `widgets`, `features`, `entities`, `shared`.
- `pages` can import `widgets`, `features`, `entities`, `shared`.
- `widgets` can import `features`, `entities`, `shared`.
- `features` can import `entities`, `shared`.
- `entities` can import `shared`.
- `shared` can only import `shared`.

Enforcement:
- ESLint enforces the rules with `eslint-plugin-boundaries`.
- Violations are build-time lint errors.

Directory layout:
`src/app`, `src/processes`, `src/pages`, `src/widgets`, `src/features`, `src/entities`, `src/shared`

Notes:
- Use `@/` for absolute imports from `src`.
- If you need cross-layer APIs, move them down into `shared` or refactor the dependency direction.

## Data Fetching, Caching, and Invalidation

This project uses React Query for server state. Query clients are configured in `src/shared/api/queryClient.ts`, and each feature owns its hooks and query keys.

Caching defaults:
- `staleTime`: 30 seconds for freshness while avoiding refetch thrash.
- `gcTime`: 5 minutes to keep recently used data in memory.
- `retry`: up to 2 times for non-HTTP errors (network/transient), no retry for HTTP errors.

Invalidation strategy:
- Queries are keyed by feature (e.g., `["status", "current"]`).
- Mutations invalidate only the relevant feature keys via `queryClient.invalidateQueries` from the feature package.
- Cross-feature invalidation is discouraged; move shared data down to `shared` if needed.

Global error handling:
- HTTP errors are normalized in `src/shared/api/httpClient.ts` and reported via `src/shared/api/errorHandling.ts`.
- React Query uses the same centralized error handler for queries and mutations.
