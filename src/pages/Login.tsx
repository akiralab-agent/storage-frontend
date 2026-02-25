import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/auth";
import axios from "axios";
import "./Login.css";

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
    <main className="login-page">
      <div className="login-page__pattern" />

      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__brand">
            <span className="login-card__icon">AS</span>
            <span className="login-card__brand-text">Agent Storage</span>
          </div>
          <h1 className="login-card__title">Welcome back</h1>
          <p className="login-card__subtitle">
            Sign in with your credentials to access the dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="login-form">
          <div className="login-field">
            <label className="login-field__label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className={`login-field__input${errors.username ? " login-field__input--error" : ""}`}
              {...register("username", {
                required: "Email is required.",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: "Enter a valid email."
                }
              })}
            />
            {errors.username ? (
              <span className="login-field__error">{errors.username.message}</span>
            ) : null}
          </div>

          <div className="login-field">
            <label className="login-field__label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={`login-field__input${errors.password ? " login-field__input--error" : ""}`}
              {...register("password", {
                required: "Password is required.",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters."
                }
              })}
            />
            {errors.password ? (
              <span className="login-field__error">{errors.password.message}</span>
            ) : null}
          </div>

          {formError ? <div className="login-form__error">{formError}</div> : null}

          <button type="submit" disabled={isSubmitting} className="login-form__submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="login-card__footer">Secure access powered by Agent Storage</p>
      </div>
    </main>
  );
}
