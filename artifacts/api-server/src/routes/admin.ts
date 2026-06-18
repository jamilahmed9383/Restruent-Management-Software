import { Router, type Request, type Response } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq, notInArray, desc, count, sum, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

const sessions = new Set<string>();

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isAuthenticated(req: Request): boolean {
  const token = req.headers["x-admin-token"] as string | undefined;
  return !!token && sessions.has(token);
}

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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
