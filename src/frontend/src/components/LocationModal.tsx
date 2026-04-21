import { MapPin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface LocationModalProps {
  open: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

export default function LocationModal({
  open,
  onAllow,
  onCancel,
}: LocationModalProps) {
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
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
            onClick={onCancel}
          />

          {/* Card */}
          <motion.div
            className="relative bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-green-600" />
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 text-center">
              Enable Location
            </h2>
            <p className="text-sm text-gray-500 text-center mt-2">
              We need your location to check delivery availability.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={onAllow}
                data-ocid="location.allow_button"
                className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors"
              >
                Allow Location
              </button>
              <button
                type="button"
                onClick={onCancel}
                data-ocid="location.cancel_button"
                className="w-full h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-base transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
