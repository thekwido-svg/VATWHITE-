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

// ALGORITHM YA FAIDA
function generateCrashPoint() {
    let chance = Math.random() * 100;

    if (chance < 35) { 
        // 35% ya michezo inaanguka haraka sana (1.00x - 1.20x) ili kutoa faida kwa Admin
        return (Math.random() * 0.2 + 1.00).toFixed(2);
    } else if (chance < 85) {
        // 50% ya michezo inaishia hapa (1.21x - 5.00x)
        return (Math.random() * 3.8 + 1.21).toFixed(2);
    } else if (chance < 99) {
        // 14% ya michezo inaenda juu kidogo (5.01x - 15.00x)
        return (Math.random() * 10 + 5.01).toFixed(2);
    } else {
        // 1% TU ndiyo inaweza kufika odis kubwa (200x) - Hii hutokea mara chache sana kwa wiki
        console.log("!!! BIG WIN ALERT !!!");
        return (Math.random() * 150 + 50.0).toFixed(2);
    }
}

let crashPoint = generateCrashPoint();

// Mchezo na Odis Live
setInterval(() => {
    if (gameStatus === "running") {
        let speed = currentMultiplier < 2 ? 0.01 : currentMultiplier < 10 ? 0.05 : 0.2;
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

// Sehemu ya Usajili, Chat na Account
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
