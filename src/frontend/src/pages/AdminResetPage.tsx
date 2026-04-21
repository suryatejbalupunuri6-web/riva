import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";

const ADMIN_PASSWORD = "FLASHMART007";

interface ResetLogEntry {
  timestamp: bigint;
  caller: { toText(): string };
}

function useGetResetLogs() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<ResetLogEntry[]>({
    queryKey: ["resetLogs"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await (actor as any).getResetLogs();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

function formatTimestamp(ts: bigint): string {
  try {
    const ms = Number(ts / 1_000_000n);
    return new Date(ms).toLocaleString();
  } catch {
    return "Unknown";
  }
}

export default function AdminResetPage() {
  const { navigate } = useApp();
  const { actor } = useActor();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: resetLogs } = useGetResetLogs();

  const lastLog =
    resetLogs && resetLogs.length > 0
      ? [...resetLogs].sort((a, b) => Number(b.timestamp - a.timestamp))[0]
      : null;

  const isFormFilled =
    password.trim().length > 0 && confirmText.trim().length > 0;

  const handleReset = async () => {
    setError("");
    setSuccess("");

    // Client-side validation first
    if (password.trim() !== ADMIN_PASSWORD) {
      setError("Invalid admin credentials. Check your password.");
      return;
    }
    if (confirmText.trim() !== "RESET") {
      setError('Type exactly "RESET" in the confirmation field.');
      return;
    }

    setLoading(true);
    try {
      if (!actor) throw new Error("Backend not connected. Please try again.");

      // Pass both password and confirmation to backend
      const result: string = await (actor as any).resetAllData(
        password.trim(),
        confirmText.trim(),
      );
      console.log("[AdminReset] Backend response:", result);

      if (result.startsWith("Error:")) {
        setError(result);
        return;
      }

      // Success
      setSuccess("Reset successful");
      localStorage.clear();
      setTimeout(() => {
        navigate("landing");
      }, 1500);
    } catch (err: unknown) {
      console.error("[AdminReset] Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Reset failed: ${msg || "backend error. Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Riva Admin
            </h1>
            <p className="text-xs text-muted-foreground">Reset Data Control</p>
          </div>
        </div>

        {/* Danger Warning */}
        <div
          className="border-2 border-destructive rounded-xl p-4 mb-6 bg-destructive/5"
          data-ocid="admin.reset.dialog"
        >
          <div className="flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-destructive text-sm">
                ⚠️ This will delete ALL app data permanently
              </p>
              <p className="text-xs text-destructive/80 mt-1 leading-relaxed">
                All users, stores, products, orders, delivery data, and
                notifications will be erased. This action cannot be undone. The
                app will reset to a fresh install state.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              Confirm Reset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Admin Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="admin-password"
                className="text-sm font-medium text-foreground"
              >
                Admin Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
                autoComplete="off"
                data-ocid="admin.reset.input"
              />
            </div>

            {/* Confirmation Text */}
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm-text"
                className="text-sm font-medium text-foreground"
              >
                Type{" "}
                <span className="font-mono font-bold text-destructive">
                  RESET
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="confirm-text"
                type="text"
                placeholder="Type RESET here"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
                autoComplete="off"
                data-ocid="admin.reset.textarea"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3"
                data-ocid="admin.reset.error_state"
              >
                <p className="text-sm font-semibold text-destructive">
                  {error}
                </p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                className="rounded-lg bg-green-50 border border-green-300 px-4 py-3 flex items-center gap-2"
                data-ocid="admin.reset.success_state"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-green-700">
                  {success}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-1">
              <Button
                onClick={handleReset}
                disabled={!isFormFilled || loading}
                className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold"
                data-ocid="admin.reset.delete_button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset All Data"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("landing")}
                disabled={loading}
                className="w-full"
                data-ocid="admin.reset.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last Reset Log */}
        {lastLog && (
          <div className="mt-5 rounded-lg bg-muted px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Last reset:{" "}
              <span className="font-medium text-foreground">
                {formatTimestamp(lastLog.timestamp)}
              </span>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Authorised personnel only.
        </p>
      </div>
    </div>
  );
}
