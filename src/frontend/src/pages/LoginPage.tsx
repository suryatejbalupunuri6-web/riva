import { useNavigate } from "@tanstack/react-router";
import { Loader2, Phone, User, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { normalizePhone, sendOtp } from "../utils/clerkAuth";

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/\s/g, "");
  if (!cleaned) return "Phone number is required.";
  // After normalization, should be E.164
  const normalized = normalizePhone(cleaned);
  if (!normalized.startsWith("+"))
    return "Enter a valid phone number with country code.";
  const digits = normalized.slice(1);
  if (!/^\d+$/.test(digits)) return "Enter a valid phone number (digits only).";
  if (digits.length < 7 || digits.length > 15)
    return "Phone number must be 7\u201315 digits.";
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "Customer name is required.";
  if (name.trim().length < 2) return "Name must be at least 2 characters.";
  return null;
}

export default function LoginPage() {
  const { setCurrentPhone, setCustomerName } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("+91");
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("riva_user_name") ?? "";
    } catch {
      return "";
    }
  });
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const nErr = validateName(name);
    const pErr = validatePhone(phone);
    if (nErr) {
      setNameError(nErr);
      return;
    }
    if (pErr) {
      setPhoneError(pErr);
      return;
    }

    setNameError("");
    setPhoneError("");
    setSendError("");
    setLoading(true);

    // Store name persistently
    setCustomerName(name.trim());
    try {
      localStorage.setItem("riva_user_name", name.trim());
    } catch {
      /* ignore */
    }

    const normalized = normalizePhone(phone.trim());
    console.log("[Login] Sending OTP to", normalized);

    const result = await sendOtp(normalized, name.trim());
    setLoading(false);

    if (result.success) {
      setCurrentPhone(normalized);
      toast.success("OTP sent to your phone!");
      navigate({ to: "/login" });
    } else {
      const errMsg = result.error ?? "Failed to send OTP. Please try again.";
      setSendError(errMsg);
      toast.error(errMsg);
    }
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
            We'll send a real SMS OTP to your phone
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
              Customer Name <span style={{ color: "#dc2626" }}>*</span>
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
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
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

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label
              htmlFor="phone"
              className="text-sm font-semibold text-foreground flex gap-1"
            >
              Mobile Number <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <p className="text-xs text-muted-foreground">
              +91XXXXXXXXXX or 10-digit Indian number
            </p>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError("");
                  setSendError("");
                }}
                style={{
                  fontSize: "16px",
                  width: "100%",
                  padding: "12px 12px 12px 2.5rem",
                  borderRadius: "8px",
                  border: phoneError
                    ? "2px solid #dc2626"
                    : "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  color: "#1f2937",
                  outline: "none",
                }}
                data-ocid="login.phone.input"
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                autoComplete="tel"
              />
            </div>
            {phoneError && (
              <p
                className="text-xs font-semibold"
                style={{ color: "#dc2626" }}
                data-ocid="login.phone_error"
              >
                {phoneError}
              </p>
            )}
          </div>

          {/* Send OTP button */}
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={loading}
            data-ocid="login.send_otp.button"
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "8px",
              backgroundColor: loading ? "#15803d" : "#16a34a",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
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
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending OTP…
              </>
            ) : (
              "Send OTP \u2192"
            )}
          </button>

          {sendError && (
            <p
              className="text-xs font-semibold text-center"
              style={{ color: "#dc2626" }}
              data-ocid="login.send_error_state"
            >
              \u26a0\ufe0f {sendError}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
