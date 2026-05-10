import { useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, User, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email address is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return "Enter a valid email address.";
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Your name is required.";
  if (name.trim().length < 2) return "Name must be at least 2 characters.";
  return null;
}

export default function EmailLoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();
  const { setCustomerName } = useApp();
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("riva_user_name") ?? "";
    } catch {
      return "";
    }
  });
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mode, setMode] = useState<"email" | "google">("google");

  const handleGoogleLogin = () => {
    const nErr = validateName(name);
    if (nErr) {
      setNameError(nErr);
      return;
    }
    setNameError("");
    setCustomerName(name.trim());
    try {
      localStorage.setItem("riva_user_name", name.trim());
    } catch {
      /* ignore */
    }
    login();
  };

  const handleEmailLogin = async () => {
    const nErr = validateName(name);
    const eErr = validateEmail(email);
    if (nErr) {
      setNameError(nErr);
      return;
    }
    if (eErr) {
      setEmailError(eErr);
      return;
    }
    setNameError("");
    setEmailError("");
    setCustomerName(name.trim());
    try {
      localStorage.setItem("riva_user_name", name.trim());
    } catch {
      /* ignore */
    }
    toast.info("Connecting via Internet Identity...");
    login();
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "#16a34a" }}
          >
            <Zap
              className="w-6 h-6"
              style={{ color: "#ffffff", fill: "#ffffff" }}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to Riva
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Sign in with Google or email to get started
          </p>
        </div>

        <div
          className="bg-card border border-border rounded-xl shadow-card p-6 space-y-4"
          data-ocid="login.panel"
        >
          {/* Customer Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="customer-name"
              className="text-sm font-semibold text-foreground flex gap-1"
            >
              Your Name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="customer-name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
                style={{
                  fontSize: "16px",
                  width: "100%",
                  padding: "12px 12px 12px 2.5rem",
                  borderRadius: "8px",
                  border: nameError ? "2px solid #dc2626" : "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  color: "#1f2937",
                  outline: "none",
                }}
                data-ocid="login.name.input"
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (mode === "email" ? handleEmailLogin() : handleGoogleLogin())
                }
                autoComplete="name"
              />
            </div>
            {nameError && (
              <p
                className="text-xs font-semibold"
                style={{ color: "#dc2626" }}
                data-ocid="login.name_error"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Google / Internet Identity Login — primary */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            data-ocid="login.google.button"
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "8px",
              backgroundColor: isLoggingIn ? "#15803d" : "#16a34a",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "15px",
              cursor: isLoggingIn ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              touchAction: "manipulation",
              boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
              opacity: 1,
              minHeight: "48px",
            }}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                    fill="#fff"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                    fill="#fff"
                    opacity=".9"
                  />
                  <path
                    d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
                    fill="#fff"
                    opacity=".8"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
                    fill="#fff"
                    opacity=".7"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#e5e7eb" }}
            />
            <span className="text-xs text-muted-foreground font-medium">
              or
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#e5e7eb" }}
            />
          </div>

          {/* Email section toggle */}
          {mode === "google" ? (
            <button
              type="button"
              onClick={() => setMode("email")}
              data-ocid="login.email.toggle"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "#374151",
                border: "1.5px solid #e5e7eb",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                touchAction: "manipulation",
                minHeight: "46px",
              }}
            >
              <Mail className="w-4 h-4" />
              Sign in with Email
            </button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-foreground flex gap-1"
                >
                  Email Address <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    style={{
                      fontSize: "16px",
                      width: "100%",
                      padding: "12px 12px 12px 2.5rem",
                      borderRadius: "8px",
                      border: emailError
                        ? "2px solid #dc2626"
                        : "1px solid #e5e7eb",
                      backgroundColor: "#ffffff",
                      color: "#1f2937",
                      outline: "none",
                    }}
                    data-ocid="login.email.input"
                    onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                    autoComplete="email"
                    spellCheck={false}
                  />
                </div>
                {emailError && (
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#dc2626" }}
                    data-ocid="login.email_error"
                  >
                    {emailError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleEmailLogin}
                disabled={isLoggingIn}
                data-ocid="login.email.submit_button"
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "8px",
                  backgroundColor: isLoggingIn ? "#15803d" : "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: isLoggingIn ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  touchAction: "manipulation",
                  boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
                  opacity: 1,
                  minHeight: "48px",
                }}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
                  </>
                ) : (
                  "Sign In →"
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode("google")}
                className="block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="login.back.link"
              >
                ← Back to Google sign-in
              </button>
            </div>
          )}

          <p
            className="text-xs text-center text-muted-foreground"
            style={{ lineHeight: 1.5 }}
          >
            By continuing, you agree to Riva's{" "}
            <button
              type="button"
              className="underline font-medium hover:text-foreground"
              onClick={() => {}}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "inherit",
                fontSize: "inherit",
              }}
            >
              Terms & Privacy
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
