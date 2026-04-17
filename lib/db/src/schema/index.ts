import { pgTable, text, serial, boolean, numeric, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  totalCoins: numeric("total_coins", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const miningSessionsTable = pgTable("mining_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  date: date("date").notNull(),
  buttonIndex: integer("button_index").notNull(),
  coinsEarned: numeric("coins_earned", { precision: 10, scale: 2 }).notNull().default("50"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMiningSessionSchema = createInsertSchema(miningSessionsTable).omit({ id: true, createdAt: true });
export type InsertMiningSession = z.infer<typeof insertMiningSessionSchema>;
export type MiningSession = typeof miningSessionsTable.$inferSelect;

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawalRequestsTable).omit({ id: true, createdAt: true });
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
