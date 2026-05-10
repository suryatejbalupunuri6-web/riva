import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  PackageSearch,
  Plus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Order, OrderStatus } from "../backend";
import ConfirmModal from "../components/ConfirmModal";
import LocationModal from "../components/LocationModal";
import OutOfRangeModal from "../components/OutOfRangeModal";
import PriceDisplay from "../components/PriceDisplay";
import { useApp } from "../context/AppContext";
import { useCart } from "../context/CartContext";
import { useNotifications } from "../context/NotificationContext";
import { useLocation } from "../hooks/useLocation";
import { formatCountdown, useOrderCountdown } from "../hooks/useOrderCountdown";
import { useAllProducts, useAllStores, useMyOrders } from "../hooks/useQueries";

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All", icon: "🏠" },
  { label: "Stationery", icon: "📚" },
  { label: "Grocery", icon: "🛒" },
  { label: "Fruits", icon: "🍎" },
  { label: "Fashion", icon: "👗" },
  { label: "Toys", icon: "🧸" },
] as const;

// ── Status config ──────────────────────────────────────────────────────────
const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  [OrderStatus.requested]: {
    label: "Requested",
    color: "bg-warning/15 text-warning-foreground border-warning/30",
    icon: Clock,
  },
  [OrderStatus.storeConfirmed]: {
    label: "Store Confirmed",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: CheckCircle2,
  },
  [OrderStatus.riderAssigned]: {
    label: "Rider Assigned",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    icon: Truck,
  },
  [OrderStatus.pickedUp]: {
    label: "Out for Delivery 🛵",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: ShoppingBag,
  },
  [OrderStatus.delivered]: {
    label: "Delivered",
    color: "bg-primary/10 text-primary border-primary/30",
    icon: CheckCircle2,
  },
  [OrderStatus.expired]: {
    label: "Expired",
    color: "bg-red-100 text-red-800 border-red-300",
    icon: AlertCircle,
  },
};

// ── Order Card ─────────────────────────────────────────────────────────────
function PendingCountdownBadge({ orderId }: { orderId: string }) {
  const { secondsLeft, isExpired } = useOrderCountdown(orderId);
  if (isExpired) return null;
  const colorClass =
    secondsLeft > 120
      ? "text-green-700"
      : secondsLeft > 60
        ? "text-yellow-600"
        : "text-red-600";
  return (
    <span className={`font-mono tabular-nums text-xs font-bold ${colorClass}`}>
      {formatCountdown(secondsLeft)} remaining
    </span>
  );
}

function OrderCard({
  order,
  idx,
  isExpiredLocal,
  onTrack,
  onReorder,
}: {
  order: Order;
  idx: number;
  isExpiredLocal?: boolean;
  onTrack?: () => void;
  onReorder?: () => void;
}) {
  const cfg = statusConfig[order.status as OrderStatus];
  const Icon = cfg?.icon ?? Clock;
  const canTrack =
    order.status === OrderStatus.pickedUp ||
    order.status === OrderStatus.riderAssigned;

  const itemLabel =
    order.items && order.items.length > 0
      ? order.items.map((i) => i.name).join(", ")
      : "Order";

  // Backend-confirmed expiry or client-side local expiry
  const isExpiredStatus = order.status === OrderStatus.expired;
  const showExpired = isExpiredStatus || isExpiredLocal;

  // Pending vendor acceptance state
  const isPending = order.status === OrderStatus.requested && !isExpiredLocal;

  if (showExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: 0.05 * idx }}
        className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm"
        data-ocid={`orders.item.${idx + 1}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground/70 truncate line-through">
              {itemLabel}
            </p>
            <p className="text-xs text-red-600 font-semibold mt-1">
              No vendor accepted your order. Please try again.
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs flex-shrink-0 gap-1 font-semibold bg-red-100 text-red-700 border-red-300"
          >
            <AlertCircle className="w-3 h-3" />
            Expired
          </Badge>
        </div>
        {onReorder && (
          <Button
            size="sm"
            onClick={onReorder}
            className="w-full mt-3 text-white gap-1.5 text-xs font-bold"
            style={{ backgroundColor: "#16a34a" }}
            data-ocid={`orders.reorder.button.${idx + 1}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reorder
          </Button>
        )}
      </motion.div>
    );
  }

  if (isPending) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 * idx }}
        className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm"
        data-ocid={`orders.item.${idx + 1}`}
      >
        <div className="flex items-start gap-3">
          <div className="relative w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">
              {itemLabel}
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-0.5">
              Waiting for a vendor to accept your order...
            </p>
            <div className="mt-1">
              <PendingCountdownBadge orderId={order.id} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (onTrack ? onTrack() : undefined)}
          className="w-full mt-3 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-200 transition-colors"
          data-ocid={`orders.track.button.${idx + 1}`}
        >
          <Clock className="w-3.5 h-3.5" />
          View Status
        </button>
      </motion.div>
    );
  }

  // storeConfirmed state
  if (order.status === OrderStatus.storeConfirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 * idx }}
        className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm"
        data-ocid={`orders.item.${idx + 1}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">
              {itemLabel}
            </p>
            <p className="text-xs text-blue-700 font-semibold mt-0.5">
              ✅ Vendor accepted! Preparing your order...
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs flex-shrink-0 gap-1 font-semibold bg-blue-100 text-blue-700 border-blue-300"
          >
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </Badge>
        </div>
        {onTrack && (
          <Button
            size="sm"
            onClick={onTrack}
            className="w-full mt-3 text-white gap-1.5 text-xs font-bold"
            style={{ backgroundColor: "#2563eb" }}
            data-ocid={`orders.track.button.${idx + 1}`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Track Order
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * idx }}
      className="p-4 bg-card border border-border rounded-xl shadow-card"
      data-ocid={`orders.item.${idx + 1}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <ShoppingBag className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {itemLabel}
          </p>
          <Badge
            variant="outline"
            className={`mt-1.5 text-xs gap-1 font-semibold ${
              cfg ? cfg.color : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <Icon className="w-3 h-3" />
            {cfg ? cfg.label : order.status}
          </Badge>
        </div>
      </div>
      {canTrack && onTrack && (
        <Button
          size="sm"
          onClick={onTrack}
          className="w-full mt-3 text-white gap-1.5 text-xs font-bold"
          style={{ backgroundColor: "#f97316" }}
          data-ocid={`orders.track.button.${idx + 1}`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Track Order 📍
        </Button>
      )}
    </motion.div>
  );
}

// ── Order Again Card ───────────────────────────────────────────────────────
interface OrderAgainItem {
  name: string;
  price: number;
  image: string;
  productId: string;
  storeId: string;
  sellingPrice?: number;
  originalPrice?: number;
}

function OrderAgainCard({
  item,
  idx,
  onAdd,
}: {
  item: OrderAgainItem;
  idx: number;
  onAdd: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * idx }}
      className="flex-shrink-0 w-36 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col"
      data-ocid={`order_again.item.${idx + 1}`}
    >
      <img
        src={item.image}
        alt={item.name}
        className="w-full h-24 object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            `https://picsum.photos/seed/${item.productId}/144/96`;
        }}
      />
      <div className="p-2 flex flex-col flex-1">
        <p className="font-bold text-xs text-foreground leading-tight line-clamp-2 flex-1">
          {item.name}
        </p>
        <div className="mt-1">
          <PriceDisplay
            sellingPrice={item.sellingPrice ?? item.price}
            originalPrice={item.originalPrice}
            size="sm"
          />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="mt-1.5 w-full h-7 text-xs font-bold rounded-lg text-white flex items-center justify-center gap-1 transition-colors shadow"
          style={{ backgroundColor: "#16a34a" }}
          data-ocid={`order_again.add_button.${idx + 1}`}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { totalItems, addItem, currentStoreId: cartStoreId } = useCart();
  const customerId = currentUser?.id?.toString();
  const { data: orders = [], isLoading: ordersLoading } =
    useMyOrders(customerId);
  const { data: stores = [], isLoading: storesLoading } = useAllStores();
  const { data: allProducts = [], isLoading: productsLoading } =
    useAllProducts();
  const { status, inZone, requestLocation } = useLocation();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(
    () =>
      localStorage.getItem("riva_push_dismissed") === "1" ||
      (typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission !== "default"),
  );
  const [showOutOfRange, setShowOutOfRange] = useState(false);
  const [confirmModal] = useState<{
    open: boolean;
    message: string;
    action: (() => void) | null;
  }>({ open: false, message: "", action: null });
  const [activeCategory, setActiveCategory] = useState<string>("All");

  void inZone;

  // ── Store map ──────────────────────────────────────────────────────────
  const storeMap = useMemo(() => {
    const m = new Map<string, { name: string; isOpen: boolean }>();
    for (const s of stores) {
      m.set(s.id, { name: s.name, isOpen: s.isOpen });
    }
    return m;
  }, [stores]);

  // ── Product map by name (for Order Again matching) ─────────────────────
  const productByName = useMemo(() => {
    const m = new Map<string, (typeof allProducts)[number]>();
    for (const p of allProducts) {
      m.set(p.name.toLowerCase().trim(), p);
    }
    return m;
  }, [allProducts]);

  // ── Filtered products ──────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") return allProducts;
    return allProducts.filter(
      (p) => p.category?.toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [allProducts, activeCategory]);

  // ── Order Again items ──────────────────────────────────────────────────
  const orderAgainItems = useMemo((): OrderAgainItem[] => {
    if (orders.length === 0) return [];
    const seen = new Set<string>();
    const result: OrderAgainItem[] = [];
    const recent = [...orders]
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 10);
    for (const order of recent) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const key = item.name.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          const product = productByName.get(key);
          result.push({
            name: item.name,
            price: item.price,
            sellingPrice: product?.sellingPrice ?? item.price,
            originalPrice: product?.originalPrice,
            image:
              product?.imageUrl && product.imageUrl.trim() !== ""
                ? product.imageUrl
                : item.imageUrl && item.imageUrl.trim() !== ""
                  ? item.imageUrl
                  : `https://picsum.photos/seed/${item.productId}/144/96`,
            productId: item.productId,
            storeId: order.storeId,
          });
          if (result.length >= 10) break;
        }
      }
      if (result.length >= 10) break;
    }
    return result;
  }, [orders, productByName]);

  // ── Order Expiry Logic ─────────────────────────────────────────────────
  const [expiredOrderIds, setExpiredOrderIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("riva_expired_orders");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [expiredNotification, setExpiredNotification] = useState<{
    orderId: string;
    itemLabel: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setExpiredOrderIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const order of orders) {
          const idStr = order.id;
          if (
            order.status === "requested" &&
            !next.has(idStr) &&
            (() => {
              try {
                const ts: Record<string, number> = JSON.parse(
                  localStorage.getItem("riva_order_timestamps") || "{}",
                );
                const createdAt = ts[idStr];
                return createdAt
                  ? Date.now() - createdAt > 5 * 60 * 1000
                  : false;
              } catch {
                return false;
              }
            })()
          ) {
            next.add(idStr);
            changed = true;
            const label = order.items?.[0]?.name ?? "Order";
            setExpiredNotification({ orderId: idStr, itemLabel: label });
            addNotification({
              title: "Riva: Order Expired ⏳",
              message: "No vendor accepted your order. Tap to reorder.",
              type: "order",
            });
          }
        }
        if (changed) {
          localStorage.setItem(
            "riva_expired_orders",
            JSON.stringify([...next]),
          );
          return next;
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [orders, addNotification]);

  useEffect(() => {
    if (status === "out_of_range") setShowOutOfRange(true);
  }, [status]);

  // ── Status change notifications ────────────────────────────────────────
  const prevStatuses = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    for (const order of orders) {
      const id = order.id;
      const prev = prevStatuses.current.get(id);
      const curr = order.status as string;
      const label = order.items?.[0]?.name ?? "Order";
      if (prev && prev !== curr) {
        if (curr === OrderStatus.storeConfirmed) {
          addNotification({
            title: "Riva: Order Accepted ✅",
            message: `A vendor accepted your order for ${label}!`,
            type: "order",
          });
        } else if (curr === OrderStatus.riderAssigned) {
          addNotification({
            title: "Riva: Out for Delivery 🚴",
            message: `Your ${label} is on the way!`,
            type: "order",
          });
        } else if (curr === OrderStatus.delivered) {
          addNotification({
            title: "Riva: Delivered! 🎉",
            message: `Your ${label} has been delivered. Enjoy!`,
            type: "order",
          });
        }
      }
      prevStatuses.current.set(id, curr);
    }
  }, [orders, addNotification]);

  // ── Time-based offer notifications ────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once on mount only
  useEffect(() => {
    const hour = new Date().getHours();
    let slot: string | null = null;
    if (hour >= 6 && hour < 11) slot = "morning";
    else if (hour >= 11 && hour < 15) slot = "lunch";
    else if (hour >= 18 && hour < 22) slot = "evening";
    if (!slot) return;
    const today = new Date().toDateString();
    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem("riva_last_offer_slot") || "{}");
      } catch {
        return {};
      }
    })();
    if (stored.date === today && stored.slot === slot) return;
    const offerMap: Record<string, { title: string; message: string }> = {
      morning: {
        title: "Riva: Good morning! ☀️",
        message: "Only for you 🎯 — Fresh breakfast deals just dropped",
      },
      lunch: {
        title: "Riva: Lunchtime deals 🍱",
        message: "People near you are ordering lunch right now",
      },
      evening: {
        title: "Riva: Evening snacks 🌙",
        message: "Last chance ⏳ — Today's best deals end at midnight",
      },
    };
    addNotification({
      title: offerMap[slot].title,
      message: offerMap[slot].message,
      type: "offer",
    });
    localStorage.setItem(
      "riva_last_offer_slot",
      JSON.stringify({ date: today, slot }),
    );
  }, []);

  const queryClient = useQueryClient();

  // ── Fast polling for #requested orders (3-second refetch) ────────────────
  const hasPendingOrders = orders.some(
    (o) => o.status === OrderStatus.requested && !expiredOrderIds.has(o.id),
  );
  useEffect(() => {
    if (!hasPendingOrders) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["myOrders", customerId] });
    }, 3_000);
    return () => clearInterval(interval);
  }, [hasPendingOrders, queryClient, customerId]);

  // Backend #expired OR client-side timeout treated uniformly as expired
  const isOrderExpired = (o: Order) =>
    o.status === OrderStatus.expired ||
    (o.status === OrderStatus.requested && expiredOrderIds.has(o.id));

  const activeOrders = orders.filter(
    (o) => o.status !== OrderStatus.delivered && !isOrderExpired(o),
  );
  const expiredOrders = orders.filter(isOrderExpired);
  const completedOrders = orders.filter(
    (o) => o.status === OrderStatus.delivered,
  );

  const renderLocationBanner = () => {
    if (status === "in_range") {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5"
          data-ocid="dashboard.location_indicator"
        >
          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm font-bold text-green-700">
            ✅ Inside Delivery Zone — Delivery available!
          </span>
        </motion.div>
      );
    }
    if (status === "out_of_range") {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
          data-ocid="dashboard.location_indicator"
        >
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm font-bold text-red-700">
            ❌ Outside Delivery Zone — Delivery not available in your area
          </span>
        </motion.div>
      );
    }
    if (status === "denied") {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
          data-ocid="dashboard.location_indicator"
        >
          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm font-bold text-red-700">
            Location access denied — allow location to place orders
          </p>
        </motion.div>
      );
    }
    if (status === "requesting") {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-4 py-2.5"
          data-ocid="dashboard.location_indicator"
        >
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground font-semibold">
            Checking your location...
          </span>
        </motion.div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3"
        data-ocid="dashboard.location_indicator"
      >
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">Enable Location</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enable to check delivery availability
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={requestLocation}
          data-ocid="dashboard.enable_location_button"
          className="ml-3 flex-shrink-0 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-colors"
          style={{ backgroundColor: "#16a34a" }}
        >
          Enable
        </button>
      </motion.div>
    );
  };

  const displayName = currentUser?.name || currentUser?.phone || "Customer";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <LocationModal
        open={showLocationModal}
        onAllow={() => {
          setShowLocationModal(false);
          requestLocation();
        }}
        onCancel={() => setShowLocationModal(false)}
      />
      <OutOfRangeModal
        open={showOutOfRange}
        onClose={() => setShowOutOfRange(false)}
      />
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      {/* Push Notification Banner */}
      {!pushDismissed &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default" && (
          <div
            className="mb-4 flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3"
            data-ocid="notifications.push_prompt.card"
          >
            <div className="flex items-center gap-2 flex-1">
              <Bell className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-800 font-medium">
                Enable notifications to get order updates instantly.
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              data-ocid="notifications.push_enable.button"
              onClick={() => {
                Notification.requestPermission().then(() => {
                  setPushDismissed(true);
                  localStorage.setItem("riva_push_dismissed", "1");
                });
              }}
            >
              Enable
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 text-lg leading-none"
              data-ocid="notifications.push_dismiss.button"
              onClick={() => {
                setPushDismissed(true);
                localStorage.setItem("riva_push_dismissed", "1");
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

      {/* Expired Order Banner */}
      <AnimatePresence>
        {expiredNotification && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 z-50"
            style={{
              maxWidth: "32rem",
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 2rem)",
            }}
          >
            <div className="bg-red-600 text-white rounded-2xl shadow-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Order Expired</p>
                  <p className="text-xs text-red-100 mt-0.5">
                    No vendor accepted your order. Please try again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpiredNotification(null)}
                  className="text-red-200 hover:text-white text-lg leading-none flex-shrink-0"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => {
                    navigate({ to: "/customer/stores" });
                    setExpiredNotification(null);
                  }}
                  className="bg-white text-red-600 hover:bg-red-50 font-bold text-xs flex-1 gap-1"
                  data-ocid="expired.reorder.button"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reorder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpiredNotification(null)}
                  className="text-red-100 hover:text-white hover:bg-red-700 text-xs"
                  data-ocid="expired.dismiss.button"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "rgba(22,163,74,0.1)",
                border: "2px solid rgba(22,163,74,0.3)",
              }}
            >
              <User className="w-5 h-5" style={{ color: "#16a34a" }} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground leading-tight">
                Hello, {displayName} 👋
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                What do you need today?
              </p>
            </div>
          </div>
          {totalItems > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => navigate({ to: "/customer/cart" })}
              className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-full shadow transition-colors"
              style={{ backgroundColor: "#16a34a" }}
              data-ocid="dashboard.cart.button"
            >
              <ShoppingCart className="w-4 h-4" />
              Cart ({totalItems})
            </motion.button>
          )}
        </div>
      </div>

      {/* Global Search Bar */}
      <button
        type="button"
        onClick={() => navigate({ to: "/customer/search" })}
        className="w-full mb-4 h-11 rounded-xl border border-border bg-card shadow-sm flex items-center gap-2 px-4 text-muted-foreground text-sm hover:border-primary/30 hover:shadow-md transition-all"
        data-ocid="dashboard.search_input"
        aria-label="Search products and stores"
      >
        <PackageSearch className="w-4 h-4 flex-shrink-0" />
        <span>Search products &amp; stores...</span>
      </button>

      {/* Location Banner */}
      {renderLocationBanner()}

      {/* ── Category Strip ── */}
      <section className="mb-6" data-ocid="categories.section">
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat, idx) => {
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(cat.label)}
                data-ocid={`categories.item.${idx + 1}`}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border transition-all touch-manipulation"
                style={{
                  borderColor: isActive ? "#16a34a" : "#e5e7eb",
                  backgroundColor: isActive
                    ? "rgba(22,163,74,0.08)"
                    : "#ffffff",
                  minWidth: "60px",
                  boxShadow: isActive
                    ? "0 0 0 1.5px #16a34a"
                    : "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: "22px", lineHeight: 1 }}>
                  {cat.icon}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: isActive ? "#16a34a" : "#374151",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Order Again ── */}
      <section className="mb-8" data-ocid="order_again.section">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground">
            🔁 Order Again
          </h2>
        </div>

        {ordersLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {["oa1", "oa2", "oa3"].map((k) => (
              <div
                key={k}
                className="flex-shrink-0 w-36 h-44 bg-muted animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : orderAgainItems.length === 0 ? (
          <div
            className="bg-muted/40 border border-dashed border-border rounded-xl px-4 py-6 text-center"
            data-ocid="order_again.empty_state"
          >
            <ShoppingBag className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">
              No previous orders yet — start ordering!
            </p>
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4"
            style={{ scrollbarWidth: "none" }}
            data-ocid="order_again.list"
          >
            {orderAgainItems.map((item, idx) => {
              const product = allProducts.find(
                (p) =>
                  p.name.toLowerCase().trim() ===
                  item.name.toLowerCase().trim(),
              );
              return (
                <OrderAgainCard
                  key={`${item.name}-${idx}`}
                  item={item}
                  idx={idx}
                  onAdd={() => {
                    const sid = item.storeId;
                    if (cartStoreId && cartStoreId !== sid) {
                      toast.error("Clear cart to reorder from this store");
                      return;
                    }
                    if (product) {
                      addItem(
                        {
                          id: product.id,
                          name: product.name,
                          price: product.sellingPrice ?? product.price,
                        },
                        product.storeId,
                      );
                    } else {
                      addItem(
                        {
                          id: item.productId,
                          name: item.name,
                          price: item.sellingPrice ?? item.price,
                        },
                        item.storeId,
                      );
                    }
                    toast.success(`${item.name} added to cart!`);
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Popular Products Near You ── */}
      <section className="mb-8" data-ocid="products.section">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">
              🛍️ Popular Products Near You
            </h2>
            {activeCategory !== "All" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing: {activeCategory}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/customer/stores" })}
            className="text-xs font-bold text-primary hover:text-primary/80"
            data-ocid="products.view_all.button"
          >
            See all
          </button>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {["pk1", "pk2", "pk3", "pk4"].map((k) => (
              <div
                key={k}
                className="bg-muted animate-pulse rounded-2xl h-48"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card
            className="border-dashed border-2 border-border"
            data-ocid="products.empty_state"
          >
            <CardContent className="py-10 flex flex-col items-center gap-3">
              <PackageSearch className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-muted-foreground">
                {activeCategory === "All"
                  ? "No products available yet"
                  : `No ${activeCategory} products yet`}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {activeCategory === "All"
                  ? "Check back soon — vendors are adding products!"
                  : "Try another category"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[...filteredProducts]
              .sort((a, b) => {
                const ra = stores.find((s) => s.id === a.storeId)?.rating ?? 0;
                const rb = stores.find((s) => s.id === b.storeId)?.rating ?? 0;
                return rb - ra;
              })
              .slice(0, 8)
              .map((product, idx) => {
                const storeInfo = storeMap.get(product.storeId);
                const storeName = storeInfo?.name;
                const isStoreClosed = storeInfo ? !storeInfo.isOpen : false;
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * idx }}
                    className={`rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col relative ${
                      isStoreClosed ? "opacity-60" : "bg-card"
                    }`}
                    style={isStoreClosed ? { pointerEvents: "none" } : {}}
                    data-ocid={`products.item.${idx + 1}`}
                  >
                    {isStoreClosed && (
                      <div
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center rounded-2xl px-2"
                        style={{
                          background: "rgba(0,0,0,0.55)",
                          pointerEvents: "none",
                        }}
                      >
                        <p className="font-bold text-white text-xs leading-tight drop-shadow">
                          Store Closed
                        </p>
                        <p className="text-white/80 text-[10px] mt-0.5 leading-tight">
                          Not Available
                        </p>
                      </div>
                    )}
                    <div className="relative bg-card">
                      <img
                        src={
                          product.imageUrl && product.imageUrl.trim() !== ""
                            ? product.imageUrl
                            : `https://picsum.photos/seed/${product.id}/200/140`
                        }
                        alt={product.name}
                        className="w-full h-28 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://picsum.photos/seed/${product.id}/200/140`;
                        }}
                      />
                    </div>
                    <div className="p-2.5 flex flex-col flex-1 bg-card">
                      <p className="font-bold text-sm text-foreground leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      <div className="mt-1">
                        <PriceDisplay
                          sellingPrice={product.sellingPrice ?? product.price}
                          originalPrice={product.originalPrice}
                          size="sm"
                        />
                      </div>
                      {storeName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {storeName}
                        </p>
                      )}
                      {product.category && (
                        <Badge className="mt-0.5 text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border border-green-200 font-semibold w-fit">
                          {product.category}
                        </Badge>
                      )}
                      {isStoreClosed ? (
                        <div className="mt-2 w-full h-7 flex items-center justify-center gap-1 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground font-semibold">
                          <XCircle className="w-3 h-3" />
                          Store Closed
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            addItem(
                              {
                                id: product.id,
                                name: product.name,
                                price: product.sellingPrice ?? product.price,
                              },
                              product.storeId,
                            );
                            toast.success(`${product.name} added to cart!`);
                          }}
                          className="mt-2 w-full h-7 text-xs font-bold rounded-lg text-white flex items-center justify-center gap-1 transition-colors shadow"
                          style={{ backgroundColor: "#16a34a" }}
                          data-ocid={`products.add_button.${idx + 1}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </section>

      {/* ── Nearby Stores ── */}
      <section className="mb-8" data-ocid="stores.section">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground">
            🏪 Nearby Stores
          </h2>
          <button
            type="button"
            onClick={() => navigate({ to: "/customer/stores" })}
            className="text-xs font-bold text-primary hover:text-primary/80"
            data-ocid="stores.view_all.button"
          >
            See all
          </button>
        </div>

        {storesLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {["sl1", "sl2", "sl3"].map((k) => (
              <div
                key={k}
                className="bg-muted animate-pulse rounded-2xl h-32 w-36 flex-shrink-0"
              />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <Card
            className="border-dashed border-2 border-border"
            data-ocid="stores.empty_state"
          >
            <CardContent className="py-8 flex flex-col items-center gap-2">
              <Store className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-muted-foreground">
                No stores available yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4"
            style={{ scrollbarWidth: "none" }}
          >
            {stores.slice(0, 8).map((store, idx) => (
              <motion.button
                key={store.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  navigate({
                    to: "/customer/store/$storeId",
                    params: { storeId: store.id },
                  });
                }}
                className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden text-left flex-shrink-0 w-36 transition-shadow hover:shadow-md"
                data-ocid={`dashboard.stores.item.${idx + 1}`}
              >
                <img
                  src={
                    store.imageUrl && store.imageUrl.trim() !== ""
                      ? store.imageUrl
                      : `https://via.placeholder.com/144x80?text=${encodeURIComponent(store.name)}`
                  }
                  alt={store.name}
                  className="w-full h-20 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://via.placeholder.com/144x80?text=${encodeURIComponent(store.name)}`;
                  }}
                />
                <div className="p-2">
                  <p className="font-extrabold text-xs text-foreground truncate">
                    {store.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {store.deliveryTime}
                  </p>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {store.categories?.slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className="text-[9px] font-semibold text-primary bg-primary/10 px-1 rounded"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* Active Orders */}
      <div className="mb-6">
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Active Orders ({activeOrders.length})
        </h2>
        {ordersLoading ? (
          <div
            className="flex items-center gap-2 text-muted-foreground text-sm py-4"
            data-ocid="orders.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Loading orders...
          </div>
        ) : activeOrders.length === 0 ? (
          <div
            className="text-center py-8 text-muted-foreground text-sm font-medium bg-muted/50 rounded-xl"
            data-ocid="orders.empty_state"
          >
            No active orders. Shop from the products above!
          </div>
        ) : (
          <div className="space-y-2">
            {activeOrders.map((o, i) => (
              <OrderCard
                key={o.id}
                order={o}
                idx={i}
                isExpiredLocal={expiredOrderIds.has(o.id)}
                onTrack={() => {
                  navigate({
                    to: "/customer/track/$orderId",
                    params: { orderId: o.id },
                  });
                }}
                onReorder={() => {
                  if (o.items) {
                    for (const item of o.items) {
                      addItem(
                        {
                          id: item.productId,
                          name: item.name,
                          price: item.price,
                        },
                        o.storeId,
                      );
                    }
                  }
                  navigate({ to: "/customer/cart" });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expired Orders */}
      {expiredOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-bold text-red-600 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Expired Orders ({expiredOrders.length})
          </h2>
          <div className="space-y-2">
            {expiredOrders.map((o, i) => (
              <OrderCard
                key={o.id}
                order={o}
                idx={i}
                isExpiredLocal={true}
                onReorder={() => {
                  if (o.items) {
                    for (const item of o.items) {
                      addItem(
                        {
                          id: item.productId,
                          name: item.name,
                          price: item.price,
                        },
                        o.storeId,
                      );
                    }
                  }
                  navigate({ to: "/customer/cart" });
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            No vendor accepted these orders in time.
          </p>
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Completed Orders ({completedOrders.length})
          </h2>
          <div className="space-y-2">
            {completedOrders.map((o, i) => (
              <OrderCard key={o.id} order={o} idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
