import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { type Order, OrderStatus } from "../backend";
import ConfirmModal from "../components/ConfirmModal";
import LocationModal from "../components/LocationModal";
import OutOfRangeModal from "../components/OutOfRangeModal";
import { useApp } from "../context/AppContext";
import { useCart } from "../context/CartContext";
import { useNotifications } from "../context/NotificationContext";
import { useLocation } from "../hooks/useLocation";
import { useAllStores, useMyOrders } from "../hooks/useQueries";

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
};

function OrderCard({
  order,
  idx,
  isExpired,
  onTrack,
}: { order: Order; idx: number; isExpired?: boolean; onTrack?: () => void }) {
  const cfg = statusConfig[order.status];
  const Icon = cfg?.icon ?? Clock;
  const canTrack =
    order.status === OrderStatus.pickedUp ||
    order.status === OrderStatus.riderAssigned;

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: 0.05 * idx }}
        className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm opacity-75"
        data-ocid={`orders.item.${idx + 1}`}
      >
        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-700 truncate line-through">
            {order.itemName}
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-xs flex-shrink-0 gap-1 font-semibold bg-red-100 text-red-700 border-red-300"
        >
          <AlertCircle className="w-3 h-3" />
          Order Expired
        </Badge>
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
            {order.itemName}
          </p>
          <Badge
            variant="outline"
            className={`mt-1.5 text-xs gap-1 font-semibold ${
              cfg ? cfg.color : "bg-gray-100 text-gray-700 border-gray-300"
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
          className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs font-bold"
          data-ocid={`orders.track.button.${idx + 1}`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Track Order 📍
        </Button>
      )}
    </motion.div>
  );
}

export default function CustomerDashboard() {
  const { currentUser, navigate, setCurrentStoreId, setTrackingOrderId } =
    useApp();
  const { addNotification } = useNotifications();
  const { totalItems } = useCart();
  const customerId = currentUser?.id?.toString();
  const { data: orders = [], isLoading: ordersLoading } =
    useMyOrders(customerId);
  const { data: stores = [], isLoading: storesLoading } = useAllStores();
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

  // ── Order Expiry Logic ──────────────────────────────────────────────────────────
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
    itemName: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setExpiredOrderIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const order of orders) {
          const idStr = order.id.toString();
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
            setExpiredNotification({
              orderId: idStr,
              itemName: order.itemName,
            });
            addNotification({
              title: "Riva: Order Expired ⏳",
              message: `No vendor accepted your order for "${order.itemName}". Tap to reorder.`,
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
    if (status === "out_of_range") {
      setShowOutOfRange(true);
    }
  }, [status]);

  // ── Status change notifications ────────────────────────────────────────────────
  const prevStatuses = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    for (const order of orders) {
      const id = order.id.toString();
      const prev = prevStatuses.current.get(id);
      const curr = order.status as string;
      if (prev && prev !== curr) {
        if (curr === OrderStatus.storeConfirmed) {
          addNotification({
            title: "Riva: Order Accepted ✅",
            message: `A vendor accepted your order for ${order.itemName}!`,
            type: "order",
          });
        } else if (curr === OrderStatus.riderAssigned) {
          addNotification({
            title: "Riva: Out for Delivery 🚴",
            message: `Your ${order.itemName} is on the way!`,
            type: "order",
          });
        } else if (curr === OrderStatus.delivered) {
          addNotification({
            title: "Riva: Delivered! 🎉",
            message: `Your ${order.itemName} has been delivered. Enjoy!`,
            type: "order",
          });
        }
      }
      prevStatuses.current.set(id, curr);
    }
  }, [orders, addNotification]);

  // ── Time-based offer notifications ──────────────────────────────────────────
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
    const offer = offerMap[slot];
    addNotification({
      title: offer.title,
      message: offer.message,
      type: "offer",
    });
    localStorage.setItem(
      "riva_last_offer_slot",
      JSON.stringify({ date: today, slot }),
    );
  }, []);

  const activeOrders = orders.filter(
    (o) =>
      o.status !== OrderStatus.delivered &&
      !expiredOrderIds.has(o.id.toString()),
  );
  const expiredOrders = orders.filter(
    (o) => o.status === "requested" && expiredOrderIds.has(o.id.toString()),
  );
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
          className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5"
          data-ocid="dashboard.location_indicator"
        >
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 font-semibold">
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
            <p className="text-sm font-bold text-gray-900">Enable Location</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Enable to check delivery availability
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={requestLocation}
          data-ocid="dashboard.enable_location_button"
          className="ml-3 flex-shrink-0 bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-colors"
        >
          Enable
        </button>
      </motion.div>
    );
  };

  void inZone;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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

      {/* Push Notification Permission Banner */}
      {!pushDismissed &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default" && (
          <div
            className="mb-4 flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3"
            data-ocid="notifications.push_prompt.card"
          >
            <p className="text-xs text-blue-800 font-medium flex-1">
              Enable notifications to get order updates instantly.
            </p>
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

      {/* Expired Order Notification Banner */}
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
                    navigate("store-list");
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

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hello, {currentUser?.name || "Customer"} 👋
          </h1>
          <p className="text-sm text-foreground/70 font-medium">
            What do you need today?
          </p>
        </div>
        {totalItems > 0 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => navigate("cart")}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Cart ({totalItems})
          </motion.button>
        )}
      </div>

      {/* Global Search Bar */}
      <button
        type="button"
        onClick={() => navigate("global-search")}
        className="w-full mb-4 h-11 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center gap-2 px-4 text-gray-400 text-sm hover:border-primary/30 hover:shadow-md transition-all"
        data-ocid="dashboard.search_input"
        aria-label="Search products and stores"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span>Search products &amp; stores...</span>
      </button>

      {/* Location Banner */}
      {renderLocationBanner()}

      {/* ── Browse Stores Section ── */}
      <section className="mb-8" data-ocid="stores.section">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              🏪 Browse Stores
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Shop from local vendors near you
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("store-list")}
            className="text-xs font-bold text-green-600 hover:text-green-700"
            data-ocid="stores.view_all.button"
          >
            See all
          </button>
        </div>

        {storesLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {["pl1", "pl2", "pl3", "pl4"].map((k) => (
              <div
                key={k}
                className="bg-gray-100 animate-pulse rounded-2xl h-36"
              />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <Card
            className="border-dashed border-2 border-gray-200"
            data-ocid="stores.empty_state"
          >
            <CardContent className="py-10 flex flex-col items-center gap-3">
              <Store className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">
                No stores available yet
              </p>
              <p className="text-xs text-gray-400">
                Vendors are setting up their stores
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {stores.slice(0, 4).map((store, idx) => (
                <motion.button
                  key={store.storeId.toString()}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setCurrentStoreId(store.storeId);
                    navigate("store-detail");
                  }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left transition-shadow hover:shadow-md"
                  data-ocid={`dashboard.stores.item.${idx + 1}`}
                >
                  <img
                    src={
                      store.image && store.image.trim() !== ""
                        ? store.image
                        : `https://via.placeholder.com/200x100?text=${encodeURIComponent(store.name)}`
                    }
                    alt={store.name}
                    className="w-full h-20 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://via.placeholder.com/200x100?text=${encodeURIComponent(store.name)}`;
                    }}
                  />
                  <div className="p-2">
                    <p className="font-extrabold text-xs text-gray-900 truncate">
                      {store.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {store.deliveryTime}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
            <Button
              onClick={() => navigate("store-list")}
              className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl"
              data-ocid="stores.browse.primary_button"
            >
              <Store className="w-4 h-4 mr-2" />
              Browse All Stores
            </Button>
          </>
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
            className="flex items-center gap-2 text-foreground/60 text-sm py-4"
            data-ocid="orders.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Loading orders...
          </div>
        ) : activeOrders.length === 0 ? (
          <div
            className="text-center py-8 text-foreground/60 text-sm font-medium bg-muted/50 rounded-xl"
            data-ocid="orders.empty_state"
          >
            No active orders. Shop from a store above!
          </div>
        ) : (
          <div className="space-y-2">
            {activeOrders.map((o, i) => (
              <OrderCard
                key={o.id.toString()}
                order={o}
                idx={i}
                isExpired={expiredOrderIds.has(o.id.toString())}
                onTrack={() => {
                  setTrackingOrderId(o.id);
                  navigate("order-tracking");
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
                key={o.id.toString()}
                order={o}
                idx={i}
                isExpired={true}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
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
              <OrderCard key={o.id.toString()} order={o} idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
