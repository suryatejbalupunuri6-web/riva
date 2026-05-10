import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart2,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TimeRange, TrendIndicator } from "../hooks/useAnalytics";
import { useVendorAnalytics } from "../hooks/useAnalytics";

interface Props {
  storeId: string;
}

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "12 Months", value: "12m" },
];

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  accentColor?: "green" | "yellow" | "blue" | "orange" | "default";
  sub?: string;
  trend?: TrendIndicator;
}

function MetricCard({
  icon,
  label,
  value,
  loading,
  accentColor = "default",
  sub,
  trend,
}: MetricCardProps) {
  const iconBg =
    accentColor === "green"
      ? "bg-green-50 text-green-600"
      : accentColor === "yellow"
        ? "bg-amber-50 text-amber-600"
        : accentColor === "blue"
          ? "bg-blue-50 text-blue-600"
          : accentColor === "orange"
            ? "bg-orange-50 text-orange-500"
            : "bg-muted text-muted-foreground";

  const valueColor =
    accentColor === "green"
      ? "#16a34a"
      : accentColor === "yellow"
        ? "#d97706"
        : accentColor === "blue"
          ? "#2563eb"
          : accentColor === "orange"
            ? "#f97316"
            : undefined;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
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
          className="text-2xl font-extrabold leading-none"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </p>
      )}
      {!loading && (sub || trend) && (
        <div className="flex items-center gap-2 flex-wrap">
          {sub && (
            <span className="text-xs text-muted-foreground font-medium">
              {sub}
            </span>
          )}
          {trend && trend.direction !== "flat" && <TrendBadge trend={trend} />}
        </div>
      )}
    </div>
  );
}

function TrendBadge({ trend }: { trend: TrendIndicator }) {
  if (trend.direction === "flat") return null;
  const isUp = trend.direction === "up";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
        isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
      }`}
    >
      {isUp ? (
        <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowDown className="w-3 h-3" />
      )}
      {trend.percent}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// SVG Bar Chart (no library dependency)
// ---------------------------------------------------------------------------

interface BarChartProps {
  data: { label: string; earnings: number }[];
}

function SVGBarChart({ data }: BarChartProps) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.earnings), 1);
  const BAR_W = Math.max(8, Math.floor(220 / data.length) - 4);
  const CHART_H = 120;
  const LABEL_H = 20;
  const totalW = data.length * (BAR_W + 4);

  return (
    <div className="overflow-x-auto">
      <svg
        width={Math.max(totalW + 8, 280)}
        height={CHART_H + LABEL_H + 4}
        role="img"
        aria-label="Earnings bar chart"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            y1={CHART_H * (1 - ratio)}
            x2={Math.max(totalW + 8, 280)}
            y2={CHART_H * (1 - ratio)}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const barH = Math.max(2, (d.earnings / maxVal) * (CHART_H - 4));
          const x = i * (BAR_W + 4) + 4;
          const y = CHART_H - barH;
          const showLabel =
            data.length <= 12 || i % Math.ceil(data.length / 7) === 0;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={3}
                fill="#16a34a"
                opacity={d.earnings > 0 ? 1 : 0.2}
              />
              {showLabel && (
                <text
                  x={x + BAR_W / 2}
                  y={CHART_H + LABEL_H}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9ca3af"
                  fontFamily="system-ui, sans-serif"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Last Updated timer
// ---------------------------------------------------------------------------

function useSecondsTick(fetchedAt: number | null | undefined) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!fetchedAt) return;
    setSeconds(Math.floor((Date.now() - fetchedAt) / 1000));
    ref.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - fetchedAt) / 1000));
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [fetchedAt]);
  return seconds;
}

// ---------------------------------------------------------------------------
// TrendRow helper
// ---------------------------------------------------------------------------

function TrendRow({
  label,
  current,
  trend,
  prefix = "",
}: {
  label: string;
  current: number;
  trend: TrendIndicator;
  prefix?: string;
}) {
  const isUp = trend.direction === "up";
  const isDown = trend.direction === "down";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground">
          {prefix}
          {current.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </span>
        {trend.direction !== "flat" ? (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-bold ${
              isUp
                ? "text-green-600"
                : isDown
                  ? "text-red-500"
                  : "text-muted-foreground"
            }`}
          >
            {isUp ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {trend.percent}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-0.5">
            <ArrowRight className="w-3 h-3" />
            flat
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function VendorAnalyticsDashboard({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading, isFetching } = useVendorAnalytics(storeId, range);

  const metrics = data?.metrics;
  const chartData = data?.chartData ?? [];
  const topProduct = data?.topProduct;
  const peakHour = data?.peakHour;
  const ordersTrend = data?.ordersTrend ?? {
    direction: "flat" as const,
    percent: 0,
  };
  const earningsTrend = data?.earningsTrend ?? {
    direction: "flat" as const,
    percent: 0,
  };
  const fetchedAt = data?.fetchedAt ?? null;
  const secondsAgo = useSecondsTick(fetchedAt);

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ["vendorAnalytics", storeId],
    });
  };

  const fmt = (n: number | undefined | null) =>
    Number.isFinite(n) ? (n ?? 0) : 0;

  const safeEarnings = `₹${fmt(metrics?.totalEarnings).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const safeWeekly = `₹${fmt(metrics?.weeklyEarnings).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const safeMonthly = `₹${fmt(metrics?.monthlyEarnings).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const safeOrders = fmt(metrics?.totalOrders).toString();
  const safeDelivered = fmt(metrics?.deliveredOrders).toString();
  const safePending = fmt(metrics?.pendingOrders).toString();
  const safeTodayOrders = fmt(metrics?.todayOrders).toString();
  const safeAvgOrder = `₹${fmt(metrics?.avgOrderValue).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const hasAnyData = !isLoading && fmt(metrics?.totalOrders) > 0;
  const hasChartData = chartData.some((d) => d.earnings > 0);
  const today = format(new Date(), "d MMM yyyy");

  const lastUpdatedText =
    fetchedAt == null
      ? null
      : secondsAgo < 5
        ? "Just updated"
        : secondsAgo < 60
          ? `Updated ${secondsAgo}s ago`
          : `Updated ${Math.floor(secondsAgo / 60)}m ago`;

  const rangePeriodLabel =
    range === "7d"
      ? "vs last week"
      : range === "30d"
        ? "vs last month"
        : "vs last year";

  return (
    <div className="space-y-5" data-ocid="analytics.panel">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold text-foreground">Analytics</h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground font-medium">{today}</p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            data-ocid="analytics.refresh_button"
            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors"
            aria-label="Refresh analytics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {lastUpdatedText && (
        <p className="text-xs text-muted-foreground font-medium -mt-2">
          {lastUpdatedText}
        </p>
      )}

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
            className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg transition-all ${
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
          accentColor="green"
          trend={earningsTrend}
          sub={rangePeriodLabel}
        />
        <MetricCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Total Orders"
          value={safeOrders}
          loading={isLoading}
          trend={ordersTrend}
          sub={rangePeriodLabel}
        />
        <MetricCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Delivered"
          value={safeDelivered}
          loading={isLoading}
          accentColor="green"
        />
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="Pending"
          value={safePending}
          loading={isLoading}
          accentColor="yellow"
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
          accentColor="green"
        />
      </div>

      {/* Weekly / Monthly strip */}
      <div
        className="grid grid-cols-2 gap-3"
        data-ocid="analytics.earnings_strip"
      >
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex gap-2 items-center">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-semibold">
              Weekly
            </p>
            {isLoading ? (
              <Skeleton className="h-5 w-16 rounded mt-0.5" />
            ) : (
              <p className="text-base font-extrabold text-blue-600 leading-none mt-0.5">
                {safeWeekly}
              </p>
            )}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex gap-2 items-center">
          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-semibold">
              Monthly
            </p>
            {isLoading ? (
              <Skeleton className="h-5 w-16 rounded mt-0.5" />
            ) : (
              <p className="text-base font-extrabold text-purple-600 leading-none mt-0.5">
                {safeMonthly}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Earnings chart */}
      <div
        className="bg-card rounded-2xl border border-border shadow-sm p-4"
        data-ocid="analytics.chart"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-foreground">
            Earnings Over Time
          </p>
          {earningsTrend.direction !== "flat" && (
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              {earningsTrend.direction === "up" ? (
                <ArrowUp className="w-3 h-3 text-green-600" />
              ) : (
                <ArrowDown className="w-3 h-3 text-red-500" />
              )}
              <span
                className={
                  earningsTrend.direction === "up"
                    ? "text-green-600"
                    : "text-red-500"
                }
              >
                {earningsTrend.percent}% {rangePeriodLabel}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
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
          <SVGBarChart data={chartData} />
        )}
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="bg-card rounded-2xl border border-border shadow-sm p-4 flex gap-3 items-start"
          data-ocid="analytics.top_product.card"
        >
          <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              🏆 Top Product
            </p>
            {isLoading ? (
              <Skeleton className="h-4 w-28 rounded" />
            ) : topProduct ? (
              <>
                <p className="text-sm font-bold text-foreground truncate">
                  {topProduct.name}
                </p>
                <p
                  className="text-xs font-semibold mt-0.5"
                  style={{ color: "#16a34a" }}
                >
                  {topProduct.count} order{topProduct.count !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </div>
        </div>

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

      {/* Trends strip */}
      {hasAnyData && (
        <div
          className="bg-card rounded-2xl border border-border shadow-sm p-4"
          data-ocid="analytics.trends.card"
        >
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">
            Trends — {rangePeriodLabel}
          </p>
          <div className="flex flex-col gap-2.5">
            <TrendRow
              label="Orders"
              current={fmt(metrics?.deliveredOrders)}
              trend={ordersTrend}
            />
            <TrendRow
              label="Earnings"
              current={fmt(metrics?.totalEarnings)}
              trend={earningsTrend}
              prefix="₹"
            />
          </div>
        </div>
      )}

      {!isLoading && !hasAnyData && (
        <div
          className="text-center py-6 text-muted-foreground text-sm"
          data-ocid="analytics.empty_state"
        >
          <TrendingUp className="w-10 h-10 mx-auto mb-2 text-muted" />
          <p className="font-semibold text-foreground">No orders yet</p>
          <p className="text-xs mt-1">
            Analytics will update once customers place orders
          </p>
        </div>
      )}
    </div>
  );
}
