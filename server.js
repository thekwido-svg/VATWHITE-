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

let currentMultiplier = 1.0, gameStatus = "running", gameHistory = ["1.04", "2.91", "2.56", "2.70", "1.02"];
let crashPoint = (Math.random() * 5 + 1.1).toFixed(2);

// Engine ya Rocket na Odis
setInterval(() => {
    if (gameStatus === "running") {
        let inc = currentMultiplier < 1.1 ? 0.01 : 0.05;
        currentMultiplier = (parseFloat(currentMultiplier) + inc).toFixed(2);
        io.emit('tick', currentMultiplier);

        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            gameHistory.unshift(currentMultiplier);
            if (gameHistory.length > 6) gameHistory.pop();
            io.emit('history', gameHistory);
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = (Math.random() * 8 + 1.1).toFixed(2);
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 100);

// Usajili na Salio (Account haipotei)
app.post('/register', async (req, res) => {
    const { phone, password } = req.body;
    try {
        await pool.query("INSERT INTO users (phone, password, balance) VALUES ($1, $2, '{\"gold\": 0}') ON CONFLICT (phone) DO NOTHING", [phone, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err); }
});

io.on('connection', (socket) => {
    socket.emit('history', gameHistory);
    socket.on('send_msg', (data) => io.emit('new_msg', data)); // Live Chat
});

server.listen(process.env.PORT || 3000);
