import { useAuth } from "@/shared/auth";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main style={{ padding: "48px 16px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
      <p style={{ marginBottom: 24, color: "#4b5563" }}>
        Welcome back{user ? `, ${user.name}` : ""}.
      </p>
      <button type="button" onClick={logout} style={{ padding: "10px 16px" }}>
        Log out
      </button>
    </main>
  );
}
