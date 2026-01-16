const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(express.static('.')); // Hii inaruhusu admin.html na index.html kuonekana

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Inachukua link uliyoweka Render
  ssl: { rejectUnauthorized: false }
});

// Hii inahakikisha ndege inaenda sawa kwa kila mtu duniani
let multiplier = 1.00;
setInterval(() => {
    multiplier += 0.01;
    if (multiplier > 10.00) multiplier = 1.00; // Reset ikifika 10x
}, 100);

app.get('/api/game-state', (req, res) => {
    res.json({ multiplier });
});

app.listen(process.env.PORT || 3000, () => console.log("Mchezo umewaka!"));
