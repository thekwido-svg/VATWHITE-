const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Database connection ili salio lisipotee kamwe
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname + '/'));

let currentMultiplier = 1.0;
let gameStatus = "running"; 
let activeBets = []; 
let gameHistory = []; // History ya odi 5

// ALGORITHM: Bahati nasibu na ulinzi wa dau kubwa (>200)
function generateSmartCrashPoint() {
    let rand = Math.random() * 100;
    let hasBigBet = activeBets.some(b => b.amount > 200);
    
    if (hasBigBet && Math.random() < 0.85) return (Math.random() * 0.05 + 1.00).toFixed(2);
    if (rand < 35) return (Math.random() * 0.05 + 1.01).toFixed(2); // 1.02x hivi nyingi
    if (rand < 80) return (Math.random() * 1.5 + 1.1).toFixed(2);   
    if (rand < 95) return (Math.random() * 4 + 3).toFixed(2);      
    return (Math.random() * 10 + 10).toFixed(2); // 10x-20x chache
}

let crashPoint = generateSmartCrashPoint();

// Engine inayozungusha Rocket bila kugwama
setInterval(() => {
    if (gameStatus === "running") {
        let increment = currentMultiplier < 2 ? 0.02 : 0.05;
        currentMultiplier = (parseFloat(currentMultiplier) + increment).toFixed(2);
        io.emit('tick', currentMultiplier);

        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            
            // Hifadhi history
            gameHistory.unshift(currentMultiplier);
            if (gameHistory.length > 5) gameHistory.pop();
            io.emit('history', gameHistory);

            activeBets = []; 
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = generateSmartCrashPoint();
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 70);

// USER ACTIONS (Signup, Balance, Bet, Withdraw)
app.post('/signup', async (req, res) => {
    const { phone } = req.body;
    try {
        const check = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
        if(check.rows.length > 0) return res.json({ success: true, user: check.rows[0] });
        const newUser = await pool.query("INSERT INTO users (firstname, phone, balance) VALUES ('User', $1, '{\"gold\": 0}') RETURNING *", [phone]);
        res.json({ success: true, user: newUser.rows[0] });
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/get-balance/:phone', async (req, res) => {
    const result = await pool.query("SELECT balance->>'gold' as bal FROM users WHERE phone = $1", [req.params.phone]);
    res.json({ balance: result.rows[0]?.bal || "0.00" });
});

app.post('/place-bet', (req, res) => {
    activeBets.push({ phone: req.body.phone, amount: req.body.amount });
    res.json({ success: true });
});

app.post('/withdraw', async (req, res) => {
    io.emit('admin_notification', { message: `WITHDRAW: KES ${req.body.amount} kutoka ${req.body.phone}` });
    res.json({ success: true });
});

server.listen(process.env.PORT || 3000);
