const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('.'));

let currentMultiplier = 1.00;
let isCrashed = false;
let withdrawRequests = []; // Hapa ndipo maombi yanahifadhiwa

function startGame() {
    currentMultiplier = 1.00; isCrashed = false;
    let loop = setInterval(() => {
        if (!isCrashed) {
            currentMultiplier += 0.01;
            if (Math.random() < 0.007 && currentMultiplier > 1.1) {
                isCrashed = true;
                clearInterval(loop);
                setTimeout(startGame, 5000);
            }
        }
    }, 100);
}

app.get('/game-state', (req, res) => {
    res.json({ multiplier: currentMultiplier.toFixed(2), isCrashed: isCrashed });
});

// Admin itakuja kuona hapa
app.post('/withdraw-request', (req, res) => {
    const request = req.body;
    withdrawRequests.push(request);
    console.log("!!! OMBI JIPYA LA WITHDRAW !!!");
    console.log(`Mteja: ${request.name}, Namba: ${request.phone}, Kiasi: KES ${request.amount}`);
    res.sendStatus(200);
});

// Admin Panel Rahisi (Fungua /admin-panel kuona)
app.get('/admin-panel', (req, res) => {
    res.send(`<h1>Maombi ya Kutoa Pesa</h1><pre>${JSON.stringify(withdrawRequests, null, 2)}</pre>`);
});

startGame();
app.listen(process.env.PORT || 3000);
