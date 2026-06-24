import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetAdminMe,
  useListOrders,
  useUpdateOrderStatus,
  useAdminLogout,
  useHealthCheck,
  getGetAdminMeQueryKey,
  getListOrdersQueryKey,
  getGetAdminStatsQueryKey,
  getGetAdminHistoryQueryKey,
  getHealthCheckQueryKey,
  clearCustomHeader,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  LogOut,
  ChefHat,
  Activity,
  Clock,
  ArrowRight,
  ExternalLink,
  Bell,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
} from "lucide-react";

type Order = {
  id: number;
  tableNumber: number;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  notes?: string | null;
  createdAt: string;
  items: Array<{ name: string; quantity: number; price: number }>;
};

const PIPELINE_COLS = [
  { key: "order_received",    label: "New",       color: "bg-blue-500",   light: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800",   text: "text-blue-700 dark:text-blue-300"   },
  { key: "payment_confirmed", label: "Paid",      color: "bg-indigo-500", light: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300" },
  { key: "accepted",          label: "Accepted",  color: "bg-yellow-500", light: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300" },
  { key: "preparing",         label: "Preparing", color: "bg-orange-500", light: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300" },
  { key: "ready",             label: "Ready",     color: "bg-green-500",  light: "bg-green-50 dark:bg-green-950/30",   border: "border-green-200 dark:border-green-800",   text: "text-green-700 dark:text-green-300"   },
] as const;

const NEXT_ACTIONS: Record<string, { label: string; value: string; variant: "default" | "destructive" }[]> = {
  order_received:    [{ label: "Accept", value: "accepted", variant: "default" }, { label: "Cancel", value: "cancelled", variant: "destructive" }],
  payment_confirmed: [{ label: "Accept", value: "accepted", variant: "default" }, { label: "Cancel", value: "cancelled", variant: "destructive" }],
  accepted:          [{ label: "Start Cooking", value: "preparing", variant: "default" }],
  preparing:         [{ label: "Ready to Serve", value: "ready", variant: "default" }],
  ready:             [{ label: "Delivered ✓", value: "delivered", variant: "default" }],
};

function minutesAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

function OrderCard({ order, onStatusUpdate, isPending }: {
  order: Order;
  onStatusUpdate: (id: number, status: string) => void;
  isPending: boolean;
}) {
  const col = PIPELINE_COLS.find(c => c.key === order.status);
  const actions = NEXT_ACTIONS[order.status] ?? [];
  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  const isUrgent = ageMs > 15 * 60 * 1000; // > 15 min

  return (
    <div className={`rounded-2xl border bg-background shadow-sm flex flex-col gap-0 overflow-hidden ${isUrgent ? "ring-2 ring-red-400/60" : ""}`}>
      {/* Card header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${col?.light}`}>
        <div className="flex items-center gap-2">
          <span className="text-base font-serif font-bold text-foreground">#{order.id}</span>
          <Badge variant="outline" className="font-bold text-xs px-2 py-0.5 bg-background">
            Table {order.tableNumber}
          </Badge>
          {isUrgent && <Bell className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{minutesAgo(order.createdAt)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 flex flex-col gap-1.5 flex-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="font-bold text-primary min-w-[1.5rem]">{item.quantity}×</span>
            <span className="text-foreground leading-snug">{item.name}</span>
          </div>
        ))}
        {order.notes && (
          <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
          <span>{format(new Date(order.createdAt), "HH:mm")}</span>
          <span className="font-bold text-foreground">${order.total.toFixed(2)}</span>
        </div>
        {actions.length > 0 && (
          <div className="flex gap-1.5">
            {actions.map(action => (
              <Button
                key={action.value}
                size="sm"
                variant={action.variant}
                className="flex-1 rounded-xl text-xs h-8"
                onClick={() => onStatusUpdate(order.id, action.value)}
                disabled={isPending}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Kitchen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: admin, isLoading: isAuthLoading, isError: isAuthError } = useGetAdminMe({
    query: { queryKey: getGetAdminMeQueryKey(), retry: false },
  });
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });

  const { data: allOrders, isLoading: isOrdersLoading } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}), refetchInterval: 5000, enabled: !!admin } }
  );

  const updateStatusMutation = useUpdateOrderStatus();
  const handleStatusUpdate = (orderId: number, status: string) => {
    updateStatusMutation.mutate(
      { id: orderId, data: { status: status as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
          if (status === "delivered") {
            queryClient.invalidateQueries({ queryKey: getGetAdminHistoryQueryKey() });
          }
        },
      }
    );
  };

  const logoutMutation = useAdminLogout();
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("admin-token");
        clearCustomHeader("x-admin-token");
        queryClient.clear();
        setLocation("/admin");
      },
    });
  };

  useEffect(() => {
    if (isAuthError) setLocation("/admin");
  }, [isAuthError, setLocation]);

  if (isAuthLoading || !admin) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <UtensilsCrossed className="w-5 h-5 animate-spin" />
          Loading kitchen display…
        </div>
      </div>
    );
  }

  // Group active orders by status column
  const colOrders = PIPELINE_COLS.map(col => ({
    ...col,
    orders: (allOrders ?? []).filter(o => o.status === col.key) as Order[],
  }));

  const deliveredToday = (allOrders ?? []).filter(o => {
    if (o.status !== "delivered") return false;
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  const totalActive = (allOrders ?? []).filter(o =>
    !["delivered", "cancelled"].includes(o.status)
  ).length;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="px-5 py-3 flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-lg leading-tight">Kitchen Display</h1>
                <p className="text-xs text-muted-foreground leading-none">Live order board · refreshes every 5s</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 ml-4 pl-4 border-l border-border text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground"><span className="font-bold text-foreground">{totalActive}</span> active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground"><span className="font-bold text-foreground">{deliveredToday.length}</span> delivered today</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={`API: ${health?.status}`}>
              <Activity className="w-4 h-4" />
              <div className={`w-2 h-2 rounded-full ${health?.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
              onClick={() => setLocation("/admin/dashboard")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Admin Panel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-5 min-w-max h-full min-h-[calc(100vh-72px)]">
          {colOrders.map(col => (
            <div key={col.key} className="w-72 flex flex-col gap-3">
              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border ${col.border} ${col.light}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className={`font-bold text-sm ${col.text}`}>{col.label}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.color} text-white`}>
                  {col.orders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 flex-1">
                {isOrdersLoading ? (
                  <div className="rounded-2xl bg-background border border-border h-32 animate-pulse" />
                ) : col.orders.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border flex items-center justify-center py-10 text-muted-foreground/40 text-sm">
                    Empty
                  </div>
                ) : (
                  col.orders
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusUpdate={handleStatusUpdate}
                        isPending={updateStatusMutation.isPending}
                      />
                    ))
                )}
              </div>
            </div>
          ))}

          {/* Delivered today — slim column */}
          <div className="w-64 flex flex-col gap-3">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-bold text-sm text-muted-foreground">Done Today</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {deliveredToday.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 opacity-50">
              {deliveredToday.slice(0, 15).map(order => (
                <div key={order.id} className="rounded-2xl border border-border bg-background px-4 py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">#{order.id}</span>
                    <span className="text-xs text-muted-foreground">T-{order.tableNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(order.createdAt), "HH:mm")}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  </div>
                </div>
              ))}
              {deliveredToday.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border flex items-center justify-center py-8 text-muted-foreground/40 text-sm">
                  None yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
