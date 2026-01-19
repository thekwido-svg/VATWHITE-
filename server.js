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

// --- ADMIN APIs (Hizi ndizo zinazofanya Admin Isigande) ---

// 1. Kutafuta Data za User
app.get('/admin/user-details/:phone', async (req, res) => {
    try {
        const user = await pool.query(
            "SELECT phone, (balance->>'gold')::numeric as bal FROM users WHERE phone = $1", 
            [req.params.phone]
        );
        if (user.rows.length > 0) {
            res.json({ success: true, data: user.rows[0] });
        } else {
            res.status(404).json({ success: false, message: "Namba haipo!" });
        }
    } catch (err) { res.status(500).json({ success: false }); }
});

// 2. Kuongeza au Kupunguza Pesa (Update Balance)
app.post('/admin/update-balance', async (req, res) => {
    const { phone, amount } = req.body;
    try {
        await pool.query(
            "UPDATE users SET balance = jsonb_set(balance, '{gold}', (COALESCE(balance->>'gold', '0')::numeric + $1)::text::jsonb) WHERE phone = $2",
            [amount, phone]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// --- MWISHO WA ADMIN APIs ---

// Mfumo wa Chat
io.on('connection', (socket) => {
    socket.on('send_msg', (data) => {
        io.emit('new_msg', data);
    });
});

server.listen(process.env.PORT || 3000);
