import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, ShoppingBag, Store, Truck } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function isCanisterStopped(e: unknown): boolean {
  const msg = (e as { message?: string })?.message ?? String(e);
  return msg.includes("stopped") || msg.includes("IC0508");
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export default function RoleSelectionPage() {
  const { actor } = useActor();
  const { navigate, currentPhone, setCurrentUser } = useApp();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showAdminMsg, setShowAdminMsg] = useState<string | null>(null);

  /**
   * Fire a warm-up update call before each createUserProfile attempt.
   * generateOtp is an update call — it wakes the canister for writes.
   * Errors are swallowed; this is best-effort.
   */
  const warmUpCanister = async () => {
    if (!actor) return;
    try {
      console.log("[RoleSelection] Warming up canister with update call...");
      await actor.generateOtp("0000000000");
    } catch {
      // Silently ignore — warm-up is best-effort
    }
  };

  /**
   * If we got an IC0508 and sessionStorage has the verified credentials,
   * re-call verifyOtp to re-establish the OTP state in the backend
   * before retrying createUserProfile.
   */
  const reEstablishOtpState = async () => {
    if (!actor) return;
    const savedPhone = sessionStorage.getItem("riva_verified_phone");
    const savedOtp = sessionStorage.getItem("riva_verified_otp");
    if (!savedPhone || !savedOtp) return;
    try {
      console.log(
        "[RoleSelection] Re-establishing OTP state in backend for",
        savedPhone,
      );
      await actor.verifyOtp(savedPhone, savedOtp);
      console.log("[RoleSelection] OTP state re-established successfully.");
    } catch (e) {
      console.warn(
        "[RoleSelection] Failed to re-establish OTP state (non-fatal):",
        e,
      );
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    setStatusMsg("Connecting...");

    try {
      if (!actor) throw new Error("Backend not connected. Please try again.");

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(
            `[RoleSelection] createUserProfile attempt ${attempt}/${MAX_RETRIES}`,
          );

          // Warm the canister with an update call before every attempt
          await warmUpCanister();

          await actor.createUserProfile(
            currentPhone,
            name.trim() || "Riva User",
            UserRole.customer,
          );

          // Success — break out of retry loop
          lastError = null;
          break;
        } catch (e: unknown) {
          lastError = e;
          console.warn(`[RoleSelection] Attempt ${attempt} failed:`, e);

          if (isCanisterStopped(e) && attempt < MAX_RETRIES) {
            setStatusMsg(
              attempt === 1
                ? "Connecting to backend..."
                : `Retrying (${attempt}/${MAX_RETRIES - 1})...`,
            );

            // Re-establish OTP state in case the canister was stopped and lost it
            await reEstablishOtpState();

            await delay(RETRY_DELAY_MS);
            continue;
          }

          // Non-IC0508 error or last attempt — give up
          throw e;
        }
      }

      if (lastError) throw lastError;

      // Profile created — fetch and store it
      const profile = await actor.getCallerUserProfile();
      if (profile) {
        setCurrentUser(profile);
        queryClient.setQueryData(["callerProfile"], profile);
      }

      // Clean up session storage now that profile is created
      sessionStorage.removeItem("riva_verified_phone");
      sessionStorage.removeItem("riva_verified_otp");

      navigate("customer-dashboard");
      toast.success("Profile created! Welcome to Riva.");
    } catch (e: unknown) {
      const msg =
        (e as { message?: string })?.message ?? "Failed to create profile.";
      toast.error(msg);
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Choose Your Role
          </h1>
          <p className="text-sm text-foreground/70 font-medium mt-1">
            How will you use Riva?
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-card p-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-sm font-semibold text-foreground"
            >
              Your Name{" "}
              <span className="text-foreground/60 font-normal">(optional)</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border bg-white text-foreground"
              data-ocid="role.name.input"
            />
          </div>

          {/* Customer — selectable */}
          <div className="grid gap-3">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0 }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-primary/5 text-left"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">Customer</p>
                <p className="text-xs text-foreground/70">
                  Order items from nearby stores.
                </p>
              </div>
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  role="img"
                  aria-label="Selected"
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </motion.div>

            {/* Store Vendor & Delivery — locked */}
            {(
              [
                {
                  icon: Store,
                  title: "Store Vendor",
                  desc: "Accept and fulfill local orders.",
                  color: "text-chart-2",
                  bg: "bg-chart-2/10",
                },
                {
                  icon: Truck,
                  title: "Delivery Partner",
                  desc: "Pick up and deliver orders.",
                  color: "text-chart-3",
                  bg: "bg-chart-3/10",
                },
              ] as const
            ).map((opt, i) => (
              <motion.div
                key={opt.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * (i + 1) }}
              >
                <button
                  type="button"
                  onClick={() => setShowAdminMsg(opt.title)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-muted/30 text-left opacity-75 cursor-pointer hover:bg-muted/50 transition-all"
                >
                  <div
                    className={`w-10 h-10 ${opt.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    <opt.icon className={`w-5 h-5 ${opt.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">
                      {opt.title}
                    </p>
                    <p className="text-xs text-foreground/70">{opt.desc}</p>
                  </div>
                  <Lock className="w-4 h-4 text-foreground/40 flex-shrink-0" />
                </button>

                {showAdminMsg === opt.title && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center"
                  >
                    🔒 Access will be granted by admin
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <Button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
            data-ocid="role.continue.primary_button"
          >
            {loading ? statusMsg || "Connecting..." : "Continue as Customer"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
