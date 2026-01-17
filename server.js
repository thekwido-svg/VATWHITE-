const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname + '/'));

// --- LOGIC YA NDEGE (Synchronized kwa kila mtu) ---
let currentMultiplier = 1.0;
let gameStatus = "running"; 
let crashPoint = (Math.random() * 10 + 1.1).toFixed(2);

setInterval(() => {
    if (gameStatus === "running") {
        currentMultiplier = (parseFloat(currentMultiplier) + 0.01).toFixed(2);
        io.emit('tick', currentMultiplier);
        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = (Math.random() * 20.34 + 1.1).toFixed(2);
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 100);

// --- LOGIC YA KUJISAJILI & ADMIN ---
app.post('/signup', async (req, res) => {
    const { firstname, lastname, phone, password } = req.body;
    try {
        await pool.query("INSERT INTO users (firstname, lastname, phone, password, balance) VALUES ($1, $2, $3, $4, '{\"gold\": 0}')", [firstname, lastname, phone, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Phone already exists!" }); }
});

app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE phone = $1 AND password = $2", [phone, password]);
    if (result.rows.length > 0) res.json({ success: true, user: result.rows[0] });
    else res.json({ success: false });
});

app.get('/get-users', async (req, res) => {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
});

app.post('/update-balance', async (req, res) => {
    const { phone, amount } = req.body;
    await pool.query("UPDATE users SET balance = jsonb_set(balance, '{gold}', (COALESCE(balance->>'gold', '0')::numeric + $1)::text::jsonb) WHERE phone = $2", [amount, phone]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('VATWHITE Engine fully online!'));
