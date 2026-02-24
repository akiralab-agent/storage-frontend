import { env } from "@/shared/config/env";
import { useStatusQuery } from "@/features/status/hooks";
import { useStatusViewStore } from "@/features/status/store/statusViewStore";

export default function StatusPage() {
  const { data, isLoading, isError, error } = useStatusQuery();
  const showTimestamp = useStatusViewStore((state) => state.showTimestamp);
  const toggleShowTimestamp = useStatusViewStore((state) => state.toggleShowTimestamp);

  return (
    <main className="page">
      <section className="card">
        <h1>AkiraLab Storage Frontend</h1>
        <p>
          Vite mode: <strong>{env.mode}</strong>
        </p>
        <p>
          API base URL: <strong>{env.apiBaseUrl}</strong>
        </p>
        <p>
          API status:{" "}
          {isLoading && <strong>Loading...</strong>}
          {!isLoading && !isError && data && (
            <strong>
              {data.status}
              {showTimestamp && ` (${new Date(data.timestamp).toLocaleString()})`}
            </strong>
          )}
          {isError && <strong>Unavailable</strong>}
        </p>
        <button className="pill-button" type="button" onClick={toggleShowTimestamp}>
          {showTimestamp ? "Hide timestamp" : "Show timestamp"}
        </button>
        {isError && (
          <p>
            Error: <strong>{error instanceof Error ? error.message : "Unknown error"}</strong>
          </p>
        )}
      </section>
    </main>
  );
}
