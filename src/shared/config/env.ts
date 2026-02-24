const mode = import.meta.env.MODE;

export const env = {
  mode,
  apiBaseUrl:
    import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"
};
