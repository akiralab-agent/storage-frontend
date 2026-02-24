import { useStatusQuery } from "@/features/status/hooks";
import { useStatusViewStore } from "@/features/status/store/statusViewStore";

export default function StatusOpsPage() {
  const { data, isLoading, isError, error } = useStatusQuery();
  const showTimestamp = useStatusViewStore((state) => state.showTimestamp);
  const toggleShowTimestamp = useStatusViewStore((state) => state.toggleShowTimestamp);

  return (
    <main className="page">
      <section className="card">
        <h1>Operations Status</h1>
        <p>Restricted to ops role at primary facility.</p>
        <p>
          API status: {isLoading && <strong>Loading...</strong>}
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
