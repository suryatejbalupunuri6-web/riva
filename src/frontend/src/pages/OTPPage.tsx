import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { sendOtp, verifyOtp } from "../utils/clerkAuth";

const RESEND_COOLDOWN = 120; // 2 minutes

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function _roleToScreen(role: UserRole) {
  switch (role) {
    case UserRole.customer:
      return "customer-dashboard" as const;
    case UserRole.store:
      return "vendor-dashboard" as const;
    case UserRole.deliveryP:
      return "delivery-dashboard" as const;
    default:
      return "customer-dashboard" as const;
  }
}

export default function OTPPage() {
  const { actor } = useActor();
  const { currentPhone, setClerkSessionId, setCurrentUser } = useApp();
  const navigate = useNavigate();
  const goToLogin = () => navigate({ to: "/login" });
  const queryClient = useQueryClient();
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown on mount
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    setOtpError("");
    setLoading(true);

    console.log("[OTP Verify] Verifying code via Clerk for", currentPhone);

    const result = await verifyOtp(otp);
    if (!result.success) {
      setLoading(false);
      const msg = result.error ?? "Invalid OTP. Please try again.";
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    // Persist Clerk session ID
    if (result.sessionId) {
      setClerkSessionId(result.sessionId);
    }

    // Check backend profile status
    try {
      const actorToUse = actor;
      if (!actorToUse) throw new Error("Actor not ready");
      const isNew = await actorToUse.isNewUser(currentPhone);
      if (isNew) {
        navigate({ to: "/role-setup" });
      } else {
        const profile = await actorToUse.getCallerUserProfile();
        if (profile) {
          setCurrentUser(profile);
          queryClient.setQueryData(["callerProfile"], profile);
          navigate({ to: "/customer" });
        } else {
          navigate({ to: "/role-setup" });
        }
      }
      toast.success("Verified successfully!");
    } catch (e: unknown) {
      console.error("[OTP Verify] Post-verify profile fetch failed:", e);
      navigate({ to: "/role-setup" });
      toast.success("Verified!");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    console.log("[OTP Resend] Resending OTP via Clerk to", currentPhone);

    const result = await sendOtp(currentPhone);
    setResendLoading(false);

    if (result.success) {
      toast.success("OTP resent to your phone!");
    } else {
      toast.error(result.error ?? "Failed to resend OTP.");
    }

    // Reset countdown regardless
    setResendCooldown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "#f0fdf4" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: "#16a34a" }} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify OTP</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Real SMS sent to{" "}
            <span className="font-bold text-foreground">
              {currentPhone || "your number"}
            </span>
          </p>
        </div>

        <div
          className="bg-card border border-border rounded-xl shadow-card p-6 space-y-5"
          data-ocid="otp.panel"
        >
          <div className="flex flex-col items-center gap-3">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(v) => {
                setOtp(v);
                setOtpError("");
              }}
              data-ocid="otp.input"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {otpError && (
              <p
                className="text-xs font-semibold"
                style={{ color: "#dc2626" }}
                data-ocid="otp.error_state"
              >
                {otpError}
              </p>
            )}
          </div>

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            data-ocid="otp.verify.button"
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "8px",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "15px",
              cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              touchAction: "manipulation",
              boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
              opacity: loading || otp.length < 6 ? 0.6 : 1,
              minHeight: "48px",
              transition: "opacity 0.15s ease",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying\u2026
              </>
            ) : (
              "Verify OTP"
            )}
          </button>

          {/* Resend with MM:SS countdown */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="flex items-center gap-1 text-xs font-semibold disabled:cursor-not-allowed hover:underline"
              style={{
                color:
                  resendCooldown > 0 || resendLoading ? "#9ca3af" : "#16a34a",
              }}
              data-ocid="otp.resend.button"
            >
              <RotateCcw className="w-3 h-3" />
              {resendLoading
                ? "Sending\u2026"
                : resendCooldown > 0
                  ? `Resend in ${formatCountdown(resendCooldown)}`
                  : "Resend OTP"}
            </button>
          </div>

          <button
            type="button"
            onClick={goToLogin}
            className="block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="otp.back.link"
          >
            \u2190 Change phone number
          </button>
        </div>
      </motion.div>
    </div>
  );
}
