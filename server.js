const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname + '/'));

let currentMultiplier = 1.0, gameStatus = "running", nextCrash = null;

// Logic ya Rocket
setInterval(() => {
    if (gameStatus === "running") {
        currentMultiplier = (parseFloat(currentMultiplier) + 0.05).toFixed(2);
        io.emit('tick', currentMultiplier);
        if (nextCrash && currentMultiplier >= nextCrash) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            nextCrash = null;
            setTimeout(restartGame, 4000);
        } else if (Math.random() < 0.01 && currentMultiplier > 1.5) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            setTimeout(restartGame, 4000);
        }
    }
}, 100);

function restartGame() {
    currentMultiplier = 1.0;
    gameStatus = "running";
    io.emit('new_game');
}

// APIs ZA KUONGEZA UJUZI (Usajili & Salio)
app.post('/register', async (req, res) => {
    const { phone, password } = req.body;
    try {
        await pool.query("INSERT INTO users (phone, password, balance) VALUES ($1, $2, '{\"gold\": 0}') ON CONFLICT (phone) DO NOTHING", [phone, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/admin/user-details/:phone', async (req, res) => {
    try {
        const user = await pool.query("SELECT phone, (balance->>'gold')::numeric as bal FROM users WHERE phone = $1", [req.params.phone]);
        if (user.rows.length > 0) res.json({ success: true, data: user.rows[0] });
        else res.json({ success: false });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/admin/update-balance', async (req, res) => {
    const { phone, amount } = req.body;
    try {
        await pool.query("UPDATE users SET balance = jsonb_set(balance, '{gold}', (COALESCE(balance->>'gold', '0')::numeric + $1)::text::jsonb) WHERE phone = $2", [amount, phone]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/admin/set-crash', (req, res) => {
    nextCrash = parseFloat(req.body.point);
    res.json({ success: true });
});

server.listen(process.env.PORT || 3000);
