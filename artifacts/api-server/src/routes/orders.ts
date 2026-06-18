import { Router } from "express";
import { db, ordersTable, menuItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { CreateOrderBody, UpdateOrderStatusBody, UpdateOrderStatusParams, GetOrderParams } from "@workspace/api-zod";

const router = Router();

function formatOrder(order: typeof ordersTable.$inferSelect) {
  return {
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
  };
}

router.get("/orders", async (req, res) => {
  try {
    const { status } = req.query as { status?: string };
    let query = db.select().from(ordersTable);
    const orders = status
      ? await query.where(eq(ordersTable.status, status))
      : await query;
    res.json(orders.map(formatOrder));
  } catch (err) {
    logger.error({ err }, "Error fetching orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { tableNumber, items: orderItems, notes } = parsed.data;

    const menuItems = await db.select().from(menuItemsTable);
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    const resolvedItems: Array<{ menuItemId: number; name: string; quantity: number; price: number }> = [];
    let subtotal = 0;

    for (const item of orderItems) {
      const menuItem = menuMap.get(item.menuItemId);
      if (!menuItem) {
        res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
        return;
      }
      const price = parseFloat(menuItem.price);
      resolvedItems.push({ menuItemId: item.menuItemId, name: menuItem.name, quantity: item.quantity, price });
      subtotal += price * item.quantity;
    }

    const tax = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const [order] = await db
      .insert(ordersTable)
      .values({
        tableNumber,
        items: resolvedItems,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: "order_received",
        paymentStatus: "pending",
        notes: notes ?? null,
      })
      .returning();

    res.status(201).json(formatOrder(order));
  } catch (err) {
    logger.error({ err }, "Error creating order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const parsed = GetOrderParams.safeParse({ id: parseInt(req.params.id, 10) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, parsed.data.id));

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(formatOrder(order));
  } catch (err) {
    logger.error({ err }, "Error fetching order");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const paramsParsed = UpdateOrderStatusParams.safeParse({ id: parseInt(req.params.id, 10) });
    if (!paramsParsed.success) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const bodyParsed = UpdateOrderStatusBody.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { status, paymentStatus, estimatedWaitMinutes } = bodyParsed.data;

    const updateData: Partial<typeof ordersTable.$inferInsert> = { status };
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (estimatedWaitMinutes !== undefined) updateData.estimatedWaitMinutes = estimatedWaitMinutes;

    const [updated] = await db
      .update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, paramsParsed.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json(formatOrder(updated));
  } catch (err) {
    logger.error({ err }, "Error updating order status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
