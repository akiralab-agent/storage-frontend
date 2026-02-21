/// <reference types="vite/client" />

type AppEnv = "development" | "staging" | "production";

interface ImportMetaEnv {
  readonly VITE_APP_ENV: AppEnv;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_MODE__: AppEnv;
