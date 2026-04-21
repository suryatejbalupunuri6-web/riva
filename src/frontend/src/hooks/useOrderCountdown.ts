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
} {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!orderId) return 0;
    try {
      const timestamps: Record<string, number> = JSON.parse(
        localStorage.getItem("riva_order_timestamps") || "{}",
      );
      const createdAt = timestamps[orderId];
      if (!createdAt) return 0;
      const elapsed = Date.now() - createdAt;
      return Math.max(0, Math.floor((EXPIRY_MS - elapsed) / 1000));
    } catch {
      return 0;
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
          setSecondsLeft(0);
          return;
        }
        const elapsed = Date.now() - createdAt;
        setSecondsLeft(Math.max(0, Math.floor((EXPIRY_MS - elapsed) / 1000)));
      } catch {
        setSecondsLeft(0);
      }
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [orderId]);

  return { secondsLeft, isExpired: secondsLeft === 0 };
}
