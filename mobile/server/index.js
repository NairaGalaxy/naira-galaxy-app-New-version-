const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// TEMP DATABASE
// =========================
let users = [];
let withdrawals = [];
let miningLogs = [];

// =========================
// CONSTANTS
// =========================
const COINS_PER_BUTTON = 50;
const MAX_BUTTONS_PER_DAY = 20;
const DAILY_LIMIT = COINS_PER_BUTTON * MAX_BUTTONS_PER_DAY;

// =========================
// TOKEN HELPERS
// =========================
function generateToken(user) {
  return Buffer.from(user.email).toString("base64");
}

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;

  const token = auth.split(" ")[1];
  const email = Buffer.from(token, "base64").toString("ascii");

  return users.find(u => u.email === email);
}

// =========================
// AUTH
// =========================
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = {
    id: Date.now(),
    username,
    email,
    password,
    fullName,
    isAdmin: false,
    totalCoins: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  res.json({
    token: generateToken(newUser),
    user: newUser
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({
    token: generateToken(user),
    user
  });
});

app.get("/api/auth/profile", (req, res) => {
  const user = getUserFromToken(req);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json(user);
});

// =========================
// 🔐 SECURE MINING SYSTEM
// =========================

// GET mining status
app.get("/api/mine", (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const today = new Date().toISOString().split("T")[0];

  let log = miningLogs.find(
    l => l.email === user.email && l.date === today
  );

  // ✅ Ensure fresh daily log
  if (!log) {
    log = {
      email: user.email,
      date: today,
      buttons: [],
      total: 0,
    };
    miningLogs.push(log);
  }

  res.json({
    minedButtons: log.buttons,
    todayTotal: log.total,
    dailyLimit: DAILY_LIMIT
  });
});

// POST mine (FULLY LOCKED)
app.post("/api/mine", (req, res) => {
  const user = getUserFromToken(req);
  const { buttonId } = req.body;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // ✅ STRICT VALIDATION
  if (
    buttonId === undefined ||
    typeof buttonId !== "number" ||
    buttonId < 0 ||
    buttonId >= MAX_BUTTONS_PER_DAY
  ) {
    return res.status(400).json({ error: "Invalid button" });
  }

  const today = new Date().toISOString().split("T")[0];

  let log = miningLogs.find(
    l => l.email === user.email && l.date === today
  );

  // ✅ CREATE DAILY LOG
  if (!log) {
    log = {
      email: user.email,
      date: today,
      buttons: [],
      total: 0,
    };
    miningLogs.push(log);
  }

  // ❌ BLOCK DUPLICATE BUTTON
  if (log.buttons.includes(buttonId)) {
    return res.status(400).json({ error: "Button already mined" });
  }

  // ❌ DAILY LIMIT
  if (log.buttons.length >= MAX_BUTTONS_PER_DAY) {
    return res.status(400).json({ error: "Daily limit reached" });
  }

  // ✅ APPLY MINING
  log.buttons.push(buttonId);
  log.total += COINS_PER_BUTTON;
  user.totalCoins += COINS_PER_BUTTON;

  res.json({
    message: "Mining successful",
    earned: COINS_PER_BUTTON,
    totalCoins: user.totalCoins,
    minedButtons: log.buttons,
    todayTotal: log.total,
  });
});

// =========================
// WALLET
// =========================
app.get("/api/wallet/balance", (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const pending = withdrawals
    .filter(w => w.email === user.email && w.status === "pending")
    .reduce((sum, w) => sum + w.amount, 0);

  res.json({
    totalCoins: user.totalCoins,
    pendingWithdrawal: pending,
    availableBalance: user.totalCoins - pending
  });
});

app.get("/api/wallet/withdrawals", (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  res.json(withdrawals.filter(w => w.email === user.email));
});

app.post("/api/wallet/withdraw", (req, res) => {
  const user = getUserFromToken(req);
  const { amount, bankName, accountNumber, accountName } = req.body;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  if (user.totalCoins < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  user.totalCoins -= amount;

  const newWithdrawal = {
    id: Date.now(),
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    amount,
    bankName,
    accountNumber,
    accountName,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  withdrawals.push(newWithdrawal);

  res.json({
    message: "Withdrawal request submitted",
    withdrawal: newWithdrawal
  });
});

// =========================
// ADMIN
// =========================
app.get("/api/admin/users", (req, res) => {
  res.json(users);
});

app.get("/api/admin/withdrawals", (req, res) => {
  res.json(withdrawals);
});

app.patch("/api/admin/withdrawals/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const withdrawal = withdrawals.find(w => w.id == id);

  if (!withdrawal) {
    return res.status(404).json({ error: "Withdrawal not found" });
  }

  withdrawal.status = status;

  res.json({
    message: "Status updated",
    withdrawal
  });
});

app.get("/api/admin/mining", (req, res) => {
  res.json(miningLogs);
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("Backend running on port " + PORT)
);
