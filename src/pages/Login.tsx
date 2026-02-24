import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/auth";
import axios from "axios";

type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    defaultValues: {
      username: "",
      password: ""
    }
  });

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={redirectTo ?? "/dashboard"} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setFormError("Invalid credentials.");
        return;
      }
      setFormError("Unable to sign in. Please try again.");
    }
  };

  return (
    <main style={{ padding: "48px 16px", maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Sign in</h1>
      <p style={{ marginBottom: 24, color: "#4b5563" }}>
        Use your email and password to access the dashboard.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            autoComplete="email"
            style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }}
            {...register("username", {
              required: "Email is required.",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Enter a valid email."
              }
            })}
          />
          {errors.username ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>{errors.username.message}</span>
          ) : null}
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px" }}
            {...register("password", {
              required: "Password is required.",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters."
              }
            })}
          />
          {errors.password ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>{errors.password.message}</span>
          ) : null}
        </label>

        {formError ? <div style={{ marginBottom: 16, color: "#b91c1c" }}>{formError}</div> : null}

        <button type="submit" disabled={isSubmitting} style={{ width: "100%", padding: "12px" }}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
