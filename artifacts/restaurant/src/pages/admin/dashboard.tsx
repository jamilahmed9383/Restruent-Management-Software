import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useGetAdminMe, 
  useGetAdminStats, 
  useListOrders, 
  useUpdateOrderStatus,
  useAdminLogout,
  useGetAdminHistory,
  getGetAdminStatsQueryKey,
  getGetAdminMeQueryKey,
  getListOrdersQueryKey,
  getGetOrderQueryKey,
  getHealthCheckQueryKey,
  getGetAdminHistoryQueryKey,
  useHealthCheck,
  useGetOrder,
  clearCustomHeader
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, ReceiptText, ChefHat, AlertCircle, Activity, Search, TrendingUp, Calendar, DollarSign, QrCode, Star, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QRCodesTab from "./qr-codes";
import AnalyticsTab from "./analytics";
import ReviewsTab from "./reviews-tab";

const STATUS_TABS = ["all", "active", "completed"];
const MAIN_TABS = ["orders", "analytics", "reviews", "history", "qrcodes"] as const;
type MainTab = (typeof MAIN_TABS)[number];

const TAB_CONFIG: Record<MainTab, { label: string; icon: any }> = {
  orders:    { label: "Orders",        icon: ReceiptText },
  analytics: { label: "Analytics",     icon: BarChart3   },
  reviews:   { label: "Reviews",       icon: Star        },
  history:   { label: "Sales History", icon: TrendingUp  },
  qrcodes:   { label: "QR Codes",      icon: QrCode      },
};

const getNextStatusOptions = (current: string) => {
  switch (current) {
    case "order_received": return [{ label: "Accept Order", value: "accepted", type: "default" }, { label: "Cancel", value: "cancelled", type: "destructive" }];
    case "payment_confirmed": return [{ label: "Accept Order", value: "accepted", type: "default" }, { label: "Cancel", value: "cancelled", type: "destructive" }];
    case "accepted": return [{ label: "Start Preparing", value: "preparing", type: "default" }];
    case "preparing": return [{ label: "Ready to Serve", value: "ready", type: "default" }];
    case "ready": return [{ label: "Mark Delivered", value: "delivered", type: "default" }];
    default: return [];
  }
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<MainTab>("orders");
  const [activeTab, setActiveTab] = useState("active");

  const { data: admin, isLoading: isAuthLoading, isError: isAuthError } = useGetAdminMe({ query: { queryKey: getGetAdminMeQueryKey(), retry: false } });
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });
  
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { data: selectedOrder } = useGetOrder(selectedOrderId!, { query: { queryKey: getGetOrderQueryKey(selectedOrderId!), enabled: !!selectedOrderId } });
  
  useEffect(() => {
    if (isAuthError) {
      setLocation("/admin");
    }
  }, [isAuthError, setLocation]);

  const logoutMutation = useAdminLogout();
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("admin-token");
        clearCustomHeader("x-admin-token");
        queryClient.clear();
        setLocation("/admin");
      }
    });
  };

  const { data: stats } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey(), refetchInterval: 10000, enabled: !!admin } });
  const { data: history, isLoading: isHistoryLoading } = useGetAdminHistory({ query: { queryKey: getGetAdminHistoryQueryKey(), refetchInterval: 10000, enabled: !!admin } });

  // Filter param logic
  const statusParam = activeTab === "all" ? undefined : activeTab === "active" ? "active" : "completed";
  const { data: orders, isLoading: isOrdersLoading } = useListOrders(
    { status: statusParam },
    { query: { queryKey: getListOrdersQueryKey({ status: statusParam }), refetchInterval: 10000, enabled: !!admin } }
  );

  const updateStatusMutation = useUpdateOrderStatus();
  const handleStatusUpdate = (orderId: number, status: string) => {
    updateStatusMutation.mutate({
      id: orderId,
      data: { status: status as any }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: statusParam }) });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        if (status === "delivered") {
          queryClient.invalidateQueries({ queryKey: getGetAdminHistoryQueryKey() });
        }
      }
    });
  };

  if (isAuthLoading || !admin) {
    return <div className="min-h-screen bg-muted/20 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-serif font-bold text-xl shadow-sm">
              L
            </div>
            <h1 className="font-serif font-bold text-xl hidden sm:block">Kitchen Display</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium mr-2" title={`API Status: ${health?.status || 'Unknown'}`}>
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-destructive'}`} />
            </div>
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">@{admin.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto flex flex-col gap-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Orders" value={stats?.activeOrders ?? "-"} icon={ChefHat} color="text-primary" />
          <StatCard title="Total Orders" value={stats?.totalOrders ?? "-"} icon={ReceiptText} />
          <StatCard title="Total Revenue" value={`$${stats?.totalRevenue?.toFixed(2) ?? "0.00"}`} icon={DollarSign} subtitle="Delivered orders only" />
          <StatCard title="Pending Payments" value={stats?.pendingPayments ?? "-"} icon={AlertCircle} color="text-destructive" />
        </div>

        {/* Main Tab Switcher */}
        <div className="flex flex-wrap gap-2">
          {MAIN_TABS.map(tab => {
            const { label, icon: Icon } = TAB_CONFIG[tab];
            return (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 border ${mainTab === tab ? 'bg-background border-border shadow-sm text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Orders Section */}
        {mainTab === "orders" && (
          <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="font-serif font-bold text-xl">Order Management</h2>
              <div className="flex bg-muted/50 p-1 rounded-xl">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground border-b border-border">
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Table</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">Items</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isOrdersLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4" colSpan={7}><Skeleton className="h-10 w-full" /></td>
                      </tr>
                    ))
                  ) : orders?.length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-muted-foreground" colSpan={7}>
                        No orders found in this category.
                      </td>
                    </tr>
                  ) : (
                    orders?.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">#{order.id}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-bold bg-background">T-{order.tableNumber}</Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(order.createdAt), "HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 max-w-[250px]">
                            {order.items.map((item, i) => (
                              <span key={i} className="text-xs truncate" title={`${item.quantity}x ${item.name}`}>
                                <span className="font-bold mr-1">{item.quantity}x</span>{item.name}
                              </span>
                            ))}
                            {order.notes && (
                              <span className="text-xs text-primary font-medium truncate mt-1">📝 {order.notes}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">${order.total.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSelectedOrderId(order.id)}>
                              <Search className="w-4 h-4" />
                            </Button>
                            {getNextStatusOptions(order.status).map(opt => (
                              <Button 
                                key={opt.value} 
                                size="sm" 
                                variant={opt.type as any}
                                className={opt.type === 'default' ? 'rounded-lg' : 'rounded-lg border-none shadow-none'}
                                onClick={() => handleStatusUpdate(order.id, opt.value)}
                                disabled={updateStatusMutation.isPending}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* QR Codes Section */}
        {mainTab === "qrcodes" && <QRCodesTab />}

        {/* Analytics Section */}
        {mainTab === "analytics" && <AnalyticsTab adminEnabled={!!admin} />}

        {/* Reviews Section */}
        {mainTab === "reviews" && <ReviewsTab adminEnabled={!!admin} />}

        {/* History Section */}
        {mainTab === "history" && (
          <div className="flex flex-col gap-6">
            {/* History Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-background border border-border rounded-3xl p-5 shadow-sm flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Days</span>
                <span className="text-3xl font-serif font-bold text-foreground">{history?.length ?? "—"}</span>
              </div>
              <div className="bg-background border border-border rounded-3xl p-5 shadow-sm flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Delivered Orders</span>
                <span className="text-3xl font-serif font-bold text-foreground">
                  {history ? history.reduce((s, r) => s + r.totalOrders, 0) : "—"}
                </span>
              </div>
              <div className="bg-background border border-border rounded-3xl p-5 shadow-sm flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">All-Time Revenue</span>
                <span className="text-3xl font-serif font-bold text-primary">
                  {history ? `$${history.reduce((s, r) => s + r.totalRevenue, 0).toFixed(2)}` : "—"}
                </span>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-lg">Date-wise Sales History</h2>
                    <p className="text-xs text-muted-foreground">Counts only delivered orders • updates live every 10s</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground border-b border-border">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium text-center">Delivered Orders</th>
                      <th className="px-6 py-3 font-medium text-right">Total Revenue</th>
                      <th className="px-6 py-3 font-medium text-right">Avg. Order Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isHistoryLoading ? (
                      Array(4).fill(0).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4" colSpan={4}><Skeleton className="h-8 w-full" /></td>
                        </tr>
                      ))
                    ) : !history || history.length === 0 ? (
                      <tr>
                        <td className="px-6 py-16 text-center text-muted-foreground" colSpan={4}>
                          <div className="flex flex-col items-center gap-2">
                            <TrendingUp className="w-8 h-8 opacity-20" />
                            <span>No delivered orders yet.</span>
                            <span className="text-xs">Revenue will appear here once orders are marked as Delivered.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      history.map((row) => {
                        const avg = row.totalOrders > 0 ? row.totalRevenue / row.totalOrders : 0;
                        const isToday = row.date === format(new Date(), "yyyy-MM-dd");
                        return (
                          <tr key={row.date} className={`hover:bg-muted/10 transition-colors ${isToday ? "bg-primary/5" : ""}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {format(new Date(row.date + "T00:00:00"), "MMMM d, yyyy")}
                                </span>
                                {isToday && (
                                  <Badge className="text-xs bg-primary/20 text-primary border-none px-2 py-0">Today</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-foreground">{row.totalOrders}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-bold text-primary text-base">${row.totalRevenue.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-muted-foreground">
                              ${avg.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Order Details #{selectedOrderId}</DialogTitle>
            <DialogDescription>
              {selectedOrder ? `Table ${selectedOrder.tableNumber} • ${format(new Date(selectedOrder.createdAt), "PPp")}` : 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-2">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span><span className="font-medium mr-2">{item.quantity}x</span> {item.name}</span>
                    <span className="text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 flex flex-col gap-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax</span>
                  <span>${selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>Total</span>
                  <span className="text-primary">${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
              {selectedOrder.notes && (
                <div className="bg-muted p-3 rounded-xl text-sm">
                  <span className="font-medium block mb-1">Notes:</span>
                  {selectedOrder.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, subtitle, color = "text-foreground" }: any) {
  return (
    <div className="bg-background border border-border p-5 rounded-3xl shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between text-muted-foreground mb-2">
        <span className="text-sm font-medium">{title}</span>
        <Icon className="w-5 h-5 opacity-50" />
      </div>
      <div className={`text-3xl font-serif font-bold ${color}`}>{value}</div>
      {trend && <div className="text-xs text-muted-foreground mt-1">{trend}</div>}
      {subtitle && <div className="text-xs text-muted-foreground/70 mt-1">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    order_received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-none",
    payment_confirmed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-none",
    accepted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-none",
    preparing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-none",
    ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none",
    delivered: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-none",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-none",
  };
  
  const labels: Record<string, string> = {
    order_received: "New",
    payment_confirmed: "Paid",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };

  return (
    <Badge variant="outline" className={`capitalize rounded-md px-2 py-0.5 ${styles[status] || ""}`}>
      {labels[status] || status.replace("_", " ")}
    </Badge>
  );
}
