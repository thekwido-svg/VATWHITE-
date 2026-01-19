const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Sanidi Database kwa usalama kuzuia 502 Bad Gateway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20, // Idadi ya miunganisho ili isizidi uwezo
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Kamata makosa ya database bila kuzima server
pool.on('error', (err) => { console.error('DATABASE ALERT:', err.message); });

app.use(express.json());
app.use(express.static(__dirname + '/'));

let currentMultiplier = 1.0;
let gameStatus = "running"; 
let gameHistory = ["1.04", "2.91", "2.56", "2.70", "1.02"]; // History

function generateCrashPoint() {
    let r = Math.random() * 100;
    if (r < 35) return (Math.random() * 0.05 + 1.01).toFixed(2); // 1.02x
    if (r < 90) return (Math.random() * 3 + 1.1).toFixed(2); 
    return (Math.random() * 20 + 5).toFixed(2); // Odi kubwa
}
let crashPoint = generateCrashPoint();

// Engine ya Rocket: Smooth and Steady
setInterval(() => {
    if (gameStatus === "running") {
        // Rocket inaanza polepole hadi 1.05 kisha inachanganya
        let inc = currentMultiplier < 1.05 ? 0.005 : 0.04;
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
                crashPoint = generateCrashPoint();
                gameStatus = "running";
                io.emit('new_game');
            }, 3500); // Muda wa kusubiri kabla ya kuanza upya
        }
    }
}, 80);

io.on('connection', (socket) => {
    socket.emit('history', gameHistory); // Tuma history mara tu mtu anapoingia
    
    // Kupokea dau na Cashout
    socket.on('place_bet', (data) => { console.log(`BET: Panel ${data.id} - KES ${data.amt}`); });
    socket.on('player_cashout', (data) => { console.log(`WIN: ${data.win} KES kimechukuliwa`); });
    
    // Live Chat
    socket.on('send_msg', (data) => { io.emit('new_msg', data); });
});

// LAZIMA: Hii inazuia 502 Bad Gateway kwenye Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`VATWHITE SERVER IS STABLE ON PORT ${PORT}`); });
