const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

// USANIDI WA DATABASE (Ili kuzuia op_error)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Lazima iwe hivi kwa Render
    },
    connectionTimeoutMillis: 10000, // Inasubiri sekunde 10 kabla ya kufeli
});

// Kukamata makosa ya muunganisho mapema
pool.on('error', (err) => {
    console.error('CRITICAL DATABASE ERROR:', err.message);
});

app.use(express.json());
app.use(express.static(__dirname + '/'));

// --- ENGINE YA MCHEZO (Rocket 🚀 & History) ---
let currentMultiplier = 1.0;
let gameStatus = "running"; 
let gameHistory = []; 

// Algorithm yako ya "Bahati Tu" na "Ulinzi wa Pesa"
function generateCrashPoint() {
    let rand = Math.random() * 100;
    if (rand < 35) return (Math.random() * 0.05 + 1.01).toFixed(2); // 1.02x nyingi
    if (rand < 85) return (Math.random() * 2.5 + 1.1).toFixed(2);   
    return (Math.random() * 15 + 5).toFixed(2); // Odi kubwa chache sana
}

let crashPoint = generateCrashPoint();

setInterval(() => {
    if (gameStatus === "running") {
        let inc = currentMultiplier < 2 ? 0.02 : 0.07; // Speed imeongezeka isigwame
        currentMultiplier = (parseFloat(currentMultiplier) + inc).toFixed(2);
        io.emit('tick', currentMultiplier);

        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            gameHistory.unshift(currentMultiplier);
            if (gameHistory.length > 5) gameHistory.pop();
            io.emit('history', gameHistory);
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = generateCrashPoint();
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 70);

// --- ENDPOINTS ZA USERS ---
app.post('/signup', async (req, res) => {
    try {
        const { phone } = req.body;
        const result = await pool.query("INSERT INTO users (phone, balance) VALUES ($1, '{\"gold\": 0}') ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone RETURNING *", [phone]);
        res.json({ success: true, user: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/get-balance/:phone', async (req, res) => {
    try {
        const result = await pool.query("SELECT balance->>'gold' as bal FROM users WHERE phone = $1", [req.params.phone]);
        res.json({ balance: result.rows[0]?.bal || "0.00" });
    } catch (err) { res.json({ balance: "0.00" }); }
});

// LAZIMA: Render inahitaji PORT iwe hivi
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`VATWHITE IS RUNNING ON PORT ${PORT}`));
