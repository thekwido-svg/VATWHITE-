const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Database Connection (Ulinzi dhidi ya op_error)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

app.use(express.json());
app.use(express.static(__dirname + '/'));

let currentMultiplier = 1.0;
let gameStatus = "running"; 
let activeBets = []; // Hifadhi ya dau zote live
let gameHistory = [];

// SMART ROCKET LOGIC: Polepole hadi 1.05x, kisha mbio
function generateCrashPoint() {
    let rand = Math.random() * 100;
    // Ulinzi wa Faida: Kama dau zote kwa pamoja zimezidi 500, lipua mapema
    let totalRisk = activeBets.reduce((sum, b) => sum + b.amt, 0);
    if (totalRisk > 500 && Math.random() < 0.80) return (Math.random() * 0.05 + 1.00).toFixed(2);

    if (rand < 40) return (Math.random() * 0.08 + 1.01).toFixed(2); // 1.02x nyingi
    if (rand < 85) return (Math.random() * 2.5 + 1.1).toFixed(2);   
    return (Math.random() * 15 + 5).toFixed(2); // Odi kubwa
}

let crashPoint = generateCrashPoint();

setInterval(() => {
    if (gameStatus === "running") {
        let increment = currentMultiplier < 1.05 ? 0.005 : (currentMultiplier < 2 ? 0.03 : 0.08);
        currentMultiplier = (parseFloat(currentMultiplier) + increment).toFixed(2);
        io.emit('tick', currentMultiplier);

        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            gameHistory.unshift(currentMultiplier);
            if (gameHistory.length > 8) gameHistory.pop();
            io.emit('history', gameHistory);
            activeBets = []; // Safisha dau baada ya crash
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = generateCrashPoint();
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 80);

// HANDLING SOCKET EVENTS (Double Bet & Admin Panel Tracking)
io.on('connection', (socket) => {
    // Kurekodi dau kutoka kwa mtumiaji (Vitufe vyote viwili)
    socket.on('place_bet', (data) => {
        activeBets.push({ phone: data.phone, amt: data.amt, id: data.id });
        console.log(`PANEL: Dau la KES ${data.amt} limewekwa na ${data.phone} (Panel ${data.id})`);
    });

    // Kurekodi Cashout (Manual na Auto)
    socket.on('player_cashout', async (data) => {
        console.log(`ADMIN: ${data.phone} ameshinda KES ${data.win} kwenye ${data.m}x`);
        // Hapa unaweza kuongeza kodi ya ku-update salio kwenye Database moja kwa moja
        try {
            await pool.query("UPDATE users SET balance = jsonb_set(balance, '{gold}', (COALESCE(balance->>'gold', '0')::numeric + $1)::text::jsonb) WHERE phone = $2", [data.win, data.phone]);
        } catch (err) { console.error("Database Update Error:", err); }
    });
});

// ENDPOINTS ZA KAWAIDA
app.post('/signup', async (req, res) => {
    const { phone } = req.body;
    // Mteja asipoteze akaunti akirudi
    const result = await pool.query("INSERT INTO users (phone, balance) VALUES ($1, '{\"gold\": 0}') ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone RETURNING *", [phone]);
    res.json({ success: true, user: result.rows[0] });
});

app.get('/get-balance/:phone', async (req, res) => {
    const result = await pool.query("SELECT balance->>'gold' as bal FROM users WHERE phone = $1", [req.params.phone]);
    res.json({ balance: result.rows[0]?.bal || "0.00" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SERVER BORA LIVE KWENYE PORT ${PORT}`));
