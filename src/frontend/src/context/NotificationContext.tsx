import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type NotificationType = "order" | "offer" | "reminder" | "system";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: number;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (
    n: Omit<AppNotification, "id" | "read" | "timestamp">,
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "riva_notifications";
const MAX_NOTIFICATIONS = 50;

const notificationSound = new Audio(
  "https://www.soundjay.com/buttons/sounds/button-3.mp3",
);

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as AppNotification[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "timestamp">) => {
      const newNotif: AppNotification = {
        ...n,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        read: false,
        timestamp: Date.now(),
      };
      setNotifications((prev) => {
        const updated = [newNotif, ...prev];
        return updated.slice(0, MAX_NOTIFICATIONS);
      });
      // Play notification sound
      try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => {
          // Autoplay blocked — silently ignore
        });
      } catch {
        // ignore
      }
      // Fire browser push notification if permission granted
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(n.title, {
              body: n.message,
              icon: "/favicon.ico",
            });
          } catch {
            // ignore
          }
        }
      }
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return ctx;
}
