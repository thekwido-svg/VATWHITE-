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

let gameStatus = "waiting"; 
let currentMultiplier = 1.0;
let crashPoint = 2.0; 
let maxLimit = 20.34;

// Injini ya Mchezo
setInterval(() => {
    if (gameStatus === "running") {
        currentMultiplier += 0.01; 
        io.emit('tick', currentMultiplier.toFixed(2));
        if (currentMultiplier >= crashPoint) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier.toFixed(2));
            setTimeout(resetGame, 4000);
        }
    }
}, 100);

function resetGame() {
    gameStatus = "waiting";
    currentMultiplier = 1.0;
    crashPoint = (Math.random() * (maxLimit - 1.01) + 1.01).toFixed(2);
    io.emit('new_game');
    setTimeout(() => { gameStatus = "running"; }, 3000);
}

// Admin API
app.post('/update-balance', async (req, res) => {
    const { phone, amount } = req.body;
    try {
        await pool.query("UPDATE users SET balance = jsonb_set(balance, '{gold}', (COALESCE(balance->>'gold', '0')::numeric + $1)::text::jsonb) WHERE phone = $2", [amount, phone]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/get-users', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        res.json(result.rows);
    } catch (err) { res.status(500).json([]); }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('VATWHITE Engine Online!'));
