const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// TEMP DATABASE
let users = [];
let withdrawals = [];

// SIMPLE TOKEN (for now)
function generateToken(user) {
  return Buffer.from(user.email).toString("base64");
}

// =========================
// REGISTER
// =========================
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const userExists = users.find(u => u.email === email);
  if (userExists) {
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

  const token = generateToken(newUser);

  res.json({
    token,
    user: newUser
  });
});

// =========================
// LOGIN
// =========================
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(user);

  res.json({
    token,
    user
  });
});

// =========================
// PROFILE
// =========================
app.get("/api/auth/profile", (req, res) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: "No token" });
  }

  const token = auth.split(" ")[1];
  const email = Buffer.from(token, "base64").toString("ascii");

  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(user);
});

// =========================
// WITHDRAW
// =========================
app.post("/api/withdraw", (req, res) => {
  const { email, amount } = req.body;

  withdrawals.push({
    email,
    amount,
    date: new Date().toISOString()
  });

  res.json({ message: "Withdrawal request submitted" });
});

// =========================
// ADMIN
// =========================
app.get("/admin/users", (req, res) => {
  res.json(users);
});

app.get("/admin/withdrawals", (req, res) => {
  res.json(withdrawals);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Backend running on port " + PORT));
