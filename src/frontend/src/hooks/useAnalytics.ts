import { useQuery } from "@tanstack/react-query";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isAfter,
  isEqual,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { Order } from "../backend";
import { OrderStatus } from "../backend";
import { useActor } from "./useActor";

export type TimeRange = "7d" | "30d" | "12m";

export interface EarningsDataPoint {
  label: string;
  earnings: number;
}

export interface VendorAnalytics {
  totalEarnings: number;
  totalOrders: number;
  todayOrders: number;
  avgOrderValue: number;
  deliveredOrders: number;
  pendingOrders: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
}

export interface TrendIndicator {
  direction: "up" | "down" | "flat";
  percent: number;
}

export interface VendorAnalyticsResult {
  metrics: VendorAnalytics;
  chartData: EarningsDataPoint[];
  topProduct: { name: string; count: number } | null;
  peakHour: { label: string; count: number } | null;
  ordersTrend: TrendIndicator;
  earningsTrend: TrendIndicator;
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// Status helpers — robust against all Candid enum shapes
// ---------------------------------------------------------------------------

function statusString(status: Order["status"]): string {
  if (typeof status === "string") return status;
  if (typeof status === "object" && status !== null) {
    const keys = Object.keys(status as Record<string, unknown>);
    return keys[0] ?? "";
  }
  return String(status);
}

/**
 * isDeliveredStatus — handles all Candid enum shapes:
 *   (a) "delivered"           (b) "#delivered"
 *   (c) { delivered: null }   (d) { "#delivered": null }
 *   (e) "completed" synonyms  (f) OrderStatus enum value
 */
export function isDeliveredStatus(status: Order["status"]): boolean {
  if (status === OrderStatus.delivered) return true;
  const raw = statusString(status);
  if (
    raw === "delivered" ||
    raw === "#delivered" ||
    raw === "completed" ||
    raw === "#completed"
  ) {
    return true;
  }
  if (typeof status === "object" && status !== null) {
    for (const k of Object.keys(status as Record<string, unknown>)) {
      const n = k.replace(/^#/, "");
      if (n === "delivered" || n === "completed") return true;
    }
  }
  return false;
}

/**
 * isPendingStatus — covers #requested and #storeConfirmed
 */
export function isPendingStatus(status: Order["status"]): boolean {
  if (status === OrderStatus.requested || status === OrderStatus.storeConfirmed)
    return true;
  const raw = statusString(status);
  if (
    raw === "requested" ||
    raw === "#requested" ||
    raw === "storeConfirmed" ||
    raw === "#storeConfirmed"
  ) {
    return true;
  }
  if (typeof status === "object" && status !== null) {
    for (const k of Object.keys(status as Record<string, unknown>)) {
      const n = k.replace(/^#/, "");
      if (n === "requested" || n === "storeConfirmed") return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Amount helper
// ---------------------------------------------------------------------------

function getOrderTotal(order: Order): number {
  const raw = order.totalAmount;
  if (raw === null || raw === undefined) return 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

// ---------------------------------------------------------------------------
// Chart builder
// ---------------------------------------------------------------------------

function buildChartData(
  orders: Order[],
  range: TimeRange,
): EarningsDataPoint[] {
  const now = new Date();

  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    const start = startOfDay(subDays(now, days - 1));
    const interval = eachDayOfInterval({ start, end: startOfDay(now) });
    return interval.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const earnings = orders
        .filter((o) => {
          const d = new Date(Number(o.createdAt) / 1_000_000);
          return format(startOfDay(d), "yyyy-MM-dd") === dayStr;
        })
        .reduce((sum, o) => sum + getOrderTotal(o), 0);
      return {
        label: format(day, range === "7d" ? "EEE" : "dd MMM"),
        earnings,
      };
    });
  }

  const start = startOfMonth(subMonths(now, 11));
  const end = endOfMonth(now);
  const interval = eachMonthOfInterval({ start, end });
  return interval.map((month) => {
    const monthStr = format(month, "yyyy-MM");
    const earnings = orders
      .filter((o) => {
        const d = new Date(Number(o.createdAt) / 1_000_000);
        return format(startOfMonth(d), "yyyy-MM") === monthStr;
      })
      .reduce((sum, o) => sum + getOrderTotal(o), 0);
    return { label: format(month, "MMM"), earnings };
  });
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function computeMetrics(
  deliveredOrders: Order[],
  pendingOrdersList: Order[],
  allStoreOrders: Order[],
): VendorAnalytics {
  const now = new Date();
  const totalEarnings = deliveredOrders.reduce(
    (sum, o) => sum + getOrderTotal(o),
    0,
  );
  const deliveredCount = deliveredOrders.length;
  const todayStart = startOfDay(now);
  const todayOrders = deliveredOrders.filter((o) => {
    const d = new Date(Number(o.createdAt) / 1_000_000);
    return isAfter(d, todayStart) || isEqual(d, todayStart);
  }).length;
  const weekCutoff = subDays(now, 7);
  const weeklyEarnings = deliveredOrders
    .filter((o) => {
      const d = new Date(Number(o.createdAt) / 1_000_000);
      return isAfter(d, weekCutoff) || isEqual(d, weekCutoff);
    })
    .reduce((sum, o) => sum + getOrderTotal(o), 0);
  const monthCutoff = subDays(now, 30);
  const monthlyEarnings = deliveredOrders
    .filter((o) => {
      const d = new Date(Number(o.createdAt) / 1_000_000);
      return isAfter(d, monthCutoff) || isEqual(d, monthCutoff);
    })
    .reduce((sum, o) => sum + getOrderTotal(o), 0);
  const avgOrderValue = deliveredCount > 0 ? totalEarnings / deliveredCount : 0;
  return {
    totalEarnings,
    totalOrders: allStoreOrders.length,
    todayOrders,
    avgOrderValue,
    deliveredOrders: deliveredCount,
    pendingOrders: pendingOrdersList.length,
    weeklyEarnings,
    monthlyEarnings,
  };
}

function computeTrend(current: number, previous: number): TrendIndicator {
  if (previous === 0) {
    return current > 0
      ? { direction: "up", percent: 100 }
      : { direction: "flat", percent: 0 };
  }
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 1) return { direction: "flat", percent: 0 };
  return {
    direction: delta > 0 ? "up" : "down",
    percent: Math.abs(Math.round(delta)),
  };
}

function computeTrends(
  deliveredOrders: Order[],
  range: TimeRange,
): { ordersTrend: TrendIndicator; earningsTrend: TrendIndicator } {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 365;
  const currentStart = subDays(now, days);
  const previousStart = subDays(now, days * 2);
  const currentOrders = deliveredOrders.filter((o) => {
    const d = new Date(Number(o.createdAt) / 1_000_000);
    return isAfter(d, currentStart);
  });
  const previousOrders = deliveredOrders.filter((o) => {
    const d = new Date(Number(o.createdAt) / 1_000_000);
    return isAfter(d, previousStart) && !isAfter(d, currentStart);
  });
  const currentEarnings = currentOrders.reduce(
    (s, o) => s + getOrderTotal(o),
    0,
  );
  const previousEarnings = previousOrders.reduce(
    (s, o) => s + getOrderTotal(o),
    0,
  );
  return {
    ordersTrend: computeTrend(currentOrders.length, previousOrders.length),
    earningsTrend: computeTrend(currentEarnings, previousEarnings),
  };
}

function computeTopProduct(
  orders: Order[],
): { name: string; count: number } | null {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    // Use items array if available, otherwise fall back to itemName
    if (o.items && o.items.length > 0) {
      for (const item of o.items) {
        const name = item.name.trim();
        if (name)
          counts[name] = (counts[name] ?? 0) + Number(item.quantity ?? 1);
      }
    }
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return { name: entries[0][0], count: entries[0][1] };
}

function computePeakHour(
  orders: Order[],
): { label: string; count: number } | null {
  const buckets: Record<string, number> = {};
  for (const o of orders) {
    const d = new Date(Number(o.createdAt) / 1_000_000);
    const h = d.getHours();
    const bucketStart = Math.floor(h / 2) * 2;
    const bucketEnd = bucketStart + 2;
    const fmt = (hour: number) => {
      const suffix = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${h12} ${suffix}`;
    };
    const key = `${fmt(bucketStart)}–${fmt(bucketEnd)}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  const entries = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return { label: entries[0][0], count: entries[0][1] };
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export function useVendorAnalytics(
  storeId: string | null | undefined,
  range: TimeRange,
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<VendorAnalyticsResult>({
    queryKey: ["vendorAnalytics", storeId, range],
    queryFn: async (): Promise<VendorAnalyticsResult> => {
      const empty: VendorAnalyticsResult = {
        metrics: {
          totalEarnings: 0,
          totalOrders: 0,
          todayOrders: 0,
          avgOrderValue: 0,
          deliveredOrders: 0,
          pendingOrders: 0,
          weeklyEarnings: 0,
          monthlyEarnings: 0,
        },
        chartData: [],
        topProduct: null,
        peakHour: null,
        ordersTrend: { direction: "flat", percent: 0 },
        earningsTrend: { direction: "flat", percent: 0 },
        fetchedAt: Date.now(),
      };

      if (!actor || !storeId) return empty;

      const allOrders = await actor.getAllOrders();

      if (import.meta.env.DEV && allOrders.length > 0) {
        console.debug("[Analytics] sample order:", allOrders[0]);
      }

      const sid = storeId;
      const allStoreOrders = allOrders.filter((o) => o.storeId === sid);
      const deliveredOrders = allStoreOrders.filter((o) =>
        isDeliveredStatus(o.status),
      );
      const pendingOrders = allStoreOrders.filter((o) =>
        isPendingStatus(o.status),
      );

      const now = new Date();
      const cutoff =
        range === "7d"
          ? subDays(now, 7)
          : range === "30d"
            ? subDays(now, 30)
            : subMonths(now, 12);

      const rangeDeliveredOrders = deliveredOrders.filter((o) => {
        const d = new Date(Number(o.createdAt) / 1_000_000);
        return isAfter(d, cutoff) || isEqual(d, cutoff);
      });

      const { ordersTrend, earningsTrend } = computeTrends(
        deliveredOrders,
        range,
      );

      return {
        metrics: computeMetrics(deliveredOrders, pendingOrders, allStoreOrders),
        chartData: buildChartData(rangeDeliveredOrders, range),
        topProduct: computeTopProduct(allStoreOrders),
        peakHour: computePeakHour(allStoreOrders),
        ordersTrend,
        earningsTrend,
        fetchedAt: Date.now(),
      };
    },
    enabled: !!actor && !actorFetching && !!storeId,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
