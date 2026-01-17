const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" },
  pingTimeout: 1000, // Inapunguza kulega-lega (lag)
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname + '/'));

let currentMultiplier = 1.0;
let gameStatus = "running"; 
let activeBets = []; // Inafuatilia dau za watu live

// --- SMART CRASH ALGORITHM ---
function generateSmartCrashPoint() {
    let rand = Math.random() * 100;
    
    // Angalia kama kuna bet kubwa ya zaidi ya 200
    let hasBigBet = activeBets.some(b => b.amount > 200);
    if (hasBigBet && Math.random() < 0.8) return 1.00; // 80% chance ya kulipuka 1.00 kama kuna dau kubwa

    if (rand < 40) return (Math.random() * 0.05 + 1.01).toFixed(2); // 40% chance ya 1.01 - 1.06 (Nyingi)
    if (rand < 85) return (Math.random() * 2.9 + 1.1).toFixed(2);   // 45% chance ya chini ya 4.00
    if (rand < 98) return (Math.random() * 5 + 5).toFixed(2);      // 13% chance ya 5x - 10x
    return (Math.random() * 10 + 10).toFixed(2);                   // 2% tu chance ya 10x - 20x
}

let crashPoint = generateSmartCrashPoint();

setInterval(() => {
    if (gameStatus === "running") {
        // Speed ya kupanda: Inaanza taratibu kisha inaongezeka kuzuia kugwama
        let increment = currentMultiplier < 2 ? 0.01 : (currentMultiplier < 5 ? 0.03 : 0.08);
        currentMultiplier = (parseFloat(currentMultiplier) + increment).toFixed(2);
        
        io.emit('tick', currentMultiplier);

        if (parseFloat(currentMultiplier) >= parseFloat(crashPoint)) {
            gameStatus = "crashed";
            io.emit('crash', currentMultiplier);
            activeBets = []; // Safisha dau baada ya kulipuka
            setTimeout(() => {
                currentMultiplier = 1.0;
                crashPoint = generateSmartCrashPoint();
                gameStatus = "running";
                io.emit('new_game');
            }, 4000);
        }
    }
}, 60); // Ticks fupi zaidi (60ms) hufanya Rocket iende bila kugwama

// Endpoint ya kuweka bet (Ili server ijue dau ni kiasi gani)
app.post('/place-bet', (req, res) => {
    activeBets.push({ phone: req.body.phone, amount: req.body.amount });
    res.json({ success: true });
});

server.listen(process.env.PORT || 3000);
