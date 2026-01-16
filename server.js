const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 1. Game Multiplier (Ndege ya pamoja kwa wote)
let multiplier = 1.00;
setInterval(() => {
    multiplier += 0.01;
    if (multiplier > 10.00) multiplier = 1.00; 
}, 100);

app.get('/api/game-state', (req, res) => {
    res.json({ multiplier: parseFloat(multiplier.toFixed(2)) });
});

// 2. Admin Search Route (Iliyorekebishwa ili isilete kosa)
app.get('/admin/search', async (req, res) => {
    const { term } = req.query;
    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE name ILIKE $1 OR phone LIKE $1", 
            [`%${term}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

// 3. User Registration (Majina Mawili)
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, phone, password } = req.body;
    try {
        const fullName = `${firstName} ${lastName}`;
        await pool.query(
            "INSERT INTO users (name, phone, password, balance) VALUES ($1, $2, $3, 0) ON CONFLICT (phone) DO NOTHING",
            [fullName, phone, password]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
