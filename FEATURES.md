# Feature Boundaries

This frontend is organized by feature domains under `src/features/<domain>`.

Rules

- A feature owns its UI, hooks, services, and types within its own folder.
- Features must not import from other feature folders. Shared logic goes in `src/app/shared` only.
- The app layer (`src/app`) composes features and provides shared configuration, styles, and app-wide primitives.

Structure

- `src/app/App.tsx`: app shell and feature composition.
- `src/app/shared`: shared code only (config, styles, utilities, and shared UI if needed).
- `src/features/<domain>`: feature boundary with `ui`, `hooks`, `services`, `types`.

Adding a Feature

- Create `src/features/<domain>/ui` and keep UI entrypoints there.
- Keep feature-only hooks/services/types within the same feature folder.
- If multiple features need the same code, move it to `src/app/shared`.
