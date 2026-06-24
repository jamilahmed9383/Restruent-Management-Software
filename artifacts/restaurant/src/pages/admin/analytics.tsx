import { useGetAdminAnalytics, getGetAdminAnalyticsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Star, ShoppingBag, Clock, Users, BarChart3, Percent, DollarSign } from "lucide-react";

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-background border border-border rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-serif font-bold text-base">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function HourLabel(hour: number) {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

export default function AnalyticsTab({ adminEnabled }: { adminEnabled: boolean }) {
  const { data, isLoading } = useGetAdminAnalytics({
    query: { queryKey: getGetAdminAnalyticsQueryKey(), refetchInterval: 30000, enabled: adminEnabled },
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
      </div>
    );
  }

  const maxOrderCount = Math.max(...(data.peakHours.map(h => h.orderCount) || [1]), 1);
  const maxDowRevenue = Math.max(...data.revenueByDayOfWeek.map(d => d.totalRevenue), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="w-4 h-4" />
            <span className="text-xs font-medium">Completion Rate</span>
          </div>
          <span className="text-3xl font-serif font-bold text-primary">{data.orderCompletionRate}%</span>
          <span className="text-xs text-muted-foreground">of non-cancelled orders delivered</span>
        </div>
        <div className="bg-background border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Order Value</span>
          </div>
          <span className="text-3xl font-serif font-bold text-foreground">${data.averageOrderValue.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">per order placed</span>
        </div>
        <div className="bg-background border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Rating</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-serif font-bold text-foreground">{data.averageRating > 0 ? data.averageRating : "—"}</span>
            {data.averageRating > 0 && <span className="text-sm text-muted-foreground mb-1">/ 5</span>}
          </div>
          <span className="text-xs text-muted-foreground">{data.totalReviews} review{data.totalReviews !== 1 ? "s" : ""}</span>
        </div>
        <div className="bg-background border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Peak Hour</span>
          </div>
          <span className="text-3xl font-serif font-bold text-foreground">
            {data.peakHours.length > 0
              ? HourLabel(data.peakHours.reduce((a, b) => a.orderCount > b.orderCount ? a : b).hour)
              : "—"}
          </span>
          <span className="text-xs text-muted-foreground">busiest time of day</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Sellers */}
        <SectionCard title="Best Selling Items" icon={ShoppingBag}>
          {data.bestSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No order data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.bestSellers.map((item, idx) => {
                const maxQty = data.bestSellers[0].totalQuantity;
                const pct = (item.totalQuantity / maxQty) * 100;
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                        <span className="font-medium text-foreground truncate max-w-[160px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground text-xs">{item.totalQuantity} sold</span>
                        <span className="font-bold text-primary text-xs">${item.totalRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Top Tables */}
        <SectionCard title="Busiest Tables" icon={Users}>
          {data.topTables.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No order data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.topTables.map((t, idx) => {
                const maxOrders = data.topTables[0].orderCount;
                const pct = (t.orderCount / maxOrders) * 100;
                return (
                  <div key={t.tableNumber}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                        <span className="font-medium text-foreground">Table {t.tableNumber}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{t.orderCount} orders</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Peak Hours */}
        <SectionCard title="Orders by Hour of Day" icon={Clock}>
          {data.peakHours.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No order data yet</p>
          ) : (
            <div className="flex items-end gap-1.5 h-36">
              {data.peakHours.map(h => {
                const heightPct = (h.orderCount / maxOrderCount) * 100;
                return (
                  <div key={h.hour} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{h.orderCount}</span>
                    <div className="w-full bg-muted rounded-t-sm" style={{ height: "80px" }}>
                      <div
                        className="w-full bg-primary rounded-t-sm transition-all"
                        style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{HourLabel(h.hour)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Revenue by Day of Week */}
        <SectionCard title="Revenue by Day of Week" icon={BarChart3}>
          <div className="flex flex-col gap-2.5">
            {data.revenueByDayOfWeek.map(d => (
              <div key={d.dayOfWeek}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">{d.dayOfWeek.slice(0, 3)}</span>
                  <div className="flex gap-3">
                    <span className="text-muted-foreground">{d.orderCount} orders</span>
                    <span className="font-bold text-primary">${d.totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded-full"
                    style={{ width: maxDowRevenue > 0 ? `${(d.totalRevenue / maxDowRevenue) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
