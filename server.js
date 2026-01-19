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

app.use(express.static(__dirname + '/'));

let currentMultiplier = 1.0;
let gameStatus = "running"; 
let gameHistory = ["1.04", "2.91", "2.56", "2.70", "1.02"];

function generateCrashPoint() {
    return (Math.random() < 0.3) ? (Math.random() * 0.05 + 1.01).toFixed(2) : (Math.random() * 8 + 1.1).toFixed(2);
}
let crashPoint = generateCrashPoint();

setInterval(() => {
    if (gameStatus === "running") {
        let inc = currentMultiplier < 1.10 ? 0.005 : 0.05; // Odi zinahesabu hapa bila kuganda
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
            }, 3000);
        }
    }
}, 80);

io.on('connection', (socket) => {
    socket.emit('history', gameHistory);
    socket.on('send_msg', (data) => { io.emit('new_msg', data); });
    socket.on('place_bet', (data) => { console.log("Bet Received", data); });
});

server.listen(process.env.PORT || 3000);
