import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, ShoppingBag, Store, Truck } from "lucide-react";
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
  const { setCurrentUser, customerName: prefilledName } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Pre-fill from context, then localStorage fallback
  const [name, setName] = useState(() => {
    if (prefilledName) return prefilledName;
    try {
      return localStorage.getItem("riva_user_name") ?? "";
    } catch {
      return "";
    }
  });
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showAdminMsg, setShowAdminMsg] = useState<string | null>(null);

  /**
   * Warm the canister with an update call before each createUserProfile attempt.
   * generateOtp is an update call — it wakes the canister for writes.
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

  const handleContinue = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Please enter your name to continue");
      return;
    }
    if (trimmedName.length < 2) {
      setNameError("Name must be at least 2 characters.");
      return;
    }
    setNameError("");
    setLoading(true);
    setStatusMsg("Connecting...");

    // Persist name
    try {
      localStorage.setItem("riva_user_name", trimmedName);
    } catch {
      /* ignore */
    }

    try {
      if (!actor) throw new Error("Backend not connected. Please try again.");

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(
            `[RoleSelection] createUserProfile attempt ${attempt}/${MAX_RETRIES}`,
          );

          await warmUpCanister();

          await actor.createUserProfile("", trimmedName, UserRole.customer);

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
            await delay(RETRY_DELAY_MS);
            continue;
          }

          throw e;
        }
      }

      if (lastError) throw lastError;

      // Fetch and store profile
      const profile = await actor.getCallerUserProfile();
      if (profile) {
        setCurrentUser(profile);
        queryClient.setQueryData(["callerProfile"], profile);
      }

      sessionStorage.removeItem("riva_verified_phone");
      sessionStorage.removeItem("riva_verified_otp");

      navigate({ to: "/customer" });
      toast.success("Riva: Profile created! Welcome to Riva.");
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
          <h1 className="text-2xl font-bold text-foreground">Almost there!</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Confirm your name to set up your Riva account
          </p>
        </div>

        <div
          className="bg-card border border-border rounded-xl shadow-card p-6 space-y-4"
          data-ocid="role.panel"
        >
          {/* Name field */}
          <div className="space-y-1.5">
            <label
              htmlFor="role-name"
              className="text-sm font-semibold text-foreground flex gap-1"
            >
              Your Name
              <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="role-name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setNameError("");
              }}
              style={{
                fontSize: "16px",
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: nameError ? "2px solid #dc2626" : "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                color: "#1f2937",
                outline: "none",
              }}
              data-ocid="role.name.input"
              aria-required="true"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "role-name-error" : undefined}
              autoComplete="name"
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            />
            {nameError && (
              <p
                id="role-name-error"
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: "#dc2626" }}
                data-ocid="role.name.error_state"
              >
                <span>⚠</span> {nameError}
              </p>
            )}
          </div>

          {/* Customer — pre-selected */}
          <div className="grid gap-3">
            <div className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-primary/5">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">Customer</p>
                <p className="text-xs text-muted-foreground">
                  Order items from nearby stores.
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#16a34a" }}
              >
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
            </div>

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
                  onClick={() =>
                    setShowAdminMsg(
                      showAdminMsg === opt.title ? null : opt.title,
                    )
                  }
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
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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

          {/* Continue button — solid green */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
            data-ocid="role.continue.primary_button"
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
              boxShadow: loading ? "none" : "0 2px 8px rgba(22,163,74,0.3)",
              opacity: 1,
              minHeight: "48px",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusMsg || "Setting up your account…"}
              </>
            ) : (
              "Continue as Customer →"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
