import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Bell, BellOff, Check, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type AppNotification,
  useNotifications,
} from "../context/NotificationContext";

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const TYPE_STYLES: Record<
  AppNotification["type"],
  { border: string; dot: string; bg: string }
> = {
  order: {
    border: "border-l-green-500",
    dot: "bg-green-500",
    bg: "bg-green-50",
  },
  offer: {
    border: "border-l-orange-500",
    dot: "bg-orange-500",
    bg: "bg-orange-50",
  },
  reminder: {
    border: "border-l-yellow-500",
    dot: "bg-yellow-500",
    bg: "bg-yellow-50",
  },
  system: { border: "border-l-blue-500", dot: "bg-blue-500", bg: "bg-blue-50" },
};

// Sound helper — played after first user interaction to respect autoplay policy
let userInteracted = false;
if (typeof window !== "undefined") {
  const markInteraction = () => {
    userInteracted = true;
  };
  window.addEventListener("click", markInteraction, { once: true });
  window.addEventListener("touchstart", markInteraction, { once: true });
}

function playNotifSound() {
  if (!userInteracted) return;
  try {
    const ctx = new (
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    )();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // silently ignore if audio API is unavailable
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, clearAll } =
    useNotifications();
  const prevCountRef = useRef(notifications.length);

  // Play sound when a new notification arrives (after user has interacted)
  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      playNotifSound();
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          userInteracted = true; // mark interaction on bell click
          setOpen(true);
        }}
        className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="Notifications"
        data-ocid="header.notifications.button"
      >
        <Bell className="w-5 h-5 text-foreground/80" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
            data-ocid="notifications.badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[380px] p-0 flex flex-col"
          data-ocid="notifications.panel"
        >
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </SheetTitle>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                    data-ocid="notifications.mark_all_read.button"
                  >
                    <Check className="w-3 h-3" />
                    All read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded-md hover:bg-muted transition-colors"
                    data-ocid="notifications.clear_all.button"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
                data-ocid="notifications.empty_state"
              >
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BellOff className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  No notifications yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Order updates and offers will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.slice(0, 20).map((notif, idx) => {
                  const styles = TYPE_STYLES[notif.type];
                  return (
                    <button
                      type="button"
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={`w-full text-left px-4 py-3 border-l-4 ${styles.border} transition-colors hover:bg-muted/50 ${
                        notif.read ? "opacity-60" : ""
                      }`}
                      data-ocid={`notifications.item.${idx + 1}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {!notif.read && (
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`}
                              />
                            )}
                            <p className="text-xs font-bold text-foreground truncate">
                              {notif.title}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                          {timeAgo(notif.timestamp)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
