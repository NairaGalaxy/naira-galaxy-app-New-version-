const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// TEMP DATABASE (in-memory)
let users = [];
let withdrawals = [];

// REGISTER
app.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const userExists = users.find(u => u.email === email);
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  users.push({ email, password });
  res.json({ message: "User registered successfully" });
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ message: "Login successful" });
});

// WITHDRAW
app.post("/withdraw", (req, res) => {
  const { email, amount } = req.body;

  withdrawals.push({ email, amount });
  res.json({ message: "Withdrawal request submitted" });
});

// ADMIN VIEW
app.get("/admin/users", (req, res) => {
  res.json(users);
});

app.get("/admin/withdrawals", (req, res) => {
  res.json(withdrawals);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend running on port " + PORT));
