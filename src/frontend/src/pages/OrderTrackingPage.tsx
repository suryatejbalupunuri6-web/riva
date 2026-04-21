import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MapPin, Navigation, Timer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OrderStatus } from "../backend";
import { useApp } from "../context/AppContext";
import { useNotifications } from "../context/NotificationContext";
import { formatCountdown, useOrderCountdown } from "../hooks/useOrderCountdown";
import {
  useDeliveryLocation,
  useMyOrders,
  useStoreById,
} from "../hooks/useQueries";

// Leaflet is loaded via CDN (same approach as MapPickerModal)
declare global {
  interface Window {
    L: any;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if (window.L) {
      resolve();
      return;
    }
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.onload = () => resolve();
      document.head.appendChild(script);
    } else {
      resolve();
    }
  });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Animated "Updating location..." indicator */
function UpdatingLocationPill() {
  return (
    <div
      className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
      data-ocid="tracking.waiting.panel"
    >
      <span className="relative flex h-3 w-3 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
      </span>
      <p className="text-sm font-semibold text-amber-800 animate-pulse">
        Updating location...
      </p>
    </div>
  );
}

/** Smooth marker interpolation using requestAnimationFrame */
function animateMarkerTo(
  marker: any,
  animFrameRef: MutableRefObject<number | null>,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  durationMs: number,
) {
  if (animFrameRef.current !== null) {
    cancelAnimationFrame(animFrameRef.current);
  }
  const start = performance.now();
  const tick = (now: number) => {
    const elapsed = now - start;
    const t = Math.min(elapsed / durationMs, 1);
    const ease = 1 - (1 - t) ** 3;
    const lat = fromLat + (toLat - fromLat) * ease;
    const lng = fromLng + (toLng - fromLng) * ease;
    marker.setLatLng([lat, lng]);
    if (t < 1) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      animFrameRef.current = null;
    }
  };
  animFrameRef.current = requestAnimationFrame(tick);
}

export default function OrderTrackingPage() {
  const { navigate, trackingOrderId, currentUser } = useApp();
  const { addNotification } = useNotifications();
  const customerId = currentUser?.id?.toString();

  const { data: orders = [] } = useMyOrders(customerId);
  const order = useMemo(
    () =>
      orders.find(
        (o) => trackingOrderId !== null && o.id === trackingOrderId,
      ) ?? null,
    [orders, trackingOrderId],
  );

  const { data: deliveryLocation } = useDeliveryLocation(trackingOrderId);
  const { data: store } = useStoreById(order?.storeId ?? null);

  const mapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const storeMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  // Store previous rider position for smooth animation
  const prevRiderPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [leafletReady, setLeafletReady] = useState(!!window.L);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(
    null,
  );

  const isPending = order?.status === OrderStatus.requested;
  const orderId = order?.id?.toString() ?? null;

  // Countdown (only meaningful for pending orders)
  const { secondsLeft, isExpired } = useOrderCountdown(
    isPending ? orderId : null,
  );

  // Fire expiry notification exactly once
  const expiredNotifFired = useRef(false);
  useEffect(() => {
    if (isPending && isExpired && !expiredNotifFired.current) {
      expiredNotifFired.current = true;
      addNotification({
        title: "Riva: Order Expired",
        message: "Your order expired. Try again.",
        type: "order",
      });
      // Mark expired in localStorage
      try {
        const stored = localStorage.getItem("riva_expired_orders");
        const ids: string[] = stored ? JSON.parse(stored) : [];
        if (orderId && !ids.includes(orderId)) {
          ids.push(orderId);
          localStorage.setItem("riva_expired_orders", JSON.stringify(ids));
        }
      } catch {}
    }
  }, [isPending, isExpired, orderId, addNotification]);

  // Load Leaflet CDN
  useEffect(() => {
    if (!leafletReady) {
      loadLeaflet().then(() => setLeafletReady(true));
    }
  }, [leafletReady]);

  // Track seconds since last update
  useEffect(() => {
    if (!deliveryLocation) {
      setSecondsSinceUpdate(null);
      return;
    }
    const computeSecs = () => {
      const updatedAtMs = Number(deliveryLocation.updatedAt) / 1_000_000;
      setSecondsSinceUpdate(Math.floor((Date.now() - updatedAtMs) / 1000));
    };
    computeSecs();
    const timer = setInterval(computeSecs, 1000);
    return () => clearInterval(timer);
  }, [deliveryLocation]);

  // Initialize map once Leaflet is ready
  useEffect(() => {
    if (!leafletReady) return;
    if (mapRef.current) return;
    const el = document.getElementById("tracking-map");
    if (!el) return;
    const L = window.L;
    const map = L.map(el, { zoomControl: true }).setView([17.338, 78.553], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "\u00a9 OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      storeMarkerRef.current = null;
      customerMarkerRef.current = null;
      polylineRef.current = null;
      prevRiderPosRef.current = null;
    };
  }, [leafletReady]);

  // Place store & customer markers after map is ready
  useEffect(() => {
    if (!mapRef.current || !leafletReady) return;
    const L = window.L;

    // Customer marker
    if (order?.pinnedLatitude && order?.pinnedLongitude) {
      const icon = L.divIcon({
        html: "\u{1F4CD}",
        className: "",
        iconSize: [24, 24],
      });
      if (!customerMarkerRef.current) {
        customerMarkerRef.current = L.marker(
          [order.pinnedLatitude, order.pinnedLongitude],
          { icon },
        )
          .addTo(mapRef.current)
          .bindPopup("Your location");
      } else {
        customerMarkerRef.current.setLatLng([
          order.pinnedLatitude,
          order.pinnedLongitude,
        ]);
      }
    }

    // Store marker
    const storeLat = (store as any)?.latitude ?? 17.338;
    const storeLng = (store as any)?.longitude ?? 78.553;
    const storeIcon = L.divIcon({
      html: "\u{1F3EA}",
      className: "",
      iconSize: [24, 24],
    });
    if (!storeMarkerRef.current) {
      storeMarkerRef.current = L.marker([storeLat, storeLng], {
        icon: storeIcon,
      })
        .addTo(mapRef.current)
        .bindPopup(store?.name ?? "Store");
    } else {
      storeMarkerRef.current.setLatLng([storeLat, storeLng]);
    }
  }, [order, store, leafletReady]);

  // Update rider marker and polyline when location changes
  useEffect(() => {
    if (!mapRef.current || !deliveryLocation || !leafletReady) return;
    const L = window.L;

    const riderLat = deliveryLocation.lat;
    const riderLng = deliveryLocation.lng;
    const riderIcon = L.divIcon({
      html: "\u{1F6F5}",
      className: "",
      iconSize: [24, 24],
    });

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker([riderLat, riderLng], {
        icon: riderIcon,
      })
        .addTo(mapRef.current)
        .bindPopup("Rider");
      prevRiderPosRef.current = { lat: riderLat, lng: riderLng };
    } else {
      const prev = prevRiderPosRef.current;
      if (
        prev &&
        (Math.abs(prev.lat - riderLat) > 0.000001 ||
          Math.abs(prev.lng - riderLng) > 0.000001)
      ) {
        // Animate smoothly from old to new position over 1 second
        animateMarkerTo(
          riderMarkerRef.current,
          animFrameRef,
          prev.lat,
          prev.lng,
          riderLat,
          riderLng,
          1000,
        );
      } else {
        riderMarkerRef.current.setLatLng([riderLat, riderLng]);
      }
      prevRiderPosRef.current = { lat: riderLat, lng: riderLng };
    }

    // Update polyline
    const storeLat = (store as any)?.latitude ?? 17.338;
    const storeLng = (store as any)?.longitude ?? 78.553;
    const customerLat = order?.pinnedLatitude ?? 17.338;
    const customerLng = order?.pinnedLongitude ?? 78.553;
    const points: [number, number][] = [
      [storeLat, storeLng],
      [riderLat, riderLng],
      [customerLat, customerLng],
    ];
    if (polylineRef.current) polylineRef.current.remove();
    polylineRef.current = L.polyline(points, {
      color: "#f97316",
      weight: 3,
      dashArray: "8,8",
    }).addTo(mapRef.current);

    mapRef.current.panTo([riderLat, riderLng], {
      animate: true,
      duration: 0.8,
    });
  }, [deliveryLocation, order, store, leafletReady]);

  // Calculate ETA
  const etaMinutes = useMemo(() => {
    if (!deliveryLocation || !order?.pinnedLatitude || !order?.pinnedLongitude)
      return null;
    const dist = haversineKm(
      deliveryLocation.lat,
      deliveryLocation.lng,
      order.pinnedLatitude,
      order.pinnedLongitude,
    );
    return Math.max(1, Math.round((dist / 20) * 60));
  }, [deliveryLocation, order]);

  const isDelivered = order?.status === OrderStatus.delivered;

  // Show stale indicator only when we HAVE location data but it stopped updating
  const isStale = secondsSinceUpdate !== null && secondsSinceUpdate > 8;
  // "Updating location..." shown only when GPS was received before but went stale
  const showUpdatingIndicator =
    deliveryLocation !== null && deliveryLocation !== undefined && isStale;
  // "Waiting for rider..." shown when order is active but no location yet
  const waitingForRider =
    !deliveryLocation && !isDelivered && !(isPending && isExpired);

  return (
    <div
      className="max-w-2xl mx-auto flex flex-col"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("customer-dashboard")}
          className="gap-1.5 -ml-2"
          data-ocid="tracking.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Live Tracking</h1>
          {order && (
            <p className="text-xs text-muted-foreground">
              Order #{order.id.toString()}
            </p>
          )}
        </div>
        {secondsSinceUpdate !== null && (
          <div
            className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full"
            data-ocid="tracking.last_updated.panel"
          >
            <Clock className="w-3 h-3" />
            {secondsSinceUpdate}s ago
          </div>
        )}
      </div>

      {/* Countdown pill for pending orders */}
      <AnimatePresence>
        {isPending && !isExpired && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-4 mt-4"
          >
            <div
              className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-300 rounded-full px-4 py-2"
              data-ocid="tracking.countdown.panel"
            >
              <Timer className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-700">
                Order expires in{" "}
                <span className="font-mono tabular-nums">
                  {formatCountdown(secondsLeft)}
                </span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expired state */}
      <AnimatePresence>
        {isPending && isExpired && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 mt-4 p-5 bg-red-50 border border-red-200 rounded-2xl text-center"
            data-ocid="tracking.expired.error_state"
          >
            <p className="text-3xl mb-2">❌</p>
            <p className="font-bold text-red-800 text-base">
              No vendor accepted your order.
            </p>
            <p className="text-sm text-red-600 mt-1">Try again.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Button
                size="sm"
                onClick={() => {
                  if (order?.storeId) {
                    navigate("store-detail");
                  } else {
                    navigate("store-list");
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                data-ocid="tracking.reorder.button"
              >
                🔄 Reorder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("customer-dashboard")}
                className="border-red-200 text-red-700 hover:bg-red-50"
                data-ocid="tracking.back_home.button"
              >
                Back to Dashboard
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivered banner */}
      {isDelivered && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center"
          data-ocid="tracking.delivered.success_state"
        >
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-bold text-green-800 text-base">Order Delivered!</p>
          <p className="text-xs text-green-600 mt-0.5">
            Your order has been delivered successfully.
          </p>
          <Button
            size="sm"
            onClick={() => navigate("customer-dashboard")}
            className="mt-3 bg-green-600 hover:bg-green-700 text-white"
            data-ocid="tracking.back_home.button"
          >
            Back to Dashboard
          </Button>
        </motion.div>
      )}

      {/* Status banner (non-expired, non-delivered) */}
      {!isDelivered && !(isPending && isExpired) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4"
        >
          {showUpdatingIndicator ? (
            <UpdatingLocationPill />
          ) : waitingForRider ? (
            <div
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
              data-ocid="tracking.waiting.panel"
            >
              <span className="text-xl">📦</span>
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Waiting for rider...
                </p>
                <p className="text-xs text-amber-600">
                  Rider will start sharing location soon
                </p>
              </div>
            </div>
          ) : (
            <div
              className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1"
              data-ocid="tracking.status.panel"
            >
              <p className="text-sm font-bold text-orange-800">
                🚴 Rider is on the way
              </p>
              {etaMinutes !== null && (
                <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  ⏱️ Arriving in {etaMinutes} min{etaMinutes !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Map — hide when expired */}
      {!(isPending && isExpired) && (
        <>
          <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-border shadow-sm">
            {!leafletReady ? (
              <div
                className="w-full flex items-center justify-center bg-muted"
                style={{ height: 360 }}
              >
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            ) : (
              <div id="tracking-map" style={{ width: "100%", height: 360 }} />
            )}
          </div>

          {/* Legend */}
          <div className="mx-4 mt-3 mb-6 flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-green-600" />🏪 Store
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600" />📍 You
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-500" />🛵 Rider
            </span>
          </div>
        </>
      )}
    </div>
  );
}
