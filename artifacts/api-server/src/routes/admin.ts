import { Router, type Request, type Response } from "express";
import { db, ordersTable, reviewsTable } from "@workspace/db";
import { eq, notInArray, desc, count, sum, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

const sessions = new Set<string>();

// Rate limiting: track failed login attempts per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function clearRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isAuthenticated(req: Request): boolean {
  const token = req.headers["x-admin-token"] as string | undefined;
  return !!token && sessions.has(token);
}

router.post("/admin/login", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
    return;
  }
  const { username, password } = req.body ?? {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    clearRateLimit(ip);
    const token = generateToken();
    sessions.add(token);
    res.set("X-Admin-Token", token);
    res.json({ success: true, username: ADMIN_USERNAME, token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

router.post("/admin/logout", (req, res) => {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (token) sessions.delete(token);
  res.json({ success: true });
});

router.get("/admin/me", (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ username: ADMIN_USERNAME });
});

router.get("/admin/stats", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));

    const activeStatuses = ["order_received", "payment_confirmed", "accepted", "preparing", "ready"];
    const activeOrders = allOrders.filter((o) => activeStatuses.includes(o.status)).length;

    const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
    const totalRevenue = deliveredOrders.reduce((acc, o) => acc + parseFloat(o.total as string), 0);
    const pendingPayments = allOrders.filter((o) => o.paymentStatus === "pending" && o.status !== "cancelled").length;

    const statusCounts = new Map<string, number>();
    for (const order of allOrders) {
      statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
    }

    const ordersByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

    const recentOrders = allOrders.slice(0, 10).map((order) => ({
      id: order.id,
      tableNumber: order.tableNumber,
      items: order.items,
      subtotal: parseFloat(order.subtotal as string),
      tax: parseFloat(order.tax as string),
      total: parseFloat(order.total as string),
      status: order.status,
      paymentStatus: order.paymentStatus,
      notes: order.notes ?? null,
      estimatedWaitMinutes: order.estimatedWaitMinutes ?? null,
      createdAt: order.createdAt.toISOString(),
    }));

    res.json({
      totalOrders: allOrders.length,
      activeOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingPayments,
      ordersByStatus,
      recentOrders,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/analytics", async (req, res) => {
  if (!isAuthenticated(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    const allReviews = await db.select().from(reviewsTable);

    // Best sellers — aggregate from orders jsonb
    const itemMap = new Map<string, { totalQuantity: number; totalRevenue: number }>();
    for (const order of allOrders) {
      const items = order.items as Array<{ name: string; quantity: number; price: number }>;
      for (const item of items) {
        const prev = itemMap.get(item.name) ?? { totalQuantity: 0, totalRevenue: 0 };
        itemMap.set(item.name, {
          totalQuantity: prev.totalQuantity + item.quantity,
          totalRevenue: prev.totalRevenue + item.price * item.quantity,
        });
      }
    }
    const bestSellers = Array.from(itemMap.entries())
      .map(([name, v]) => ({ name, ...v, totalRevenue: Math.round(v.totalRevenue * 100) / 100 }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // Peak hours
    const hourMap = new Map<number, number>();
    for (const order of allOrders) {
      const h = new Date(order.createdAt).getHours();
      hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
    }
    const peakHours = Array.from(hourMap.entries())
      .map(([hour, orderCount]) => ({ hour, orderCount }))
      .sort((a, b) => a.hour - b.hour);

    // Revenue by day of week
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dowMap = new Map<number, { totalRevenue: number; orderCount: number }>();
    for (const order of allOrders) {
      const d = new Date(order.createdAt).getDay();
      const prev = dowMap.get(d) ?? { totalRevenue: 0, orderCount: 0 };
      dowMap.set(d, { totalRevenue: prev.totalRevenue + parseFloat(order.total as string), orderCount: prev.orderCount + 1 });
    }
    const revenueByDayOfWeek = DAYS.map((dayOfWeek, idx) => {
      const v = dowMap.get(idx) ?? { totalRevenue: 0, orderCount: 0 };
      return { dayOfWeek, dayIndex: idx, totalRevenue: Math.round(v.totalRevenue * 100) / 100, orderCount: v.orderCount };
    });

    // Order completion rate
    const completed = allOrders.filter(o => o.status === "delivered").length;
    const nonCancelled = allOrders.filter(o => o.status !== "cancelled").length;
    const orderCompletionRate = nonCancelled > 0 ? Math.round((completed / nonCancelled) * 1000) / 10 : 0;

    // Average order value
    const avgOrderValue = allOrders.length > 0
      ? Math.round((allOrders.reduce((s, o) => s + parseFloat(o.total as string), 0) / allOrders.length) * 100) / 100
      : 0;

    // Top tables
    const tableMap = new Map<number, number>();
    for (const order of allOrders) {
      tableMap.set(order.tableNumber, (tableMap.get(order.tableNumber) ?? 0) + 1);
    }
    const topTables = Array.from(tableMap.entries())
      .map(([tableNumber, orderCount]) => ({ tableNumber, orderCount }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    // Review stats
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    res.json({ bestSellers, peakHours, revenueByDayOfWeek, orderCompletionRate, averageOrderValue: avgOrderValue, topTables, averageRating, totalReviews });
  } catch (err) {
    logger.error({ err }, "Error fetching analytics");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/history", async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db
      .select({
        date: sql<string>`DATE(${ordersTable.createdAt})`,
        totalOrders: sql<number>`COUNT(*)::int`,
        totalRevenue: sql<number>`COALESCE(SUM(${ordersTable.total}::numeric), 0)::float`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.status, "delivered"))
      .groupBy(sql`DATE(${ordersTable.createdAt})`)
      .orderBy(desc(sql`DATE(${ordersTable.createdAt})`));

    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Error fetching sales history");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
