import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";

interface ConfirmModalProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-ocid="confirm.modal"
        >
          {/* Backdrop — blocks all pointer events */}
          <div
            className="absolute inset-0 bg-black/50"
            style={{ pointerEvents: "all" }}
          />
          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-xl shadow-xl p-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-2">
              Confirm Action
            </h2>
            <p className="text-sm text-foreground/70 mb-6">{message}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground/70 hover:bg-muted"
                onClick={onCancel}
                data-ocid="confirm.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={onConfirm}
                data-ocid="confirm.confirm_button"
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
