import { useEffect, useState } from "react";

const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function useOrderCountdown(orderId: string | null): {
  secondsLeft: number;
  isExpired: boolean;
  hasTimestamp: boolean;
} {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!orderId) return 0;
    try {
      const timestamps: Record<string, number> = JSON.parse(
        localStorage.getItem("riva_order_timestamps") || "{}",
      );
      const createdAt = timestamps[orderId];
      if (!createdAt) return EXPIRY_MS / 1000; // no timestamp yet → full window
      const elapsed = Date.now() - createdAt;
      return Math.max(0, Math.floor((EXPIRY_MS - elapsed) / 1000));
    } catch {
      return EXPIRY_MS / 1000;
    }
  });

  const [hasTimestamp, setHasTimestamp] = useState<boolean>(() => {
    if (!orderId) return false;
    try {
      const timestamps: Record<string, number> = JSON.parse(
        localStorage.getItem("riva_order_timestamps") || "{}",
      );
      return !!timestamps[orderId];
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!orderId) return;

    const compute = () => {
      try {
        const timestamps: Record<string, number> = JSON.parse(
          localStorage.getItem("riva_order_timestamps") || "{}",
        );
        const createdAt = timestamps[orderId];
        if (!createdAt) {
          // Timestamp not yet written — treat as full window remaining, not expired
          setHasTimestamp(false);
          setSecondsLeft(EXPIRY_MS / 1000);
          return;
        }
        setHasTimestamp(true);
        const elapsed = Date.now() - createdAt;
        setSecondsLeft(Math.max(0, Math.floor((EXPIRY_MS - elapsed) / 1000)));
      } catch {
        setSecondsLeft(EXPIRY_MS / 1000);
      }
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [orderId]);

  // isExpired is only true when a timestamp was found AND the window elapsed
  return {
    secondsLeft,
    hasTimestamp,
    isExpired: hasTimestamp && secondsLeft === 0,
  };
}
