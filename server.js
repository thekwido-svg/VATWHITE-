const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(express.static('.'));

// Unganisha na database uliyoweka Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Tengeneza table za siri za biashara yako
async function startDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (phone TEXT PRIMARY KEY, name TEXT, balance DECIMAL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS withdraws (id SERIAL, name TEXT, phone TEXT, amount DECIMAL, status TEXT DEFAULT 'PENDING');
    `);
}
startDB();

// Safari moja kwa simu zote (Sauti ya Jet Engine)
let m = 1.00; let crashed = false;
setInterval(() => {
    if(!crashed) {
        m += 0.01;
        if(Math.random() < 0.007 && m > 1.2) {
            crashed = true;
            setTimeout(() => { m = 1.00; crashed = false; }, 5000);
        }
    }
}, 100);

app.get('/game-state', (req, res) => res.json({ multiplier: m.toFixed(2), isCrashed: crashed }));

app.post('/register', async (req, res) => {
    const { name, phone } = req.body;
    await pool.query('INSERT INTO users (phone, name) VALUES ($1, $2) ON CONFLICT (phone) DO UPDATE SET name = $2', [phone, name]);
    res.sendStatus(200);
});

app.post('/withdraw-request', async (req, res) => {
    const { name, phone, amount } = req.body;
    await pool.query('INSERT INTO withdraws (name, phone, amount) VALUES ($1, $2, $3)', [name, phone, amount]);
    res.sendStatus(200);
});

// Hapa ndipo utaona data ya kweli ya watu wako
app.get('/admin/data', async (req, res) => {
    const users = await pool.query('SELECT * FROM users');
    const withdraws = await pool.query('SELECT * FROM withdraws WHERE status = $1', ['PENDING']);
    res.json({ users: users.rows, withdraws: withdraws.rows });
});

app.listen(process.env.PORT || 3000);
