import { Router, type IRouter } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import queueRouter from "./queue";
import adminRouter from "./admin";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(queueRouter);
router.use(adminRouter);
router.use(reviewsRouter);

export default router;
