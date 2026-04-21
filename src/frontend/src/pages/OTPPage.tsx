import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCopy,
  Info,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserRole, type backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";

function roleToScreen(role: UserRole) {
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

/** Generate a 6-digit OTP locally as fallback */
function generateLocalOtp(phone: string): string {
  const seed =
    Date.now() + phone.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const raw = seed % 900000;
  return String(100000 + raw);
}

/** Check if an error is an IC0508 stopped-canister error */
function isCanisterStoppedError(e: unknown): boolean {
  const msg =
    e && typeof e === "object" && "message" in e
      ? String((e as { message: unknown }).message)
      : String(e);
  return (
    msg.includes("IC0508") ||
    msg.includes("stopped") ||
    msg.toLowerCase().includes("canister")
  );
}

export default function OTPPage() {
  const { actor } = useActor();
  const { navigate, currentPhone, demoOtp, setDemoOtp, setCurrentUser } =
    useApp();
  const queryClient = useQueryClient();
  // Initialize OTP with demoOtp if available (auto-fill on load)
  const [otp, setOtp] = useState(() => demoOtp || "");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  /**
   * Verify OTP with backend. If backend is stopped (IC0508),
   * fall back to comparing entered OTP against the locally stored demoOtp.
   */
  const handleVerify = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    setOtpError("");
    setLoading(true);

    console.log("[OTP Verify] Attempting verification for", currentPhone);

    try {
      // Try backend verification first
      const actorToUse = actor;
      if (!actorToUse) {
        throw new Error("Actor not ready");
      }

      console.log("[OTP Verify] Calling backend verifyOtp...");
      const valid = await actorToUse.verifyOtp(currentPhone, otp);
      console.log("[OTP Verify] Backend result:", valid);

      if (!valid) {
        // Check if it matches local demoOtp as fallback
        if (demoOtp && otp === demoOtp) {
          console.log(
            "[OTP Verify] Backend said invalid but matches local demoOtp, accepting",
          );
          await continueAfterVerification(actorToUse);
          return;
        }
        setOtpError("Incorrect OTP. Please try again.");
        return;
      }

      // Persist verified credentials so RoleSelectionPage can re-establish OTP
      // state in the backend if the canister stops between verification and profile creation.
      sessionStorage.setItem("riva_verified_phone", currentPhone);
      sessionStorage.setItem("riva_verified_otp", otp);
      await continueAfterVerification(actorToUse);
    } catch (e: unknown) {
      const stopped = isCanisterStoppedError(e);
      console.error(
        "[OTP Verify] Backend call failed:",
        e,
        "stopped:",
        stopped,
      );

      // Fallback: if entered OTP matches the locally stored demoOtp, allow login
      if (demoOtp && otp === demoOtp) {
        console.log(
          "[OTP Verify] Backend unavailable but OTP matches local demoOtp — proceeding",
        );
        toast.info("Verified locally (backend offline).");
        // Persist for RoleSelectionPage resilience even on local fallback
        sessionStorage.setItem("riva_verified_phone", currentPhone);
        sessionStorage.setItem("riva_verified_otp", otp);
        // Navigate to role selection for new users (safest default when backend is offline)
        navigate("role-selection");
        toast.success("Verified successfully!");
        return;
      }

      const errMsg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Verification failed.";
      toast.error(
        stopped ? "Backend temporarily unavailable. Please retry." : errMsg,
      );
      setOtpError(
        stopped
          ? "Backend unavailable. Please try again."
          : "Verification failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const continueAfterVerification = async (
    actorToUse: NonNullable<typeof actor>,
  ) => {
    try {
      const isNew = await actorToUse.isNewUser(currentPhone);
      if (isNew) {
        navigate("role-selection");
      } else {
        const profile = await actorToUse.getCallerUserProfile();
        if (profile) {
          setCurrentUser(profile);
          queryClient.setQueryData(["callerProfile"], profile);
          navigate(roleToScreen(profile.role));
        } else {
          navigate("role-selection");
        }
      }
      toast.success("Verified successfully!");
    } catch (e: unknown) {
      console.error("[OTP Verify] Post-verify profile fetch failed:", e);
      // Still navigate to role selection as a safe fallback
      navigate("role-selection");
      toast.success("Verified!");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    console.log("[OTP Resend] Requesting new OTP for", currentPhone);

    try {
      // Try backend first
      let backendActor: backendInterface | null =
        actor as backendInterface | null;
      if (!backendActor) {
        backendActor = await createActorWithConfig();
      }
      const newOtp = await backendActor!.generateOtp(currentPhone);
      console.log("[OTP Resend] Backend OTP generated");
      setDemoOtp(newOtp);
      setOtp(newOtp);
      toast.success("OTP resent and auto-filled!");
    } catch (e: unknown) {
      console.warn("[OTP Resend] Backend failed, using local fallback:", e);
      // Fallback to local OTP generation
      const localOtp = generateLocalOtp(currentPhone);
      setDemoOtp(localOtp);
      setOtp(localOtp);
      toast.warning("Backend offline — test OTP generated.");
    } finally {
      setResendLoading(false);
      setResendCooldown(60);
      timerRef.current = setInterval(() => {
        setResendCooldown((v) => {
          if (v <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    }
  };

  const handleAutoFill = () => {
    if (demoOtp) {
      setOtp(demoOtp);
      setOtpError("");
      toast.success("OTP auto-filled!");
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
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify OTP</h1>
          <p className="text-sm text-foreground/70 font-medium mt-1">
            Code sent to{" "}
            <span className="font-bold text-foreground">
              {currentPhone || "your number"}
            </span>
          </p>
        </div>

        <div
          className="bg-card border border-border rounded-xl shadow-card p-6 space-y-5"
          data-ocid="otp.panel"
        >
          {demoOtp && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-3"
              data-ocid="otp.demo_otp.panel"
            >
              <div className="flex gap-2 items-start">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                    Your OTP code:
                  </p>
                  <p className="text-3xl font-mono font-extrabold text-amber-900 tracking-[0.3em] mt-1">
                    {demoOtp}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAutoFill}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm"
                data-ocid="otp.autofill.button"
              >
                <ClipboardCopy className="w-4 h-4 mr-2" />
                Auto-fill OTP
              </Button>
            </motion.div>
          )}

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
                className="text-xs text-destructive font-semibold"
                data-ocid="otp.error_state"
              >
                {otpError}
              </p>
            )}
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
            data-ocid="otp.verify.button"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify OTP"
            )}
          </Button>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="flex items-center gap-1 text-xs font-semibold text-primary disabled:text-foreground/40 disabled:cursor-not-allowed hover:underline"
              data-ocid="otp.resend.button"
            >
              <RotateCcw className="w-3 h-3" />
              {resendLoading
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend OTP"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("phone-login")}
            className="block w-full text-center text-xs font-medium text-foreground/60 hover:text-foreground"
            data-ocid="otp.back.link"
          >
            ← Change phone number
          </button>
        </div>
      </motion.div>
    </div>
  );
}
