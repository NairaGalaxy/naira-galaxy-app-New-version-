import { Router } from "express";
import { db, usersTable, miningSessionsTable, withdrawalRequestsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(sql`${usersTable.createdAt} desc`);

    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = await db
      .select({ userId: miningSessionsTable.userId, coinsEarned: miningSessionsTable.coinsEarned })
      .from(miningSessionsTable)
      .where(eq(miningSessionsTable.date, today));

    const todayByUser: Record<number, number> = {};
    for (const s of todaySessions) {
      todayByUser[s.userId] = (todayByUser[s.userId] ?? 0) + parseFloat(s.coinsEarned ?? "0");
    }

    const lastMiningByUser = await db
      .select({ userId: miningSessionsTable.userId, date: sql<string>`max(${miningSessionsTable.date})` })
      .from(miningSessionsTable)
      .groupBy(miningSessionsTable.userId);

    const lastMiningMap: Record<number, string> = {};
    for (const r of lastMiningByUser) {
      lastMiningMap[r.userId] = r.date;
    }

    res.json(users.filter(u => !u.isAdmin).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      totalCoins: parseFloat(u.totalCoins ?? "0"),
      createdAt: u.createdAt.toISOString(),
      lastMiningDate: lastMiningMap[u.id] ?? null,
      todayCoins: todayByUser[u.id] ?? 0,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/withdrawals", requireAuth, requireAdmin, async (req, res) => {
  try {
    const withdrawals = await db
      .select({
        id: withdrawalRequestsTable.id,
        userId: withdrawalRequestsTable.userId,
        amount: withdrawalRequestsTable.amount,
        bankName: withdrawalRequestsTable.bankName,
        accountNumber: withdrawalRequestsTable.accountNumber,
        accountName: withdrawalRequestsTable.accountName,
        status: withdrawalRequestsTable.status,
        createdAt: withdrawalRequestsTable.createdAt,
        username: usersTable.username,
        fullName: usersTable.fullName,
      })
      .from(withdrawalRequestsTable)
      .leftJoin(usersTable, eq(withdrawalRequestsTable.userId, usersTable.id))
      .orderBy(sql`${withdrawalRequestsTable.createdAt} desc`);

    res.json(withdrawals.map((w) => ({
      id: w.id,
      userId: w.userId,
      username: w.username ?? "",
      fullName: w.fullName ?? "",
      amount: parseFloat(w.amount ?? "0"),
      bankName: w.bankName,
      accountNumber: w.accountNumber,
      accountName: w.accountName,
      status: w.status,
      createdAt: w.createdAt?.toISOString() ?? "",
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/withdrawals/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["pending", "approved", "rejected", "paid"];

  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  try {
    const [updated] = await db
      .update(withdrawalRequestsTable)
      .set({ status })
      .where(eq(withdrawalRequestsTable.id, parseInt(id)))
      .returning();

    res.json({
      id: updated.id,
      amount: parseFloat(updated.amount ?? "0"),
      bankName: updated.bankName,
      accountNumber: updated.accountNumber,
      accountName: updated.accountName,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
