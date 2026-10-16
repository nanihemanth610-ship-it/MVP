import { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: "warning" | "success" | "info";
  isRead: boolean;
  linkUrl?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Arithmetic Variance Flagged",
    description:
      "Claim BB-DEMO-1001 (Apollo Hospitals, Bengaluru) has a ₹1,500 math calculation variance.",
    timeAgo: "12m ago",
    type: "warning",
    isRead: false,
    linkUrl: "/review/claim-memorial-002",
  },
  {
    id: "notif-2",
    title: "Extraction Complete",
    description:
      "Fortis Memorial Research Institute bill was parsed with 98.2% AI confidence.",
    timeAgo: "2h ago",
    type: "success",
    isRead: false,
    linkUrl: "/claims",
  },
  {
    id: "notif-3",
    title: "Demo Mode Active",
    description:
      "Running with synthetic billing data and local client storage.",
    timeAgo: "1d ago",
    type: "info",
    isRead: true,
  },
];

export function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications: ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl ring-1 ring-black/10 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 p-1 rounded cursor-pointer"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3" /> Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No notifications to display.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-3.5 text-xs transition-colors hover:bg-secondary/40",
                    !n.isRead && "bg-secondary/20 font-medium",
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {n.type === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    {n.type === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {n.type === "info" && (
                      <Info className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-foreground font-semibold truncate">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {n.timeAgo}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {n.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
