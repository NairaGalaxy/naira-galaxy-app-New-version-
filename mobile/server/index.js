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
// SIMPLE TOKEN
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
// AUTH - REGISTER
// =========================
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: "All fields are required" });
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

// =========================
// AUTH - LOGIN
// =========================
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

// =========================
// AUTH - PROFILE
// =========================
app.get("/api/auth/profile", (req, res) => {
  const user = getUserFromToken(req);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json(user);
});

// =========================
// MINE COINS (LIMITED)
// =========================
app.post("/api/mine", (req, res) => {
  const user = getUserFromToken(req);
  const { amount } = req.body;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // DAILY LIMIT (1000 coins)
  const today = new Date().toDateString();

  const minedToday = miningLogs
    .filter(log => log.email === user.email && new Date(log.date).toDateString() === today)
    .reduce((sum, log) => sum + log.amount, 0);

  if (minedToday + amount > 1000) {
    return res.status(400).json({ error: "Daily mining limit reached" });
  }

  user.totalCoins += amount;

  miningLogs.push({
    email: user.email,
    amount,
    date: new Date().toISOString()
  });

  res.json({
    message: "Mining successful",
    totalCoins: user.totalCoins
  });
});

// =========================
// WALLET - BALANCE
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

// =========================
// WALLET - HISTORY
// =========================
app.get("/api/wallet/withdrawals", (req, res) => {
  const user = getUserFromToken(req);

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const userWithdrawals = withdrawals
    .filter(w => w.email === user.email)
    .map(w => ({
      ...w,
      createdAt: w.createdAt || w.date // ensure compatibility
    }));

  res.json(userWithdrawals);
});

// =========================
// WALLET - WITHDRAW
// =========================
app.post("/api/wallet/withdraw", (req, res) => {
  const user = getUserFromToken(req);
  const { amount, bankName, accountNumber, accountName } = req.body;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  if (!bankName || !accountNumber || !accountName) {
    return res.status(400).json({ error: "Bank details required" });
  }

  if (user.totalCoins < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  user.totalCoins -= amount;

  const newWithdrawal = {
    id: Date.now(),
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
// ADMIN (PROTECTED)
// =========================
app.get("/api/admin/users", (req, res) => {
  const user = getUserFromToken(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(users);
});

app.get("/api/admin/withdrawals", (req, res) => {
  const user = getUserFromToken(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(withdrawals);
});

app.get("/api/admin/mining", (req, res) => {
  const user = getUserFromToken(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(miningLogs);
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Backend running on port " + PORT));
