const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// 🔐 CONFIG
// =========================
const JWT_SECRET = "SUPER_SECRET_KEY"; // ⚠️ change in production

// Rate limiter (anti-spam)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});
app.use("/api/", limiter);

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
// 🔐 AUTH HELPERS
// =========================
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return users.find(u => u.id === decoded.id);
  } catch {
    return null;
  }
}

// =========================
// AUTH - REGISTER
// =========================
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: Date.now(),
    username,
    email,
    password: hashedPassword,
    fullName,
    isAdmin: false,
    totalCoins: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  res.json({
    token: generateToken(newUser),
    user: { ...newUser, password: undefined }
  });
});

// =========================
// AUTH - LOGIN
// =========================
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({
    token: generateToken(user),
    user: { ...user, password: undefined }
  });
});

// =========================
// AUTH - PROFILE
// =========================
app.get("/api/auth/profile", (req, res) => {
  const user = getUserFromToken(req);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({ ...user, password: undefined });
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

// POST mine
app.post("/api/mine", (req, res) => {
  const user = getUserFromToken(req);
  const { buttonIndex } = req.body;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (buttonIndex === undefined) {
    return res.status(400).json({ error: "Missing button index" });
  }

  const today = new Date().toISOString().split("T")[0];

  let log = miningLogs.find(
    l => l.email === user.email && l.date === today
  );

  if (!log) {
    log = {
      email: user.email,
      date: today,
      buttons: [],
      total: 0,
    };
    miningLogs.push(log);
  }

  if (log.buttons.includes(buttonIndex)) {
    return res.status(400).json({ error: "Already mined" });
  }

  if (log.buttons.length >= MAX_BUTTONS_PER_DAY) {
    return res.status(400).json({ error: "Daily limit reached" });
  }

  log.buttons.push(buttonIndex);
  log.total += COINS_PER_BUTTON;

  user.totalCoins += COINS_PER_BUTTON;

  res.json({
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
  res.json(users.map(u => ({ ...u, password: undefined })));
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
  console.log("🚀 Secure backend running on port " + PORT)
);
