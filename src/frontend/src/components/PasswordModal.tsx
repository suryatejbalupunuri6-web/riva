import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export type DashboardRole = "vendor" | "delivery";

const PASSWORDS: Record<DashboardRole, string> = {
  vendor: "FLASHMART2026V",
  delivery: "FLASHMART2026D",
};

const ROLE_LABELS: Record<DashboardRole, string> = {
  vendor: "Vendor Dashboard",
  delivery: "Delivery Dashboard",
};

interface PasswordModalProps {
  dashboardRole: DashboardRole;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PasswordModal({
  dashboardRole,
  onSuccess,
  onCancel,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (password === PASSWORDS[dashboardRole]) {
      setError("");
      onSuccess();
    } else {
      setError("Incorrect password");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-ocid="password.modal"
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Enter Password
              </h2>
              <p className="text-sm text-gray-500">
                {ROLE_LABELS[dashboardRole]}
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="relative mb-1">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              className="pr-10 border-gray-300 text-gray-900 font-medium focus:border-gray-800 focus:ring-gray-800"
              autoFocus
              data-ocid="password.input"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              tabIndex={-1}
              data-ocid="password.toggle"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Error */}
          <div className="h-5 mb-4">
            {error && (
              <motion.p
                className="text-sm text-red-600 font-medium"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                data-ocid="password.error_state"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={onCancel}
              data-ocid="password.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              onClick={handleConfirm}
              data-ocid="password.confirm_button"
            >
              Confirm
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
