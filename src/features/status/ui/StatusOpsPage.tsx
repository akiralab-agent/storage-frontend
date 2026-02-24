import { useStatusQuery } from "@/features/status/hooks";

export default function StatusOpsPage() {
  const { data, isLoading, isError, error } = useStatusQuery();

  return (
    <main className="page">
      <section className="card">
        <h1>Operations Status</h1>
        <p>Restricted to ops role at primary facility.</p>
        <p>
          API status:{" "}
          {isLoading && <strong>Loading...</strong>}
          {!isLoading && !isError && data && (
            <strong>
              {data.status} ({new Date(data.timestamp).toLocaleString()})
            </strong>
          )}
          {isError && <strong>Unavailable</strong>}
        </p>
        {isError && (
          <p>
            Error: <strong>{error instanceof Error ? error.message : "Unknown error"}</strong>
          </p>
        )}
      </section>
    </main>
  );
}
