import { env } from "@/config/env";

export default function App() {
  return (
    <main className="page">
      <section className="card">
        <h1>AkiraLab Storage Frontend</h1>
        <p>Vite mode: <strong>{env.mode}</strong></p>
        <p>API base URL: <strong>{env.apiBaseUrl}</strong></p>
      </section>
    </main>
  );
}
