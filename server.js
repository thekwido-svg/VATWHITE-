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

// --- LOGIC MPYA YA NDEGE (Speed & Bahati Nasibu) ---
let currentMultiplier = 1.0;
let gameStatus = "running"; 
// Algorithm ya "Bahati Nasibu": Mara nyingi inapasuka mapema (1.1 - 2.0), mara chache inafika mbali.
function generateCrashPoint() {
    let rand = Math.random();
    if (rand < 0.7) return (Math.random() * 1.5 + 1.05).toFixed(2); // 70% inapasuka chini ya 2.5x
    if (rand < 0.95) return (Math.random() * 5 + 2.5).toFixed(2);   // 25% inafika kati ya 2.5x na 7.5x
    return (Math.random() * 50 + 10).toFixed(2);                   // 5% tu ndio inafika mbali sana
}

let crashPoint = generateCrashPoint();

setInterval(() => {
    if (gameStatus === "running") {
        // Kuongeza Speed: Badala ya 0.01, sasa inaongezeka kwa kasi zaidi kulingana na kimo
        let speedInc = currentMultiplier < 2 ? 0.02 : 0.05; 
        currentMultiplier = (parseFloat(currentMultiplier) + speedInc).toFixed(2);
        
        io.emit('tick', currentMultiplier);

        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = generateCrashPoint();
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 80); // Speed ya ku-update imepunguzwa kutoka 100ms hadi 80ms (Ndege inaenda kasi zaidi)

// --- WITHDRAW NOTIFICATION ---
app.post('/withdraw', async (req, res) => {
    const { phone, amount } = req.body;
    await pool.query("INSERT INTO withdrawals (phone, amount, status) VALUES ($1, $2, 'pending')", [phone, amount]);
    io.emit('admin_notification', { message: `KES ${amount} Withdraw request from ${phone}` });
    res.json({ success: true });
});

// Signup & Login kodi ziko palepale...
app.post('/signup', async (req, res) => {
    const { firstname, phone, password } = req.body;
    try {
        await pool.query("INSERT INTO users (firstname, phone, password, balance) VALUES ($1, $2, $3, '{\"gold\": 0}')", [firstname, phone, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Tayari upo!" }); }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('VATWHITE HIGH SPEED ENGINE!'));
