import { Router } from "express";
import { db, ordersTable } from "@workspace/db";
import { notInArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const ACTIVE_STATUSES = ["order_received", "payment_confirmed", "accepted", "preparing", "ready"];

router.get("/queue", async (_req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(notInArray(ordersTable.status, ["cancelled", "delivered"]))
      .orderBy(ordersTable.createdAt);

    const queue = orders.map((order, index) => ({
      id: order.id,
      tableNumber: order.tableNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      queuePosition: index + 1,
      estimatedWaitMinutes: order.estimatedWaitMinutes ?? null,
      createdAt: order.createdAt.toISOString(),
    }));

    res.json(queue);
  } catch (err) {
    logger.error({ err }, "Error fetching queue");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { ACTIVE_STATUSES };
export default router;
