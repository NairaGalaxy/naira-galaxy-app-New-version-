import { Router } from "express";
import { db, usersTable, withdrawalRequestsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/balance", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [user] = await db.select({ totalCoins: usersTable.totalCoins }).from(usersTable).where(eq(usersTable.id, userId));
    const pendingWithdrawals = await db
      .select({ amount: withdrawalRequestsTable.amount })
      .from(withdrawalRequestsTable)
      .where(and(eq(withdrawalRequestsTable.userId, userId), inArray(withdrawalRequestsTable.status, ["pending", "approved"])));

    const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount ?? "0"), 0);
    const total = parseFloat(user?.totalCoins ?? "0");

    res.json({
      totalCoins: total,
      pendingWithdrawal: pendingTotal,
      availableBalance: Math.max(0, total - pendingTotal),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/withdraw", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { amount, bankName, accountNumber, accountName } = req.body;

  if (!amount || amount <= 0 || !bankName || !accountNumber || !accountName) {
    res.status(400).json({ error: "All withdrawal fields are required" });
    return;
  }

  try {
    const [user] = await db.select({ totalCoins: usersTable.totalCoins }).from(usersTable).where(eq(usersTable.id, userId));
    const pendingWithdrawals = await db
      .select({ amount: withdrawalRequestsTable.amount })
      .from(withdrawalRequestsTable)
      .where(and(eq(withdrawalRequestsTable.userId, userId), inArray(withdrawalRequestsTable.status, ["pending", "approved"])));

    const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount ?? "0"), 0);
    const available = parseFloat(user?.totalCoins ?? "0") - pendingTotal;

    if (amount > available) {
      res.status(400).json({ error: "Insufficient available balance" });
      return;
    }

    const [withdrawal] = await db.insert(withdrawalRequestsTable).values({
      userId,
      amount: amount.toString(),
      bankName,
      accountNumber,
      accountName,
      status: "pending",
    }).returning();

    res.status(201).json({
      id: withdrawal.id,
      status: "pending",
      message: "Withdrawal request submitted successfully",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/withdrawals", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const withdrawals = await db
      .select()
      .from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.userId, userId))
      .orderBy(sql`${withdrawalRequestsTable.createdAt} desc`);

    res.json(withdrawals.map((w) => ({
      id: w.id,
      amount: parseFloat(w.amount ?? "0"),
      bankName: w.bankName,
      accountNumber: w.accountNumber,
      accountName: w.accountName,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
