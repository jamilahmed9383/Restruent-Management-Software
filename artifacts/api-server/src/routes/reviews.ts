import { Router } from "express";
import { db, reviewsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.post("/reviews", async (req, res) => {
  const { tableNumber, orderId, rating, comment } = req.body ?? {};
  if (!tableNumber || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "tableNumber and rating (1-5) are required" });
    return;
  }
  try {
    const [review] = await db
      .insert(reviewsTable)
      .values({ tableNumber, orderId: orderId ?? null, rating, comment: comment ?? null })
      .returning();
    res.status(201).json({
      ...review,
      createdAt: review.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Error submitting review");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/reviews", async (req, res) => {
  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const reviews = await db
      .select()
      .from(reviewsTable)
      .orderBy(desc(reviewsTable.createdAt));
    res.json(reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    logger.error({ err }, "Error fetching reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
