import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import miningRouter from "./mining.js";
import walletRouter from "./wallet.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/user", authRouter);
router.use("/mining", miningRouter);
router.use("/wallet", walletRouter);
router.use("/admin", adminRouter);

export default router;
