const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

let currentMultiplier = 1.00;
setInterval(() => {
  if (currentMultiplier >= 2.00) { 
    currentMultiplier = 1.00;
    io.emit('crash', currentMultiplier);
  } else {
    currentMultiplier = (parseFloat(currentMultiplier) + 0.01).toFixed(2);
    io.emit('tick', currentMultiplier);
  }
}, 100);

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('VAT White is Live!'));
