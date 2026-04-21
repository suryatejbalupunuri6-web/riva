import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Info, Loader2, Phone, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createActorWithConfig } from "../config";
import { useApp } from "../context/AppContext";

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/\s/g, "");
  if (!cleaned) return "Phone number is required.";
  const digits = cleaned.replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return "Enter a valid phone number (digits only).";
  if (digits.length < 7 || digits.length > 15)
    return "Phone number must be 7–15 digits.";
  return null;
}

/** Generate a 6-digit OTP locally as fallback when backend is unavailable */
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
    msg.includes("Canister")
  );
}

export default function LoginPage() {
  const { navigate, setCurrentPhone, setDemoOtp } = useApp();
  const [phone, setPhone] = useState("+91");
  const [phoneError, setPhoneError] = useState("");
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentOtp, setSentOtp] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const actorRef = useRef<Awaited<
    ReturnType<typeof createActorWithConfig>
  > | null>(null);

  // Pre-warm actor on mount
  useEffect(() => {
    console.log("[OTP] Pre-warming backend actor...");
    createActorWithConfig()
      .then((a) => {
        actorRef.current = a;
        console.log("[OTP] Actor pre-warmed successfully");
      })
      .catch((e) => {
        console.warn("[OTP] Actor pre-warm failed:", e);
      });
  }, []);

  // Auto-navigate to otp-verify 2 seconds after OTP is generated
  useEffect(() => {
    if (!sentOtp) return;
    const timer = setTimeout(() => {
      navigate("otp-verify");
    }, 2000);
    return () => clearTimeout(timer);
  }, [sentOtp, navigate]);

  const handleSendOTP = async () => {
    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError("");
    setSendError("");
    setLoading(true);
    setIsFallback(false);

    console.log("[OTP] Requesting OTP for", phone);

    try {
      // Use cached actor or create a fresh one
      let actor = actorRef.current;
      if (!actor) {
        console.log("[OTP] Creating fresh actor...");
        actor = await createActorWithConfig();
        actorRef.current = actor;
      }

      console.log("[OTP] Calling backend generateOtp...");
      const otp = await actor.generateOtp(phone.trim());
      console.log("[OTP] Backend returned OTP successfully");

      setSentOtp(otp);
      setDemoOtp(otp);
      setCurrentPhone(phone.trim());
      setIsFallback(false);
      toast.success("OTP sent! Auto-redirecting in 2 seconds…");
    } catch (e: unknown) {
      const stopped = isCanisterStoppedError(e);
      console.error("[OTP] Backend call failed:", e);
      console.warn(
        "[OTP] Canister stopped:",
        stopped,
        "— using local fallback OTP",
      );

      // Reset actor so next attempt tries fresh
      actorRef.current = null;

      // Fallback: generate OTP locally
      const localOtp = generateLocalOtp(phone.trim());
      setSentOtp(localOtp);
      setDemoOtp(localOtp);
      setCurrentPhone(phone.trim());
      setIsFallback(true);

      if (stopped) {
        toast.warning("Backend temporarily unavailable — using test OTP.");
      } else {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : "Backend error";
        console.error("[OTP] Non-stop error:", msg);
        toast.warning("Could not reach backend — using test OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAndContinue = () => {
    navigator.clipboard.writeText(sentOtp).catch(() => {});
    navigate("otp-verify");
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
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-white fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to Riva
          </h1>
          <p className="text-sm text-foreground/70 font-medium mt-1">
            Enter your phone number to continue
          </p>
        </div>

        <div
          className="bg-card border border-border rounded-xl shadow-card p-6 space-y-4"
          data-ocid="login.panel"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="phone"
              className="text-sm font-semibold text-foreground"
            >
              Mobile Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError("");
                  setSendError("");
                }}
                className="pl-9 border-border bg-white text-foreground"
                data-ocid="login.phone.input"
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
              />
            </div>
            {phoneError && (
              <p
                className="text-xs text-destructive font-medium"
                data-ocid="login.phone_error"
              >
                {phoneError}
              </p>
            )}
          </div>

          <Button
            onClick={handleSendOTP}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
            data-ocid="login.send_otp.button"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending OTP…
              </>
            ) : (
              "Send OTP"
            )}
          </Button>

          {sendError && (
            <p
              className="text-xs text-red-600 font-semibold text-center"
              data-ocid="login.send_error_state"
            >
              ⚠️ {sendError}
            </p>
          )}

          {sentOtp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`border-2 rounded-xl p-4 space-y-3 ${
                isFallback
                  ? "bg-orange-50 border-orange-400"
                  : "bg-amber-50 border-amber-400"
              }`}
              data-ocid="login.demo_otp.panel"
            >
              <div className="flex gap-2 items-start">
                <Info
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isFallback ? "text-orange-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${
                      isFallback ? "text-orange-800" : "text-amber-800"
                    }`}
                  >
                    {isFallback
                      ? "Test OTP (backend offline) — Use this code:"
                      : "Demo OTP — Use this code:"}
                  </p>
                  <p
                    className={`text-3xl font-mono font-extrabold tracking-[0.3em] mt-1 ${
                      isFallback ? "text-orange-900" : "text-amber-900"
                    }`}
                  >
                    {sentOtp}
                  </p>
                  <p
                    className={`text-xs mt-1 font-medium ${
                      isFallback ? "text-orange-700" : "text-amber-700"
                    }`}
                  >
                    Auto-redirecting in 2 seconds…
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCopyAndContinue}
                className={`w-full text-white font-bold text-sm ${
                  isFallback
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
                data-ocid="login.copy_continue.button"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy OTP &amp; Continue
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
