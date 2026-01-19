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

let currentMultiplier = 1.0, gameStatus = "running", gameHistory = ["1.02", "2.70", "2.56", "2.91", "1.04"];
let nextCrashPoint = null;
let paymentDetails = { method: "MPESA TILL", number: "0702170114", name: "VATWHITE ADMIN" };

function generateCrashPoint() {
    if (nextCrashPoint) { let p = nextCrashPoint; nextCrashPoint = null; return p; }
    return (Math.random() < 0.35) ? (Math.random() * 0.2 + 1.0).toFixed(2) : (Math.random() * 4 + 1.2).toFixed(2);
}

let crashPoint = generateCrashPoint();

setInterval(() => {
    if (gameStatus === "running") {
        currentMultiplier = (parseFloat(currentMultiplier) + 0.05).toFixed(2);
        io.emit('tick', currentMultiplier);
        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            gameHistory.unshift(currentMultiplier);
            if (gameHistory.length > 6) gameHistory.pop();
            io.emit('history', gameHistory);
            setTimeout(() => { currentMultiplier = 1.0; crashPoint = generateCrashPoint(); gameStatus = "running"; io.emit('new_game'); }, 4000);
        }
    }
}, 100);

// API YA USAJILI
app.post('/register', async (req, res) => {
    try {
        await pool.query("INSERT INTO users (phone, password, balance) VALUES ($1, $2, '{\"gold\": 0}') ON CONFLICT (phone) DO NOTHING", [req.body.phone, req.body.password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/admin/user-details/:phone', async (req, res) => {
    const user = await pool.query("SELECT phone, (balance->>'gold')::numeric as bal FROM users WHERE phone = $1", [req.params.phone]);
    if (user.rows.length > 0) res.json({ success: true, data: user.rows[0] });
    else res.status(404).json({ success: false });
});

app.post('/admin/update-balance', async (req, res) => {
    await pool.query("UPDATE users SET balance = jsonb_set(balance, '{gold}', (COALESCE(balance->>'gold', '0')::numeric + $1)::text::jsonb) WHERE phone = $2", [req.body.amount, req.body.phone]);
    res.json({ success: true });
});

app.get('/payment-info', (req, res) => res.json(paymentDetails));
app.post('/admin/set-crash', (req, res) => { nextCrashPoint = req.body.point; res.json({success:true}); });

io.on('connection', (socket) => { socket.emit('history', gameHistory); });
server.listen(process.env.PORT || 3000);
