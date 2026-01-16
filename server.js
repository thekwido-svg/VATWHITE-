const express = require('express');
const http = require('http');
const path = require('path');
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Mfumo wa Safari Moja (Global State)
let currentMultiplier = 1.00;
let isCrashed = false;
let gameInterval;

function startGame() {
    currentMultiplier = 1.00;
    isCrashed = false;
    gameInterval = setInterval(() => {
        if (!isCrashed) {
            currentMultiplier += 0.01;
            // Uwezekano wa kuanguka
            if (Math.random() < 0.007 && currentMultiplier > 1.10) {
                isCrashed = true;
                setTimeout(startGame, 5000); // Anza safari mpya baada ya sekunde 5
            }
        }
    }, 100);
}

// Route ya kuona hali ya ndege sasa hivi
app.get('/game-state', (req, res) => {
    res.json({
        multiplier: currentMultiplier.toFixed(2),
        isCrashed: isCrashed
    });
});

startGame();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`VATWHITE Live on ${PORT}`));
