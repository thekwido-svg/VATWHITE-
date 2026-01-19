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

let currentMultiplier = 1.0;
let gameStatus = "running"; 
let gameHistory = ["1.04", "2.91", "2.56", "2.70", "1.02"];

// Mfumo wa Odis - Inatuma 'tick' kila sekunde 0.08 kuzuia kuganda
function startGame() {
    let crashPoint = (Math.random() < 0.3) ? (Math.random() * 0.05 + 1.01).toFixed(2) : (Math.random() * 10 + 1.1).toFixed(2);
    let interval = setInterval(() => {
        if (gameStatus === "running") {
            let inc = currentMultiplier < 1.10 ? 0.01 : 0.05; 
            currentMultiplier = (parseFloat(currentMultiplier) + inc).toFixed(2);
            io.emit('tick', currentMultiplier); 

            if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
                clearInterval(interval);
                gameStatus = "crashed";
                io.emit('crash', currentMultiplier);
                gameHistory.unshift(currentMultiplier);
                if (gameHistory.length > 5) gameHistory.pop();
                io.emit('history', gameHistory);
                setTimeout(() => {
                    currentMultiplier = 1.0;
                    gameStatus = "running";
                    io.emit('new_game');
                    startGame();
                }, 4000);
            }
        }
    }, 80);
}

// API ya Kujisajili
app.post('/register', async (req, res) => {
    const { phone, password } = req.body;
    try {
        await pool.query("INSERT INTO users (phone, password, balance) VALUES ($1, $2, $3) ON CONFLICT (phone) DO NOTHING", [phone, password, JSON.stringify({ gold: 0 })]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

io.on('connection', (socket) => {
    socket.emit('history', gameHistory);
    socket.on('place_bet', (data) => { /* Logic ya bet */ });
    socket.on('send_msg', (data) => { io.emit('new_msg', data); });
});

startGame();
server.listen(process.env.PORT || 3000);
