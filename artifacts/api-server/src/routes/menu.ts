import { Router } from "express";
import { db, menuItemsTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/menu", async (req, res) => {
  try {
    const { category, search } = req.query as { category?: string; search?: string };
    const conditions: SQL[] = [];
    if (category) conditions.push(eq(menuItemsTable.category, category));
    if (search) conditions.push(ilike(menuItemsTable.name, `%${search}%`));

    const items = await db
      .select()
      .from(menuItemsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const mapped = items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      category: item.category,
      imageUrl: item.imageUrl ?? null,
      available: item.available,
      isSpecial: item.isSpecial,
    }));

    res.json(mapped);
  } catch (err) {
    logger.error({ err }, "Error fetching menu items");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/menu/categories", async (_req, res) => {
  try {
    const items = await db
      .selectDistinct({ category: menuItemsTable.category })
      .from(menuItemsTable)
      .where(eq(menuItemsTable.available, true));

    const categories = items.map((i) => i.category);
    res.json(categories);
  } catch (err) {
    logger.error({ err }, "Error fetching categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
