const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Kuunda Jedwali la Database
const initDB = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            balance DECIMAL DEFAULT 0.00
        );
    `);
};
initDB();

// Mfumo wa Mpira na Multiplier (House Edge / Faida ya Admin)
let multiplier = 1.00;
let crashPoint = 1.50;

function nextCrash() {
    let r = Math.random();
    // 35% ya muda mchezo unakatika mapema (1.00x - 1.25x) ili Admin upate faida
    if (r < 0.35) return 1.00 + (Math.random() * 0.25);
    // 65% ya muda mchezo unaenda juu (Bahati na sibu)
    return 1.25 + (Math.random() * 9.0);
}

crashPoint = nextCrash();

setInterval(() => {
    if (multiplier < crashPoint) {
        multiplier += 0.02;
    } else {
        multiplier = 1.00; // Mpira unapasuka
        crashPoint = nextCrash();
    }
}, 100);

app.get('/api/game-state', (req, res) => {
    res.json({ multiplier: parseFloat(multiplier.toFixed(2)) });
});

// Usajili na Login (Inatambua majina mawili)
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
        if(user.rows[0] && user.rows[0].password === password) {
            res.json({ success: true, user: user.rows[0] });
        } else {
            res.json({ success: false, message: "Login Failed" });
        }
    }
});

// Admin Update (Pesa)
app.post('/admin/update-balance', async (req, res) => {
    const { phone, amount, action } = req.body;
    const val = action === 'add' ? amount : -amount;
    await pool.query("UPDATE users SET balance = balance + $1 WHERE phone = $2", [val, phone]);
    res.json({ success: true });
});

app.get('/admin/users', async (req, res) => {
    const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
    res.json(result.rows);
});

app.listen(process.env.PORT || 3000);
