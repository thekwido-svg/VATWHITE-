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

// --- LOGIC YA ROCKET (Live Engine) ---
let currentMultiplier = 1.0;
let gameStatus = "running"; 
let crashPoint = (Math.random() * 10 + 1.1).toFixed(2);

setInterval(() => {
    if (gameStatus === "running") {
        let speedInc = currentMultiplier < 3 ? 0.03 : 0.07; 
        currentMultiplier = (parseFloat(currentMultiplier) + speedInc).toFixed(2);
        io.emit('tick', currentMultiplier);
        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = (Math.random() * 15 + 1.05).toFixed(2);
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 80);

// --- USER & BALANCE ACTIONS ---
app.post('/signup', async (req, res) => {
    const { phone, password, firstname } = req.body;
    try {
        const check = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
        if(check.rows.length > 0) return res.json({ success: true, user: check.rows[0] });
        const newUser = await pool.query("INSERT INTO users (firstname, phone, password, balance) VALUES ($1, $2, $3, '{\"gold\": 0}') RETURNING *", [firstname, phone, password]);
        res.json({ success: true, user: newUser.rows[0] });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/get-balance/:phone', async (req, res) => {
    const result = await pool.query("SELECT balance->>'gold' as bal FROM users WHERE phone = $1", [req.params.phone]);
    res.json({ balance: result.rows[0]?.bal || 0 });
});

app.post('/withdraw', async (req, res) => {
    const { phone, amount } = req.body;
    io.emit('admin_notification', { message: `KES ${amount} Withdraw kutoka ${phone}` });
    res.json({ success: true });
});

server.listen(process.env.PORT || 3000);
