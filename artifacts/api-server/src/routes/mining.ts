import { Router } from "express";
import { db, usersTable, miningSessionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
const COINS_PER_BUTTON = 50;
const TOTAL_BUTTONS = 20;
const DAILY_LIMIT = COINS_PER_BUTTON * TOTAL_BUTTONS; // 1000

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get("/today", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const today = todayDate();
  try {
    const sessions = await db
      .select()
      .from(miningSessionsTable)
      .where(and(eq(miningSessionsTable.userId, userId), eq(miningSessionsTable.date, today)));

    const minedButtons = sessions.map((s) => s.buttonIndex);
    const coinsEarnedToday = sessions.reduce((sum, s) => sum + parseFloat(s.coinsEarned ?? "0"), 0);

    res.json({
      date: today,
      minedButtons,
      coinsEarnedToday,
      dailyLimit: DAILY_LIMIT,
      canMineMore: coinsEarnedToday < DAILY_LIMIT,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/complete", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { buttonIndex } = req.body;
  const today = todayDate();

  if (buttonIndex === undefined || buttonIndex < 0 || buttonIndex >= TOTAL_BUTTONS) {
    res.status(400).json({ error: "Invalid button index" });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(miningSessionsTable)
      .where(
        and(
          eq(miningSessionsTable.userId, userId),
          eq(miningSessionsTable.date, today),
          eq(miningSessionsTable.buttonIndex, buttonIndex)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Button already mined today" });
      return;
    }

    const allToday = await db
      .select()
      .from(miningSessionsTable)
      .where(and(eq(miningSessionsTable.userId, userId), eq(miningSessionsTable.date, today)));

    const coinsEarnedToday = allToday.reduce((sum, s) => sum + parseFloat(s.coinsEarned ?? "0"), 0);
    if (coinsEarnedToday >= DAILY_LIMIT) {
      res.status(400).json({ error: "Daily mining limit reached" });
      return;
    }

    await db.insert(miningSessionsTable).values({
      userId,
      date: today,
      buttonIndex,
      coinsEarned: COINS_PER_BUTTON.toString(),
    });

    await db
      .update(usersTable)
      .set({ totalCoins: sql`${usersTable.totalCoins} + ${COINS_PER_BUTTON}` })
      .where(eq(usersTable.id, userId));

    const [user] = await db.select({ totalCoins: usersTable.totalCoins }).from(usersTable).where(eq(usersTable.id, userId));
    const updatedToday = await db
      .select()
      .from(miningSessionsTable)
      .where(and(eq(miningSessionsTable.userId, userId), eq(miningSessionsTable.date, today)));

    const newMinedButtons = updatedToday.map((s) => s.buttonIndex);
    const newTotalToday = updatedToday.reduce((sum, s) => sum + parseFloat(s.coinsEarned ?? "0"), 0);

    res.json({
      coinsEarned: COINS_PER_BUTTON,
      totalCoinsToday: newTotalToday,
      totalCoins: parseFloat(user.totalCoins ?? "0"),
      minedButtons: newMinedButtons,
      canMineMore: newTotalToday < DAILY_LIMIT,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
