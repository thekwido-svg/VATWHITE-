const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Kutengeneza Table za Users na Withdrawals Moja kwa Moja
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                balance DECIMAL DEFAULT 0.00
            );
        `);
    } catch (err) { console.log(err); }
};
initDB();

// Ndege inayopaa (Sync Multiplier)
let multiplier = 1.00;
setInterval(() => {
    multiplier += 0.01;
    if (multiplier > 20.00) multiplier = 1.00;
}, 100);

app.get('/api/game-state', (req, res) => {
    res.json({ multiplier: parseFloat(multiplier.toFixed(2)) });
});

// Usajili na Login
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, phone, password } = req.body;
    const fullName = `${firstName} ${lastName}`;
    try {
        const result = await pool.query(
            "INSERT INTO users (name, phone, password, balance) VALUES ($1, $2, $3, 0) RETURNING *",
            [fullName, phone, password]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        const user = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
        res.json({ success: true, user: user.rows[0] });
    }
});

// Ombi la Withdraw
app.post('/api/withdraw', async (req, res) => {
    const { phone, amount } = req.body;
    const user = await pool.query("SELECT balance FROM users WHERE phone = $1", [phone]);
    if (user.rows[0].balance >= amount) {
        await pool.query("UPDATE users SET balance = balance - $1 WHERE phone = $2", [amount, phone]);
        res.json({ success: true, message: "Ombi limepokelewa. Salio limepunguzwa." });
    } else {
        res.json({ success: false, message: "Salio halitoshi!" });
    }
});

// Admin Controls
app.get('/admin/users', async (req, res) => {
    const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
    res.json(result.rows);
});

app.post('/admin/update-balance', async (req, res) => {
    const { phone, amount, action } = req.body;
    const val = action === 'add' ? amount : -amount;
    await pool.query("UPDATE users SET balance = balance + $1 WHERE phone = $2", [val, phone]);
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
