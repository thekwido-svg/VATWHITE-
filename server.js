const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('.'));

// Unganisha na Database yako ya kweli
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tengeneza table za watu na withdraws kama hazipo
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY,
      name TEXT,
      balance DECIMAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS withdraws (
      id SERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT,
      amount DECIMAL,
      status TEXT DEFAULT 'PENDING'
    );
  `);
}
initDB();

// Mfumo wa Safari ya Ndege (Global Sync)
let currentMultiplier = 1.00;
let isCrashed = false;
setInterval(() => {
  if (!isCrashed) {
    currentMultiplier += 0.01;
    if (Math.random() < 0.007 && currentMultiplier > 1.1) {
      isCrashed = true;
      setTimeout(() => { currentMultiplier = 1.00; isCrashed = false; }, 5000);
    }
  }
}, 100);

// --- ROUTES ZA MCHEZO ---

app.get('/game-state', (req, res) => {
  res.json({ multiplier: currentMultiplier.toFixed(2), isCrashed });
});

// Usajili wa Kweli
app.post('/register', async (req, res) => {
  const { name, phone } = req.body;
  try {
    await pool.query('INSERT INTO users (phone, name) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING', [phone, name]);
    const user = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    res.json(user.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// Ombi la Kutoa Pesa la Kweli
app.post('/withdraw-request', async (req, res) => {
  const { name, phone, amount } = req.body;
  await pool.query('INSERT INTO withdraws (name, phone, amount) VALUES ($1, $2, $3)', [name, phone, amount]);
  res.sendStatus(200);
});

// --- ROUTES ZA ADMIN ---

app.get('/admin/data', async (req, res) => {
  const users = await pool.query('SELECT * FROM users');
  const withdraws = await pool.query('SELECT * FROM withdraws WHERE status = $1', ['PENDING']);
  res.json({ users: users.rows, withdraws: withdraws.rows });
});

app.post('/admin/add-balance', async (req, res) => {
  const { phone, amount } = req.body;
  await pool.query('UPDATE users SET balance = balance + $1 WHERE phone = $2', [amount, phone]);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log("VATWHITE IS REAL NOW!"));
