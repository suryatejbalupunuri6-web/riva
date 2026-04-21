import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  BarChart2,
  Clock,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeRange } from "../hooks/useAnalytics";
import { useVendorAnalytics } from "../hooks/useAnalytics";

interface Props {
  storeId: bigint;
}

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 12 months", value: "12m" },
];

function MetricCard({
  icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            accent
              ? "bg-green-50 text-green-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold text-muted-foreground leading-tight">
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24 rounded-lg" />
      ) : (
        <p
          className={`text-2xl font-extrabold leading-none ${
            accent ? "text-green-600" : "text-foreground"
          }`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

interface TooltipPayload {
  value: number;
}

interface EarningsTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function EarningsTooltip({ active, payload, label }: EarningsTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs text-muted-foreground font-medium mb-0.5">
        {label}
      </p>
      <p className="text-sm font-extrabold text-green-600">
        ₹{payload[0].value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export default function VendorAnalyticsDashboard({ storeId }: Props) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading, isFetching, refetch } = useVendorAnalytics(
    storeId,
    range,
  );

  const metrics = data?.metrics;
  const chartData = data?.chartData ?? [];
  const topProduct = data?.topProduct;
  const peakHour = data?.peakHour;

  // Safe formatted values — never show NaN or blank
  const safeEarnings =
    metrics != null && Number.isFinite(metrics.totalEarnings)
      ? `₹${metrics.totalEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
      : "₹0";

  const safeOrders =
    metrics != null && Number.isFinite(metrics.totalOrders)
      ? metrics.totalOrders.toString()
      : "0";

  const safeTodayOrders =
    metrics != null && Number.isFinite(metrics.todayOrders)
      ? metrics.todayOrders.toString()
      : "0";

  const safeAvgOrder =
    metrics != null && Number.isFinite(metrics.avgOrderValue)
      ? `₹${metrics.avgOrderValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
      : "₹0";

  const hasAnyData = !isLoading && (metrics?.totalOrders ?? 0) > 0;
  const hasChartData = chartData.some((d) => d.earnings > 0);

  const today = format(new Date(), "d MMM yyyy");

  return (
    <div className="space-y-5" data-ocid="analytics.panel">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold text-foreground">Analytics</h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground font-medium">{today}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            data-ocid="analytics.refresh_button"
            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors duration-200"
            aria-label="Refresh analytics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Time range toggle */}
      <div
        className="flex gap-1.5 bg-muted rounded-xl p-1"
        data-ocid="analytics.range.toggle"
      >
        {TIME_RANGES.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            data-ocid={`analytics.range.${value}`}
            className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg transition-all duration-200 ${
              range === value
                ? "bg-card text-green-700 shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3" data-ocid="analytics.metrics">
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Total Earnings"
          value={safeEarnings}
          loading={isLoading}
          accent
        />
        <MetricCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Total Orders"
          value={safeOrders}
          loading={isLoading}
        />
        <MetricCard
          icon={<Package className="w-4 h-4" />}
          label="Today's Orders"
          value={safeTodayOrders}
          loading={isLoading}
        />
        <MetricCard
          icon={<BarChart2 className="w-4 h-4" />}
          label="Avg Order Value"
          value={safeAvgOrder}
          loading={isLoading}
          accent
        />
      </div>

      {/* Earnings chart */}
      <div
        className="bg-card rounded-2xl border border-border shadow-sm p-4"
        data-ocid="analytics.chart"
      >
        <p className="text-sm font-bold text-foreground mb-4">
          Earnings Over Time
        </p>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-4/6 rounded" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : !hasChartData ? (
          <div
            className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground"
            data-ocid="analytics.chart.empty_state"
          >
            <BarChart2 className="w-10 h-10 text-muted" />
            <p className="text-sm font-semibold">No earnings data yet</p>
            <p className="text-xs">
              Delivered orders will appear here automatically
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`
                }
              />
              <Tooltip content={<EarningsTooltip />} />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#16a34a"
                strokeWidth={2.5}
                dot={{ fill: "#16a34a", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#16a34a", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top Product */}
        <div
          className="bg-card rounded-2xl border border-border shadow-sm p-4 flex gap-3 items-start"
          data-ocid="analytics.top_product.card"
        >
          <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              🏆 Most Sold Item
            </p>
            {isLoading ? (
              <Skeleton className="h-4 w-28 rounded" />
            ) : topProduct ? (
              <>
                <p className="text-sm font-bold text-foreground truncate">
                  {topProduct.name}
                </p>
                <p className="text-xs text-green-600 font-semibold mt-0.5">
                  {topProduct.count} order{topProduct.count !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </div>
        </div>

        {/* Peak Time */}
        <div
          className="bg-card rounded-2xl border border-border shadow-sm p-4 flex gap-3 items-start"
          data-ocid="analytics.peak_time.card"
        >
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              ⏰ Peak Order Time
            </p>
            {isLoading ? (
              <Skeleton className="h-4 w-28 rounded" />
            ) : peakHour ? (
              <>
                <p className="text-sm font-bold text-foreground truncate">
                  Most orders at {peakHour.label}
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  {peakHour.count} order{peakHour.count !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Empty state when no delivered orders at all */}
      {!isLoading && !hasAnyData && (
        <div
          className="text-center py-6 text-muted-foreground text-sm"
          data-ocid="analytics.empty_state"
        >
          <TrendingUp className="w-10 h-10 mx-auto mb-2 text-muted" />
          <p className="font-semibold text-foreground">
            No delivered orders yet
          </p>
          <p className="text-xs mt-1">
            Analytics will update once customers receive their orders
          </p>
        </div>
      )}
    </div>
  );
}
