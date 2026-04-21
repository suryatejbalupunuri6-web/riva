import { useCallback, useEffect, useState } from "react";
import { GLOBAL_DELIVERY_ZONE, isPointInPolygon } from "../utils/geofence";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "in_range"
  | "out_of_range";

const STORAGE_KEY = "riva_location_status";

export function useLocation() {
  const [status, setStatus] = useState<LocationStatus>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LocationStatus | null;
    return stored ?? "idle";
  });
  const [inZone, setInZone] = useState<boolean | null>(null);

  useEffect(() => {
    if (status !== "idle") {
      localStorage.setItem(STORAGE_KEY, status);
    }
  }, [status]);

  const requestLocation = useCallback(() => {
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const inside = isPointInPolygon(
          pos.coords.latitude,
          pos.coords.longitude,
          GLOBAL_DELIVERY_ZONE,
        );
        setInZone(inside);
        setStatus(inside ? "in_range" : "out_of_range");
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return {
    status,
    inZone,
    requestLocation,
    deliveryZone: GLOBAL_DELIVERY_ZONE,
  };
}
