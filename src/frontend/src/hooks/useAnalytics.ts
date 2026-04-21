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
}

export interface VendorAnalyticsResult {
  metrics: VendorAnalytics;
  chartData: EarningsDataPoint[];
  topProduct: { name: string; count: number } | null;
  peakHour: { label: string; count: number } | null;
}

/**
 * Returns orders for the given store that are in a final/delivered state.
 * Backend enum: requested | storeConfirmed | riderAssigned | pickedUp | delivered
 * Only "delivered" counts as a completed order for earnings/totals.
 */
function filterDeliveredStoreOrders(orders: Order[], storeId: bigint): Order[] {
  return orders.filter(
    (o) => o.storeId === storeId && o.status === OrderStatus.delivered,
  );
}

/**
 * Returns all orders for a store regardless of status (for peak/top-product insights).
 */
function filterAllStoreOrders(orders: Order[], storeId: bigint): Order[] {
  return orders.filter((o) => o.storeId === storeId);
}

function getOrderTotal(order: Order): number {
  // totalAmount is optional float64 — always return a safe number, never NaN/undefined
  const raw = (order as Order & { totalAmount?: number | bigint | null })
    .totalAmount;
  if (raw === null || raw === undefined) return 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

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

  // 12 months
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
    return {
      label: format(month, "MMM"),
      earnings,
    };
  });
}

/**
 * Compute core metrics from delivered-only orders.
 * Today's orders also only count delivered orders placed today.
 */
function computeMetrics(deliveredOrders: Order[]): VendorAnalytics {
  const totalEarnings = deliveredOrders.reduce(
    (sum, o) => sum + getOrderTotal(o),
    0,
  );
  const totalOrders = deliveredOrders.length;
  const todayStart = startOfDay(new Date());
  const todayOrders = deliveredOrders.filter((o) => {
    const d = new Date(Number(o.createdAt) / 1_000_000);
    return isAfter(d, todayStart) || isEqual(d, todayStart);
  }).length;
  const avgOrderValue = totalOrders > 0 ? totalEarnings / totalOrders : 0;
  return { totalEarnings, totalOrders, todayOrders, avgOrderValue };
}

function computeTopProduct(
  orders: Order[],
): { name: string; count: number } | null {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    const items = o.itemName.split(",").map((s) => s.trim());
    for (const item of items) {
      // Strip quantity suffix like "x2"
      const name = item.replace(/\s+x\d+$/, "").trim();
      if (name) counts[name] = (counts[name] ?? 0) + 1;
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
    // 2-hour buckets
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

export function useVendorAnalytics(
  storeId: bigint | null | undefined,
  range: TimeRange,
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<VendorAnalyticsResult>({
    queryKey: ["vendorAnalytics", storeId?.toString(), range],
    queryFn: async (): Promise<VendorAnalyticsResult> => {
      if (!actor || !storeId) {
        return {
          metrics: {
            totalEarnings: 0,
            totalOrders: 0,
            todayOrders: 0,
            avgOrderValue: 0,
          },
          chartData: [],
          topProduct: null,
          peakHour: null,
        };
      }

      const allOrders = await actor.getAllOrders();

      // Only delivered orders count toward earnings/totals/today
      const deliveredOrders = filterDeliveredStoreOrders(allOrders, storeId);
      // All store orders (any status) used for insights like top product / peak hour
      const allStoreOrders = filterAllStoreOrders(allOrders, storeId);

      // Chart uses delivered orders filtered to the selected range
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

      return {
        metrics: computeMetrics(deliveredOrders),
        chartData: buildChartData(rangeDeliveredOrders, range),
        topProduct: computeTopProduct(allStoreOrders),
        peakHour: computePeakHour(allStoreOrders),
      };
    },
    enabled: !!actor && !actorFetching && !!storeId,
    // Reduced from 5min staleTime so data is fresh; poll every 15s
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
