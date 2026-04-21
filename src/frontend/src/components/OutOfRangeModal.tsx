import { XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface OutOfRangeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function OutOfRangeModal({
  open,
  onClose,
}: OutOfRangeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
            onClick={onClose}
          />

          <motion.div
            className="relative bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 text-center">
              Delivery Not Available
            </h2>
            <p className="text-sm text-gray-500 text-center mt-2">
              Sorry, delivery is not available in your area yet.
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                data-ocid="out_of_range.close_button"
                className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-base transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
