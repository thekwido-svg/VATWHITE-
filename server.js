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

let currentMultiplier = 1.0, gameStatus = "running", gameHistory = [];
let nextCrashPoint = null; 
let paymentDetails = { method: "MPESA TILL", number: "0702170114", name: "VATWHITE ADMIN" };

// ALGORITHM YA FAIDA NA UDHIBITI WA ADMIN
function generateCrashPoint() {
    if (nextCrashPoint !== null) {
        let p = nextCrashPoint;
        nextCrashPoint = null; // Inatumika mara moja tu kisha inajifuta
        return p;
    }
    let chance = Math.random() * 100;
    if (chance < 35) return (Math.random() * 0.2 + 1.00).toFixed(2); // 35% ya michezo inakufa haraka (1.00x - 1.20x)
    if (chance < 99) return (Math.random() * 5 + 1.2).toFixed(2); // Michezo ya kawaida
    return (Math.random() * 150 + 50.0).toFixed(2); // 1% tu ndio inaenda juu sana (200x adimu)
}

let crashPoint = generateCrashPoint();

setInterval(() => {
    if (gameStatus === "running") {
        let speed = currentMultiplier < 2 ? 0.01 : 0.05;
        currentMultiplier = (parseFloat(currentMultiplier) + speed).toFixed(2);
        io.emit('tick', currentMultiplier);

        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            gameHistory.unshift(currentMultiplier);
            if (gameHistory.length > 6) gameHistory.pop();
            io.emit('history', gameHistory);
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = generateCrashPoint();
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 100);

// API ZA ADMIN
app.post('/admin/set-crash', (req, res) => {
    nextCrashPoint = parseFloat(req.body.point).toFixed(2);
    res.json({ success: true });
});

app.get('/admin/user-details/:phone', async (req, res) => {
    try {
        const user = await pool.query("SELECT phone, (balance->>'gold')::numeric as bal FROM users WHERE phone = $1", [req.params.phone]);
        res.json(user.rows[0]);
    } catch (err) { res.status(500).send(err); }
});

app.post('/admin/update-balance', async (req, res) => {
    const { phone, amount } = req.body;
    try {
        await pool.query("UPDATE users SET balance = jsonb_set(balance, '{gold}', (COALESCE(balance->>'gold', '0')::numeric + $1)::text::jsonb) WHERE phone = $2", [amount, phone]);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err); }
});

app.post('/admin/update-payment', (req, res) => {
    paymentDetails = req.body;
    res.json({ success: true });
});

app.get('/payment-info', (req, res) => res.json(paymentDetails));

app.post('/register', async (req, res) => {
    const { phone, password } = req.body;
    try {
        await pool.query("INSERT INTO users (phone, password, balance) VALUES ($1, $2, '{\"gold\": 0}') ON CONFLICT (phone) DO NOTHING", [phone, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err); }
});

io.on('connection', (socket) => {
    socket.emit('history', gameHistory);
    socket.on('send_msg', (data) => io.emit('new_msg', data));
});

server.listen(process.env.PORT || 3000);
